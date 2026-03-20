// PATCH  /api/templates/:id  — update template
// DELETE /api/templates/:id  — delete template

import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { extractVariables } from '@/lib/templates'

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { name, body } = await req.json()
  const update: Record<string, unknown> = {}
  if (name) update.name = name
  if (body) {
    update.body = body
    update.variables = extractVariables(body)
  }

  const { data, error } = await supabase
    .from('templates')
    .update(update)
    .eq('id', params.id)
    .eq('user_id', user.id)
    .select()
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

  await supabase.from('templates').delete().eq('id', params.id).eq('user_id', user.id)
  return NextResponse.json({ ok: true })
}
