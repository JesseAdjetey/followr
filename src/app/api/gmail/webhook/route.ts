/**
 * /api/gmail/webhook/route.ts
 * Receives Gmail push notifications via Google Cloud Pub/Sub.
 * Handles: new CC'd emails → create pending_setup thread
 *          recipient replies → pause thread sequence
 */
import { NextRequest, NextResponse } from 'next/server'
import {
  getNewMessagesSince,
  getMessage,
  isWatchedAddressCCd,
  isReplyFromRecipient,
  extractEmail,
  extractName,
} from '@/lib/gmail'
import { createServiceSupabaseClient } from '@/lib/supabase-server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const data = body?.message?.data
    if (!data) return NextResponse.json({ ok: true })

    const decoded = JSON.parse(Buffer.from(data, 'base64').toString('utf-8'))
    const { emailAddress, historyId } = decoded

    if (!emailAddress || !historyId) return NextResponse.json({ ok: true })

    const supabase = createServiceSupabaseClient()

    // Find the user by their Gmail address
    const { data: authUsers } = await supabase.auth.admin.listUsers()
    const user = authUsers?.users?.find(u => u.email?.toLowerCase() === emailAddress.toLowerCase())
    if (!user) return NextResponse.json({ ok: true })

    // Get stored history ID
    const { data: settings } = await supabase
      .from('settings')
      .select('gmail_history_id, watched_cc_address')
      .eq('user_id', user.id)
      .single()

    if (!settings?.gmail_history_id) return NextResponse.json({ ok: true })

    // Get new messages since last history ID
    const messageIds = await getNewMessagesSince(user.id, settings.gmail_history_id)

    for (const messageId of messageIds) {
      const msg = await getMessage(user.id, messageId)
      if (!msg) continue

      const fromEmail = extractEmail(msg.from)

      // Check if this is a new CC'd email with the watched address
      if (
        settings.watched_cc_address &&
        isWatchedAddressCCd(msg.cc, settings.watched_cc_address)
      ) {
        // Upsert thread record (pending_setup)
        await supabase.from('threads').upsert({
          user_id: user.id,
          gmail_thread_id: msg.threadId,
          gmail_message_id: msg.id,
          subject: msg.subject || '(no subject)',
          recipient_name: extractName(msg.to),
          recipient_email: extractEmail(msg.to),
          sender_name: extractName(msg.from),
          sender_email: fromEmail,
          email_snippet: msg.snippet,
          email_date: new Date(msg.date).toISOString(),
          status: 'pending_setup',
        }, { onConflict: 'user_id,gmail_thread_id' })
      }

      // Check if this is a reply from a tracked recipient — pause the sequence
      const { data: trackedThreads } = await supabase
        .from('threads')
        .select('id, recipient_email, sender_email, status')
        .eq('user_id', user.id)
        .eq('gmail_thread_id', msg.threadId)
        .not('status', 'in', '("pending_setup","replied","completed")')

      for (const thread of trackedThreads ?? []) {
        if (isReplyFromRecipient(msg.from, thread.recipient_email, thread.sender_email)) {
          await supabase
            .from('threads')
            .update({ status: 'replied', replied_at: new Date().toISOString() })
            .eq('id', thread.id)
        }
      }
    }

    // Update stored history ID
    await supabase
      .from('settings')
      .update({ gmail_history_id: historyId })
      .eq('user_id', user.id)

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('Webhook error:', err)
    return NextResponse.json({ ok: true }) // always 200 to Pub/Sub
  }
}
