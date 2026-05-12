// GET /api/gmail/poll — manual polling fallback (use webhook in production)
// Protected by CRON_SECRET header in production

import { NextRequest, NextResponse } from 'next/server'
import { createServiceSupabaseClient } from '@/lib/supabase-server'
import { isWatchedAddressCCd, extractEmail, extractName, isInvalidGrantError, clearGmailTokens, getAuthenticatedClient } from '@/lib/gmail'
import { google } from 'googleapis'
import { computeScheduledDates } from '@/lib/sequence'
import type { StepDraft } from '@/types'

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  const secret = authHeader?.replace('Bearer ', '').trim()
    ?? req.headers.get('x-cron-secret')
    ?? new URL(req.url).searchParams.get('secret')
  if (process.env.NODE_ENV === 'production' && secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServiceSupabaseClient()

  // Get all users with Gmail connected and a watched CC address
  const { data: settings } = await supabase
    .from('settings')
    .select('user_id, watched_cc_address, gmail_access_token, gmail_refresh_token, gmail_history_id, auto_followup_enabled, auto_followup_send_mode, auto_followup_steps')
    .not('gmail_refresh_token', 'is', null)
    .not('watched_cc_address', 'eq', '')

  const results: Record<string, number> = {}
  const pollDebug: Record<string, unknown> = {}

  for (const s of settings ?? []) {
    const uid = s.user_id
    pollDebug[uid] = { hasAddress: !!s.watched_cc_address, hasToken: !!s.gmail_refresh_token, address: s.watched_cc_address }

    if (!s.watched_cc_address || !s.gmail_refresh_token) {
      pollDebug[uid] = { ...pollDebug[uid] as object, skipped: 'missing address or token' }
      continue
    }

    try {
      const auth = await getAuthenticatedClient(s.user_id)
      const gmail = google.gmail({ version: 'v1', auth })

      // Search for recent emails with the CC address
      const searchRes = await gmail.users.messages.list({
        userId: 'me',
        q: `cc:${s.watched_cc_address} newer_than:7d`,
        maxResults: 50,
      })

      const messageIds = searchRes.data.messages?.map(m => m.id!) ?? []
      pollDebug[uid] = { ...pollDebug[uid] as object, messagesFound: messageIds.length }
      let newCount = 0

      for (const messageId of messageIds) {
        // Reuse the same gmail client — avoid redundant getAuthenticatedClient calls per message
        const msgRes = await gmail.users.messages.get({ userId: 'me', id: messageId, format: 'full' })
        const raw = msgRes.data
        const headers = raw.payload?.headers ?? []
        const get = (name: string) => headers.find(h => h.name?.toLowerCase() === name.toLowerCase())?.value ?? ''

        const msg = {
          id: raw.id!,
          threadId: raw.threadId!,
          subject: get('Subject'),
          from: get('From'),
          to: get('To'),
          cc: get('Cc'),
          date: get('Date'),
          snippet: raw.snippet ?? '',
        }

        if (!isWatchedAddressCCd(msg.cc, s.watched_cc_address)) continue

        const autoEnabled = s.auto_followup_enabled
        const autoSteps: StepDraft[] = s.auto_followup_steps ?? []
        const autoSendMode: string = s.auto_followup_send_mode ?? 'auto_send'
        const canAutoActivate = autoEnabled && autoSteps.length > 0

        const threadStatus = canAutoActivate
          ? (autoSendMode === 'auto_send' ? 'waiting' : 'needs_approval')
          : 'pending_setup'

        // Try to insert new thread
        const { data: upserted, error } = await supabase
          .from('threads')
          .upsert({
            user_id: s.user_id,
            gmail_thread_id: msg.threadId,
            gmail_message_id: msg.id,
            subject: msg.subject || '(no subject)',
            recipient_name: extractName(msg.to),
            recipient_email: extractEmail(msg.to),
            sender_name: extractName(msg.from),
            sender_email: extractEmail(msg.from),
            email_snippet: msg.snippet,
            email_date: new Date(msg.date).toISOString(),
            status: threadStatus,
            send_mode: autoSendMode,
          }, { onConflict: 'user_id,gmail_thread_id', ignoreDuplicates: true })
          .select('id, email_date, status')
          .single()

        // For duplicate threads (ignoreDuplicates), fetch the existing row
        const thread = upserted ?? (await supabase
          .from('threads')
          .select('id, email_date, status')
          .eq('user_id', s.user_id)
          .eq('gmail_thread_id', msg.threadId)
          .single()
        ).data

        if (!thread) continue
        newCount++

        // Auto-activate: applies to fresh inserts AND existing pending_setup threads
        if (canAutoActivate && thread) {
          const { count } = await supabase
            .from('steps')
            .select('id', { count: 'exact', head: true })
            .eq('thread_id', thread.id)

          if ((count ?? 0) === 0) {
            const threadDate = new Date(thread.email_date)
            const scheduledDates = computeScheduledDates(threadDate, autoSteps)

            const stepRows = autoSteps.map((step, i) => ({
              thread_id: thread.id,
              user_id: s.user_id,
              step_number: i + 1,
              send_after_days: step.time_unit === 'weeks' ? step.send_after_days * 7 : step.send_after_days,
              scheduled_at: scheduledDates[i].toISOString(),
              message_source: step.message_source,
              template_id: step.template_id ?? null,
              custom_body: step.custom_body || null,
              status: 'pending',
            }))

            await supabase.from('steps').insert(stepRows)
            await supabase
              .from('threads')
              .update({ status: threadStatus, send_mode: autoSendMode })
              .eq('id', thread.id)
          }
        }
      }

      // Auto-activate any existing pending_setup threads for this user
      if (s.auto_followup_enabled) {
        const autoSteps: StepDraft[] = s.auto_followup_steps ?? []
        const autoSendMode: string = s.auto_followup_send_mode ?? 'auto_send'

        if (autoSteps.length > 0) {
          const { data: pendingThreads } = await supabase
            .from('threads')
            .select('id, email_date')
            .eq('user_id', s.user_id)
            .eq('status', 'pending_setup')

          for (const pt of pendingThreads ?? []) {
            const { count } = await supabase
              .from('steps')
              .select('id', { count: 'exact', head: true })
              .eq('thread_id', pt.id)

            if ((count ?? 0) > 0) continue

            const threadDate = new Date(pt.email_date)
            const scheduledDates = computeScheduledDates(threadDate, autoSteps)
            const stepRows = autoSteps.map((step, i) => ({
              thread_id: pt.id,
              user_id: s.user_id,
              step_number: i + 1,
              send_after_days: step.time_unit === 'weeks' ? step.send_after_days * 7 : step.send_after_days,
              scheduled_at: scheduledDates[i].toISOString(),
              message_source: step.message_source,
              template_id: step.template_id ?? null,
              custom_body: step.custom_body || null,
              status: 'pending',
            }))

            await supabase.from('steps').insert(stepRows)
            await supabase
              .from('threads')
              .update({ status: autoSendMode === 'auto_send' ? 'waiting' : 'needs_approval', send_mode: autoSendMode })
              .eq('id', pt.id)
          }
        }
      }

      results[s.user_id] = newCount
      pollDebug[uid] = { ...pollDebug[uid] as object, threadsFound: newCount }
    } catch (err) {
      const errMsg = (err as any)?.message ?? String(err)
      pollDebug[uid] = { ...pollDebug[uid] as object, error: errMsg }
      if (isInvalidGrantError(err)) {
        console.warn(`invalid_grant for user ${s.user_id} — clearing tokens, user must reconnect Gmail`)
        await clearGmailTokens(s.user_id)
      } else {
        console.error(`Poll error for user ${s.user_id}:`, err)
      }
    }
  }

  return NextResponse.json({ ok: true, results, pollDebug, polledAt: new Date().toISOString() })
}
