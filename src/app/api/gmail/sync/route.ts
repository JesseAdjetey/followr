// POST /api/gmail/sync — user-triggered poll for the current session user only
import { NextResponse } from 'next/server'
import { createServerSupabaseClient, createServiceSupabaseClient } from '@/lib/supabase-server'
import { getAuthenticatedClient, isWatchedAddressCCd, extractEmail, extractName, getMessage, isInvalidGrantError, clearGmailTokens } from '@/lib/gmail'
import { google } from 'googleapis'
import { computeScheduledDates } from '@/lib/sequence'
import type { StepDraft } from '@/types'

export async function POST() {
  const supabase = createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const serviceClient = createServiceSupabaseClient()
  const { data: s } = await serviceClient
    .from('settings')
    .select('watched_cc_address, gmail_refresh_token, auto_followup_enabled, auto_followup_send_mode, auto_followup_steps')
    .eq('user_id', user.id)
    .single()

  if (!s?.gmail_refresh_token) {
    return NextResponse.json({ error: 'Gmail not connected', gmail_connected: false }, { status: 400 })
  }
  if (!s.watched_cc_address) {
    return NextResponse.json({ error: 'No watched CC address configured' }, { status: 400 })
  }

  try {
    const auth = await getAuthenticatedClient(user.id)
    const gmail = google.gmail({ version: 'v1', auth })

    const searchRes = await gmail.users.messages.list({
      userId: 'me',
      q: `cc:${s.watched_cc_address} newer_than:7d`,
      maxResults: 50,
    })

    const messageIds = searchRes.data.messages?.map(m => m.id!) ?? []
    let found = 0

    for (const messageId of messageIds) {
      const msg = await getMessage(user.id, messageId)
      if (!msg) continue
      if (!isWatchedAddressCCd(msg.cc, s.watched_cc_address)) continue

      const autoEnabled = s.auto_followup_enabled
      const autoSteps: StepDraft[] = s.auto_followup_steps ?? []
      const autoSendMode: string = s.auto_followup_send_mode ?? 'auto_send'
      const canAutoActivate = autoEnabled && autoSteps.length > 0

      const threadStatus = canAutoActivate
        ? (autoSendMode === 'auto_send' ? 'waiting' : 'needs_approval')
        : 'pending_setup'

      const { data: upserted } = await serviceClient
        .from('threads')
        .upsert({
          user_id: user.id,
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

      const thread = upserted ?? (await serviceClient
        .from('threads')
        .select('id, email_date, status')
        .eq('user_id', user.id)
        .eq('gmail_thread_id', msg.threadId)
        .single()
      ).data

      if (!thread) continue
      found++

      if (canAutoActivate) {
        const { count } = await serviceClient
          .from('steps')
          .select('id', { count: 'exact', head: true })
          .eq('thread_id', thread.id)

        if ((count ?? 0) === 0) {
          const threadDate = new Date(thread.email_date)
          const scheduledDates = computeScheduledDates(threadDate, autoSteps)
          const stepRows = autoSteps.map((step, i) => ({
            thread_id: thread.id,
            user_id: user.id,
            step_number: i + 1,
            send_after_days: step.time_unit === 'weeks' ? step.send_after_days * 7 : step.send_after_days,
            scheduled_at: scheduledDates[i].toISOString(),
            message_source: step.message_source,
            template_id: step.template_id ?? null,
            custom_body: step.custom_body || null,
            status: 'pending',
          }))
          await serviceClient.from('steps').insert(stepRows)
          await serviceClient
            .from('threads')
            .update({ status: threadStatus, send_mode: autoSendMode })
            .eq('id', thread.id)
        }
      }
    }

    return NextResponse.json({ ok: true, found, scanned: messageIds.length })
  } catch (err) {
    if (isInvalidGrantError(err)) {
      await clearGmailTokens(user.id)
      return NextResponse.json({ error: 'Gmail token expired — please reconnect', gmail_connected: false }, { status: 401 })
    }
    console.error('Sync error:', err)
    return NextResponse.json({ error: 'Sync failed' }, { status: 500 })
  }
}
