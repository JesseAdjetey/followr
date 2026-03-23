// POST /api/cron/scheduler — run every 15 minutes via external cron
// Secured with CRON_SECRET header

import { NextRequest, NextResponse } from 'next/server'
import { createServiceSupabaseClient } from '@/lib/supabase-server'
import { sendReply, substituteVariables } from '@/lib/gmail'

export async function GET(req: NextRequest) {
  return POST(req)
}

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  const secret = authHeader?.replace('Bearer ', '') ?? req.headers.get('x-cron-secret')
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServiceSupabaseClient()
  const now = new Date()

  // Find all pending steps that are due
  const { data: dueSteps } = await supabase
    .from('steps')
    .select('*, thread:threads(*, sender_name, recipient_name, recipient_email, gmail_thread_id, gmail_message_id, subject, send_mode, status, user_id), template:templates(*)')
    .eq('status', 'pending')
    .lte('scheduled_at', now.toISOString())

  for (const step of dueSteps ?? []) {
    const thread = step.thread
    if (!thread) continue

    // Skip paused threads
    if (['replied', 'completed', 'snoozed', 'pending_setup'].includes(thread.status)) continue

    const vars = {
      name: (thread.recipient_name ?? thread.recipient_email ?? '').split(' ')[0],
      subject: thread.subject ?? '',
      sender: thread.sender_name ?? '',
    }

    if (thread.send_mode === 'auto_send') {
      // Resolve body
      let body = ''
      if (step.message_source === 'template' && step.template?.body) {
        body = substituteVariables(step.template.body, vars)
      } else if (step.message_source === 'custom' && step.custom_body) {
        body = substituteVariables(step.custom_body, vars)
      }

      if (!body) continue

      try {
        const gmailMessageId = await sendReply(
          thread.user_id,
          thread.gmail_thread_id,
          thread.gmail_message_id,
          thread.subject,
          body
        )

        await supabase
          .from('steps')
          .update({ status: 'sent', sent_at: now.toISOString(), gmail_message_id: gmailMessageId, resolved_body: body })
          .eq('id', step.id)

        // Check if more steps remain
        const { data: remaining } = await supabase
          .from('steps')
          .select('id')
          .eq('thread_id', thread.id)
          .eq('status', 'pending')
          .neq('id', step.id)

        const nextStatus = remaining?.length ? 'waiting' : 'completed'
        await supabase
          .from('threads')
          .update({ status: nextStatus, ...(nextStatus === 'completed' ? { completed_at: now.toISOString() } : {}) })
          .eq('id', thread.id)
      } catch (err) {
        console.error('Failed to send step', step.id, err)
      }
    } else {
      // requires_approval — mark step due, thread overdue if already past
      const wasAlreadyDue = thread.status === 'needs_approval'
      const newThreadStatus = wasAlreadyDue ? 'overdue' : 'needs_approval'

      await supabase.from('steps').update({ status: 'due' }).eq('id', step.id)
      await supabase.from('threads').update({ status: newThreadStatus }).eq('id', thread.id)
      // TODO: send push notification for overdue
    }
  }

  return NextResponse.json({ ok: true, processed: dueSteps?.length ?? 0 })
}
