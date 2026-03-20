// GET  /api/threads       — list all threads for the current user
// POST /api/threads        — activate a thread with configured steps

import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { computeScheduledDates } from '@/lib/sequence'
import type { StepDraft } from '@/types'

export async function GET(req: NextRequest) {
  const supabase = createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status')

  const query = supabase
    .from('threads')
    .select('*, steps(*, template:templates(*))')
    .eq('user_id', user.id)
    .order('updated_at', { ascending: false })

  if (status) query.eq('status', status)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  const supabase = createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { threadId, sendMode, steps }: { threadId: string; sendMode: string; steps: StepDraft[] } = body

  // Verify thread belongs to user
  const { data: thread } = await supabase
    .from('threads')
    .select('*')
    .eq('id', threadId)
    .eq('user_id', user.id)
    .single()

  if (!thread) return NextResponse.json({ error: 'Thread not found' }, { status: 404 })

  const threadDate = new Date(thread.email_date)
  const scheduledDates = computeScheduledDates(threadDate, steps)

  // Delete existing steps and recreate
  await supabase.from('steps').delete().eq('thread_id', thread.id)

  const stepRows = steps.map((s, i) => ({
    thread_id: thread.id,
    user_id: user.id,
    step_number: i + 1,
    send_after_days: s.time_unit === 'weeks' ? s.send_after_days * 7 : s.send_after_days,
    scheduled_at: scheduledDates[i].toISOString(),
    message_source: s.message_source,
    template_id: s.template_id ?? null,
    custom_body: s.custom_body || null,
    status: 'pending',
  }))

  await supabase.from('steps').insert(stepRows)

  const newStatus = sendMode === 'auto_send' ? 'waiting' : 'needs_approval'
  const { data: updated } = await supabase
    .from('threads')
    .update({ send_mode: sendMode, status: newStatus })
    .eq('id', thread.id)
    .select('*, steps(*, template:templates(*))')
    .single()

  return NextResponse.json(updated)
}
