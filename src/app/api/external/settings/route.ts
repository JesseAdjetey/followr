// GET  /api/external/settings?email=... — what is Followr's state for this user
// POST /api/external/settings           — set their watched CC address
//
// So another app can check the two sides agree without a person typing the
// same address into both and getting silence when they differ.
//
// Same shared secret as /api/external/pause. Deliberately returns no tokens:
// whether Gmail is connected is useful, the credential itself is not.

import crypto from 'node:crypto'
import { NextRequest, NextResponse } from 'next/server'
import { createServiceSupabaseClient } from '@/lib/supabase-server'

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

/** The Supabase user whose Gmail sends the emails, found by address. */
async function findUser(email: string) {
  const supabase = createServiceSupabaseClient()
  const { data } = await supabase.auth.admin.listUsers()
  const user = data?.users?.find((u) => u.email?.toLowerCase() === email.toLowerCase())
  return user ? { supabase, user } : null
}

export async function GET(req: NextRequest) {
  if (!process.env.FOLLOWR_EXTERNAL_SECRET && !process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'FOLLOWR_EXTERNAL_SECRET is not set' }, { status: 503 })
  }
  if (!authorised(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const email = new URL(req.url).searchParams.get('email')?.trim()
  if (!email) return NextResponse.json({ error: 'email is required' }, { status: 400 })

  const found = await findUser(email)

  // No account here is not an error. It is the single most likely thing to be
  // wrong, and the caller wants to display it, not retry it.
  if (!found) {
    return NextResponse.json({
      linked: false,
      reason: 'no_account',
      detail: `No Followr account for ${email}. Sign in to Followr with that address first.`,
    })
  }

  const { supabase, user } = found
  const { data: settings } = await supabase
    .from('settings')
    .select('watched_cc_address, auto_followup_enabled, auto_followup_send_mode, auto_followup_steps, gmail_refresh_token')
    .eq('user_id', user.id)
    .single()

  const steps = (settings?.auto_followup_steps as unknown[] | null) ?? []

  return NextResponse.json({
    linked: true,
    email: user.email,
    watchedCcAddress: settings?.watched_cc_address || null,
    // Without a refresh token Followr cannot read the mailbox at all, so it
    // will never notice the Cc however correctly everything else is set.
    gmailConnected: Boolean(settings?.gmail_refresh_token),
    autoFollowUpEnabled: Boolean(settings?.auto_followup_enabled),
    autoFollowUpSendMode: settings?.auto_followup_send_mode ?? null,
    stepCount: steps.length,
    // Everything that has to be true before a Cc turns into a sequence. The
    // caller can show this rather than making the person deduce it.
    ready: Boolean(
      settings?.gmail_refresh_token &&
        settings?.watched_cc_address &&
        settings?.auto_followup_enabled &&
        steps.length > 0,
    ),
  })
}

export async function POST(req: NextRequest) {
  if (!authorised(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => null)
  const email: string | null = body?.email?.trim() || null
  const watchedCcAddress: string | null = body?.watchedCcAddress?.trim()?.toLowerCase() || null

  if (!email) return NextResponse.json({ error: 'email is required' }, { status: 400 })
  if (!watchedCcAddress || !watchedCcAddress.includes('@')) {
    return NextResponse.json({ error: 'watchedCcAddress must be an address' }, { status: 400 })
  }

  const found = await findUser(email)
  if (!found) return NextResponse.json({ updated: false, reason: 'no_account' })

  const { supabase, user } = found
  const { error } = await supabase
    .from('settings')
    .update({ watched_cc_address: watchedCcAddress })
    .eq('user_id', user.id)

  if (error) return NextResponse.json({ updated: false, reason: error.message }, { status: 500 })

  return NextResponse.json({ updated: true, watchedCcAddress })
}
