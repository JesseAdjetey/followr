// POST /api/threads/:id/approve
// Approves and immediately sends the current due/overdue step on a requires_approval thread.

import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { sendReply, substituteVariables } from '@/lib/gmail'

export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: thread } = await supabase
    .from('threads')
    .select('*, steps(*, template:templates(*))')
    .eq('id', params.id)
    .eq('user_id', user.id)
    .single()

  if (!thread) return NextResponse.json({ error: 'Thread not found' }, { status: 404 })

  const dueStep = thread.steps
    ?.filter((s: any) => s.status === 'due' || s.status === 'approved')
    .sort((a: any, b: any) => a.step_number - b.step_number)[0]

  if (!dueStep) return NextResponse.json({ error: 'No step awaiting approval' }, { status: 400 })

  // Resolve body
  const recipientFirstName = (thread.recipient_name ?? thread.recipient_email).split(' ')[0]
  const vars = {
    name: recipientFirstName,
    subject: thread.subject,
    sender: thread.sender_name ?? '',
  }

  let body = ''
  if (dueStep.message_source === 'template' && dueStep.template?.body) {
    body = substituteVariables(dueStep.template.body, vars)
  } else if (dueStep.message_source === 'custom' && dueStep.custom_body) {
    body = substituteVariables(dueStep.custom_body, vars)
  }

  if (!body) return NextResponse.json({ error: 'Empty message body' }, { status: 400 })

  // Send via Gmail
  const gmailMessageId = await sendReply(
    user.id,
    thread.gmail_thread_id,
    thread.gmail_message_id,
    thread.subject,
    body
  )

  // Mark step sent
  await supabase
    .from('steps')
    .update({ status: 'sent', sent_at: new Date().toISOString(), gmail_message_id: gmailMessageId, resolved_body: body })
    .eq('id', dueStep.id)

  // Check if there are more pending steps
  const remainingSteps = thread.steps?.filter((s: any) =>
    s.id !== dueStep.id && s.status === 'pending'
  )

  const newThreadStatus = remainingSteps?.length > 0 ? 'needs_approval' : 'completed'
  await supabase
    .from('threads')
    .update({ status: newThreadStatus, ...(newThreadStatus === 'completed' ? { completed_at: new Date().toISOString() } : {}) })
    .eq('id', thread.id)

  return NextResponse.json({ ok: true })
}
