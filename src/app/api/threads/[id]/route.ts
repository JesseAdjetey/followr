// GET    /api/threads/:id  — get single thread with steps
// PATCH  /api/threads/:id  — update thread (send_mode, status, snooze)
// DELETE /api/threads/:id  — delete thread

import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('threads')
    .select('*, steps(*, template:templates(*))')
    .eq('id', params.id)
    .eq('user_id', user.id)
    .single()

  if (error || !data) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(data)
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const allowedFields = ['send_mode', 'status', 'snoozed_until']
  const update: Record<string, unknown> = {}
  for (const key of allowedFields) {
    if (key in body) update[key] = body[key]
  }

  const { data, error } = await supabase
    .from('threads')
    .update(update)
    .eq('id', params.id)
    .eq('user_id', user.id)
    .select('*, steps(*, template:templates(*))')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await supabase.from('threads').delete().eq('id', params.id).eq('user_id', user.id)
  return NextResponse.json({ ok: true })
}
