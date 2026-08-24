// POST /api/external/templates — install a sequence, wording and timing both.
//
// The scheduling app knows what it wants a merchant chased with; Followr knows
// how to send it. Rather than asking somebody to copy five emails between two
// screens by hand, the wording arrives here and becomes templates and steps in
// one call.
//
// Same shared secret as the other /api/external routes.

import crypto from 'node:crypto'
import { NextRequest, NextResponse } from 'next/server'
import { createServiceSupabaseClient } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a)
  const bb = Buffer.from(b)
  if (ab.length !== bb.length) return false
  return crypto.timingSafeEqual(ab, bb)
}

function authorised(req: NextRequest): boolean {
  const expected = process.env.FOLLOWR_EXTERNAL_SECRET ?? process.env.CRON_SECRET
  if (!expected) return false
  const header = req.headers.get('authorization')
  const presented = header?.toLowerCase().startsWith('bearer ')
    ? header.slice(7).trim()
    : req.headers.get('x-external-secret')?.trim()
  return Boolean(presented) && safeEqual(presented as string, expected)
}

type Incoming = { name?: string; body?: string; variables?: string[] }

export async function POST(req: NextRequest) {
  if (!authorised(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const payload = await req.json().catch(() => null)
  const email: string | null = payload?.email?.trim() || null
  const incoming: Incoming[] = Array.isArray(payload?.templates) ? payload.templates : []
  const everyWeeks = Number(payload?.everyWeeks) > 0 ? Math.round(Number(payload.everyWeeks)) : 1

  if (!email) return NextResponse.json({ error: 'email is required' }, { status: 400 })
  if (!incoming.length) return NextResponse.json({ error: 'templates is required' }, { status: 400 })
  if (incoming.some((t) => !t.name?.trim() || !t.body?.trim())) {
    return NextResponse.json({ error: 'every template needs a name and a body' }, { status: 400 })
  }

  const supabase = createServiceSupabaseClient()
  const { data: users } = await supabase.auth.admin.listUsers()
  const user = users?.users?.find((u) => u.email?.toLowerCase() === email.toLowerCase())
  if (!user) return NextResponse.json({ installed: false, reason: 'no_account' })

  const ids: string[] = []
  for (const template of incoming) {
    const name = template.name!.trim()
    const body = template.body!.trim()
    const variables = Array.isArray(template.variables) ? template.variables : ['name']

    // Matched by name, so re-installing corrects the wording rather than
    // leaving a second copy behind and no way to tell which one is in use.
    const { data: existing } = await supabase
      .from('templates')
      .select('id')
      .eq('user_id', user.id)
      .eq('name', name)
      .maybeSingle()

    if (existing) {
      const { error } = await supabase
        .from('templates')
        .update({ body, variables })
        .eq('id', existing.id)
      if (error) return NextResponse.json({ installed: false, reason: error.message }, { status: 500 })
      ids.push(existing.id)
    } else {
      const { data, error } = await supabase
        .from('templates')
        .insert({ user_id: user.id, name, body, variables })
        .select('id')
        .single()
      if (error) return NextResponse.json({ installed: false, reason: error.message }, { status: 500 })
      ids.push(data.id)
    }
  }

  // Step one is measured from the welcome email, the rest from the step before.
  const steps = ids.map((id, i) => ({
    step_number: i + 1,
    send_after_days: everyWeeks,
    time_unit: 'weeks',
    message_source: 'template',
    template_id: id,
    custom_body: '',
  }))

  const { error } = await supabase
    .from('settings')
    .update({ auto_followup_steps: steps })
    .eq('user_id', user.id)

  if (error) return NextResponse.json({ installed: false, reason: error.message }, { status: 500 })

  return NextResponse.json({ installed: true, templates: ids.length, stepCount: steps.length })
}
