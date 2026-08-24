// POST /api/external/pause — stop chasing someone who has already responded.
//
// Followr pauses a sequence by itself when the recipient replies. It cannot
// see any other kind of answer. The scheduling app books calls through a link,
// so a merchant who picks a time sends no email at all — Followr sees silence
// and keeps chasing somebody who is already on the calendar.
//
// This is how it gets told. Same shared-secret pattern as /api/cron/*: no user
// session, because the caller is another server.

import crypto from 'node:crypto'
import { NextRequest, NextResponse } from 'next/server'
import { createServiceSupabaseClient } from '@/lib/supabase-server'

// Statuses the scheduler already skips. Nothing is sent for a thread in one of
// these, so stopping is a matter of moving it into one rather than adding a
// new state and a database migration to go with it.
const STOPPED = ['replied', 'completed']

/** Timing-safe compare that tolerates a length mismatch instead of throwing. */
function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a)
  const bb = Buffer.from(b)
  if (ab.length !== bb.length) return false
  return crypto.timingSafeEqual(ab, bb)
}

function presentedSecret(req: NextRequest): string | null {
  const header = req.headers.get('authorization')
  if (header?.toLowerCase().startsWith('bearer ')) return header.slice(7).trim() || null
  return req.headers.get('x-external-secret')?.trim() || null
}

export async function POST(req: NextRequest) {
  const expected = process.env.FOLLOWR_EXTERNAL_SECRET ?? process.env.CRON_SECRET
  if (!expected) {
    return NextResponse.json({ error: 'FOLLOWR_EXTERNAL_SECRET is not set' }, { status: 503 })
  }

  const presented = presentedSecret(req)
  if (!presented || !safeEqual(presented, expected)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json().catch(() => null)
  const gmailThreadId: string | null = body?.gmailThreadId?.trim() || null
  const recipientEmail: string | null = body?.recipientEmail?.trim()?.toLowerCase() || null
  const reason: string = body?.reason?.trim() || 'stopped externally'

  if (!gmailThreadId && !recipientEmail) {
    return NextResponse.json(
      { error: 'Give either gmailThreadId or recipientEmail' },
      { status: 400 },
    )
  }

  const supabase = createServiceSupabaseClient()

  // By thread id where possible: it names the exact conversation. Falling back
  // to the address alone would stop the newest sequence for a merchant who has
  // been approached more than once, which need not be the right one.
  const query = supabase
    .from('threads')
    .select('id, status, recipient_email, gmail_thread_id')
    .order('updated_at', { ascending: false })
    .limit(1)

  const { data: threads, error } = gmailThreadId
    ? await query.eq('gmail_thread_id', gmailThreadId)
    : await query.ilike('recipient_email', recipientEmail as string)

  if (error) {
    return NextResponse.json({ paused: false, reason: error.message }, { status: 500 })
  }

  const thread = threads?.[0]

  // Nothing matched is a legitimate answer, not a failure. The merchant may
  // have been approached before any of this existed, so no thread was ever
  // created — and the caller retries, so a 4xx would have it retry forever.
  if (!thread) return NextResponse.json({ paused: false, reason: 'not_found' })

  if (STOPPED.includes(thread.status)) {
    return NextResponse.json({ paused: false, reason: 'already_stopped', threadId: thread.id })
  }

  const now = new Date().toISOString()

  // Conditional on the status we read, so this cannot race the scheduler into
  // sending a step it had already picked up.
  const { data: updated, error: updateError } = await supabase
    .from('threads')
    .update({ status: 'completed', completed_at: now })
    .eq('id', thread.id)
    .eq('status', thread.status)
    .select('id')

  if (updateError) {
    return NextResponse.json({ paused: false, reason: updateError.message }, { status: 500 })
  }

  if (!updated?.length) {
    return NextResponse.json({ paused: false, reason: 'already_stopped', threadId: thread.id })
  }

  // Any step still waiting must not fire later. Marking them skipped leaves a
  // readable record of what was never sent, which deleting them would not.
  await supabase
    .from('steps')
    .update({ status: 'skipped' })
    .eq('thread_id', thread.id)
    .in('status', ['pending', 'due', 'approved'])

  console.log(`[external/pause] thread ${thread.id} stopped: ${reason}`)

  return NextResponse.json({ paused: true, threadId: thread.id })
}
