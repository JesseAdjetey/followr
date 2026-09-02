// POST /api/external/render — what a template says once the blanks are filled.
//
// The scheduling app knows a call happened and what was said in it; Followr
// holds the wording. Somebody still has to read the thing before it goes to a
// customer, and they cannot read it if only Followr can see it. So this
// renders and returns, and sends nothing.
//
// Same shared secret as the other /api/external routes.

import crypto from 'node:crypto'
import { NextRequest, NextResponse } from 'next/server'
import { createServiceSupabaseClient } from '@/lib/supabase-server'
import { substituteVariables } from '@/lib/gmail'

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

/** Everything a template might ask for, as strings, with nothing undefined. */
export function asVariables(input: unknown): Record<string, string> {
  const out: Record<string, string> = {}
  if (input && typeof input === 'object') {
    for (const [key, value] of Object.entries(input as Record<string, unknown>)) {
      if (typeof value === 'string') out[key] = value
      else if (typeof value === 'number' || typeof value === 'boolean') out[key] = String(value)
    }
  }
  return out
}

export async function POST(req: NextRequest) {
  if (!authorised(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const payload = await req.json().catch(() => null)
  const email: string | null = payload?.email?.trim() || null
  const templateId: string | null = payload?.templateId?.trim() || null
  const subject: string = typeof payload?.subject === 'string' ? payload.subject : ''
  const variables = asVariables(payload?.variables)

  if (!email) return NextResponse.json({ error: 'email is required' }, { status: 400 })
  if (!templateId) return NextResponse.json({ error: 'templateId is required' }, { status: 400 })

  const supabase = createServiceSupabaseClient()
  const { data: users } = await supabase.auth.admin.listUsers()
  const user = users?.users?.find((u) => u.email?.toLowerCase() === email.toLowerCase())
  if (!user) return NextResponse.json({ error: `No Followr account for ${email}` }, { status: 409 })

  const { data: template } = await supabase
    .from('templates')
    .select('id, name, body')
    .eq('user_id', user.id)
    .eq('id', templateId)
    .maybeSingle()

  if (!template) {
    return NextResponse.json(
      { error: 'That template no longer exists. Pick another one in settings.' },
      { status: 404 },
    )
  }

  const body = substituteVariables(template.body, variables)

  // Placeholders nobody filled. Worth naming rather than letting "{{recap}}"
  // reach a customer looking like a broken app.
  const unresolved = Array.from(new Set(body.match(/\{\{(\w+)\}\}/g) ?? []))

  return NextResponse.json({
    templateName: template.name,
    subject: substituteVariables(subject, variables),
    body,
    unresolved,
  })
}
