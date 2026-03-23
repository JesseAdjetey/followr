// GET /api/gmail/poll — manual polling fallback (use webhook in production)
// Protected by CRON_SECRET header in production

import { NextRequest, NextResponse } from 'next/server'
import { createServiceSupabaseClient } from '@/lib/supabase-server'
import { getGmailClient, getMessage, isWatchedAddressCCd, isReplyFromRecipient, extractEmail, extractName } from '@/lib/gmail'
import { google } from 'googleapis'
import { getAuthenticatedClient } from '@/lib/gmail'

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  const secret = authHeader?.replace('Bearer ', '') ?? req.headers.get('x-cron-secret')
  if (process.env.NODE_ENV === 'production' && secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServiceSupabaseClient()

  // Get all users with Gmail connected and a watched CC address
  const { data: settings } = await supabase
    .from('settings')
    .select('user_id, watched_cc_address, gmail_access_token, gmail_refresh_token, gmail_history_id')
    .not('gmail_refresh_token', 'is', null)
    .not('watched_cc_address', 'eq', '')

  const results: Record<string, number> = {}

  for (const s of settings ?? []) {
    if (!s.watched_cc_address || !s.gmail_refresh_token) continue

    try {
      const auth = await getAuthenticatedClient(s.user_id)
      const gmail = google.gmail({ version: 'v1', auth })

      // Search for recent emails with the CC address
      const searchRes = await gmail.users.messages.list({
        userId: 'me',
        q: `cc:${s.watched_cc_address} newer_than:1d`,
        maxResults: 20,
      })

      const messageIds = searchRes.data.messages?.map(m => m.id!) ?? []
      let newCount = 0

      for (const messageId of messageIds) {
        const msg = await getMessage(s.user_id, messageId)
        if (!msg) continue

        if (isWatchedAddressCCd(msg.cc, s.watched_cc_address)) {
          const { error } = await supabase.from('threads').upsert({
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
            status: 'pending_setup',
          }, { onConflict: 'user_id,gmail_thread_id', ignoreDuplicates: true })

          if (!error) newCount++
        }
      }

      results[s.user_id] = newCount
    } catch (err) {
      console.error(`Poll error for user ${s.user_id}:`, err)
    }
  }

  return NextResponse.json({ ok: true, results, polledAt: new Date().toISOString() })
}
