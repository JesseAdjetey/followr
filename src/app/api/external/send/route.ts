// POST /api/external/send — send the first email in a conversation.
//
// Everything Followr did until now began with somebody else's email: the
// watched address turned up in a Cc, and Followr replied into the thread that
// already existed. This is the other half — the scheduling app finishes a call
// and asks Followr to open the conversation, which Followr then owns like any
// other: it watches for a reply, and chases if one never comes.
//
// Same shared secret as the other /api/external routes.

import crypto from 'node:crypto'
import { NextRequest, NextResponse } from 'next/server'
import { createServiceSupabaseClient } from '@/lib/supabase-server'
import { sendNew, wasRefusedByGoogle, isInvalidGrantError, clearGmailTokens } from '@/lib/gmail'
import { computeScheduledDates } from '@/lib/sequence'
import type { StepDraft } from '@/types'

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

type ChaseStep = { sendAfterDays?: number; templateId?: string | null; customBody?: string | null }

type Incoming = {
  idempotencyKey?: string
  from?: string
  fromName?: string | null
  to?: { email?: string; name?: string | null }
  subject?: string
  body?: string
  chase?: { sendMode?: string; steps?: ChaseStep[] }
}

/** Postgres says 23505 when a unique index rejects the row. */
function isUniqueViolation(error: { code?: string } | null): boolean {
  return error?.code === '23505'
}

export async function POST(req: NextRequest) {
  if (!authorised(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const payload = (await req.json().catch(() => null)) as Incoming | null

  const idempotencyKey = payload?.idempotencyKey?.trim()
  const from = payload?.from?.trim().toLowerCase()
  const toEmail = payload?.to?.email?.trim()
  const subject = payload?.subject?.trim()
  const body = payload?.body?.trim()

  const missing = [
    !idempotencyKey && 'idempotencyKey',
    !from && 'from',
    !toEmail && 'to.email',
    !subject && 'subject',
    !body && 'body',
  ].filter(Boolean)

  if (missing.length > 0) {
    return NextResponse.json(
      { error: `Missing required ${missing.length === 1 ? 'field' : 'fields'}: ${missing.join(', ')}` },
      { status: 400 },
    )
  }

  const supabase = createServiceSupabaseClient()

  // ── Whose mailbox ────────────────────────────────────────
  //
  // The caller names a person, not an account. Anyone who connected Gmail
  // before the address was recorded has it backfilled on the next poll, so a
  // miss here is worth saying plainly rather than falling back to whichever
  // account happens to be first.
  const { data: account } = await supabase
    .from('settings')
    .select('user_id, gmail_address, gmail_refresh_token')
    .ilike('gmail_address', from as string)
    .maybeSingle()

  if (!account) {
    return NextResponse.json(
      {
        error: `No Followr account sends as ${from}. Whoever owns it needs to connect Gmail in Followr, ` +
          `or has connected it and not been polled yet.`,
      },
      { status: 409 },
    )
  }

  if (!account.gmail_refresh_token) {
    return NextResponse.json(
      { error: `${from} has no working Gmail connection in Followr. It needs reconnecting.` },
      { status: 409 },
    )
  }

  const userId = account.user_id as string
  const now = new Date()

  // ── Claim before sending ─────────────────────────────────
  //
  // The caller retries, and a timeout after Gmail accepted the message looks
  // exactly like one before it. Claiming the key first means a retry finds the
  // claim rather than the recipient finding two emails. The Gmail ids are not
  // known yet, and both columns are NOT NULL, so the claim carries a
  // placeholder that the send replaces.
  const placeholder = `pending:${idempotencyKey}`

  const claimRow = {
    user_id: userId,
    idempotency_key: idempotencyKey,
    origin: 'api',
    gmail_thread_id: placeholder,
    gmail_message_id: placeholder,
    subject,
    recipient_name: payload?.to?.name ?? null,
    recipient_email: toEmail,
    sender_name: payload?.fromName ?? null,
    sender_email: from,
    email_snippet: (body as string).slice(0, 160),
    email_date: now.toISOString(),
    send_mode: payload?.chase?.sendMode === 'requires_approval' ? 'requires_approval' : 'auto_send',
    status: 'sending',
  }

  const { data: claimed, error: claimError } = await supabase
    .from('threads')
    .insert(claimRow)
    .select('id')
    .single()

  let threadId: string | null = claimed?.id ?? null

  if (claimError) {
    if (!isUniqueViolation(claimError)) {
      console.error('Outbound claim failed:', claimError)
      return NextResponse.json({ error: `Could not record the send: ${claimError.message}` }, { status: 500 })
    }

    // Somebody already claimed this key. What happens next depends entirely on
    // how their attempt ended.
    const { data: existing } = await supabase
      .from('threads')
      .select('id, status, gmail_thread_id, gmail_message_id')
      .eq('user_id', userId)
      .eq('idempotency_key', idempotencyKey)
      .single()

    if (!existing) {
      return NextResponse.json({ error: 'Could not resolve a competing send.' }, { status: 500 })
    }

    if (existing.status !== 'failed') {
      // Sent, or in flight with an outcome nobody knows yet. Either way this
      // request must not put a second copy in the recipient's inbox.
      return NextResponse.json({
        sent: existing.status !== 'sending',
        duplicate: true,
        threadId: existing.id,
        gmailThreadId: existing.gmail_thread_id.startsWith('pending:') ? null : existing.gmail_thread_id,
        gmailMessageId: existing.gmail_message_id.startsWith('pending:') ? null : existing.gmail_message_id,
        status: existing.status,
      })
    }

    // Google refused the previous attempt outright, so nothing was sent and
    // trying again is safe. Conditional on the status we read, so two retries
    // arriving together cannot both proceed.
    const { data: retaken } = await supabase
      .from('threads')
      .update({ status: 'sending', email_date: now.toISOString() })
      .eq('id', existing.id)
      .eq('status', 'failed')
      .select('id')

    if (!retaken || retaken.length === 0) {
      return NextResponse.json({
        sent: false,
        duplicate: true,
        threadId: existing.id,
        status: 'sending',
      })
    }

    threadId = existing.id
  }

  if (!threadId) {
    return NextResponse.json({ error: 'Could not record the send.' }, { status: 500 })
  }

  // ── Send ─────────────────────────────────────────────────
  let sent: { messageId: string; threadId: string; fromEmail: string }
  try {
    sent = await sendNew(userId, toEmail as string, payload?.to?.name ?? null, subject as string, body as string, payload?.fromName ?? null)
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err)

    if (isInvalidGrantError(err)) {
      await clearGmailTokens(userId)
    }

    if (wasRefusedByGoogle(err)) {
      // A refusal is definite: nothing was sent, so the claim is released for
      // a retry.
      await supabase.from('threads').update({ status: 'failed' }).eq('id', threadId)
      return NextResponse.json({ error: `Gmail refused the message: ${detail}`, retryable: true }, { status: 502 })
    }

    // The connection died without an answer. The message may well have gone,
    // so the claim stays held — a stuck thread is recoverable by hand, a
    // duplicate email to a customer is not.
    console.error(`Outbound send for thread ${threadId} ended with no answer:`, err)
    return NextResponse.json(
      {
        error: `Gmail could not be reached, and whether the message went is unknown: ${detail}`,
        retryable: false,
        threadId,
      },
      { status: 502 },
    )
  }

  // ── Record what Gmail did ────────────────────────────────
  //
  // A thread for these ids can already exist if Gmail folded the message into
  // an existing conversation. The unique index on (user_id, gmail_thread_id)
  // would reject the update, so the older row wins and the claim is dropped.
  const { data: collision } = await supabase
    .from('threads')
    .select('id')
    .eq('user_id', userId)
    .eq('gmail_thread_id', sent.threadId)
    .neq('id', threadId)
    .maybeSingle()

  if (collision) {
    await supabase.from('threads').delete().eq('id', threadId)
    return NextResponse.json({
      sent: true,
      merged: true,
      threadId: collision.id,
      gmailThreadId: sent.threadId,
      gmailMessageId: sent.messageId,
    })
  }

  // 'waiting' rather than 'pending_setup', deliberately and for two reasons:
  // reply detection skips pending_setup threads, and the poll sweeps them into
  // the account's default sequence — which would enrol a post-call follow-up
  // in a merchant chase it has nothing to do with.
  await supabase
    .from('threads')
    .update({
      gmail_thread_id: sent.threadId,
      gmail_message_id: sent.messageId,
      status: 'waiting',
      sender_email: sent.fromEmail,
    })
    .eq('id', threadId)

  // ── Chase, if asked for ──────────────────────────────────
  const requested = payload?.chase?.steps ?? []
  let stepsCreated = 0

  if (requested.length > 0) {
    const drafts: StepDraft[] = requested.map((step, i) => ({
      step_number: i + 1,
      send_after_days: Math.max(1, Math.round(step.sendAfterDays ?? 3)),
      time_unit: 'days',
      message_source: step.templateId ? 'template' : 'custom',
      template_id: step.templateId ?? null,
      custom_body: step.customBody ?? '',
    }))

    const scheduled = computeScheduledDates(now, drafts)

    const { error: stepError } = await supabase.from('steps').insert(
      drafts.map((draft, i) => ({
        thread_id: threadId,
        user_id: userId,
        step_number: draft.step_number,
        send_after_days: draft.send_after_days,
        scheduled_at: scheduled[i].toISOString(),
        message_source: draft.message_source,
        template_id: draft.template_id,
        custom_body: draft.custom_body || null,
        status: 'pending',
      })),
    )

    // The email has gone. Failing to schedule the chase is worth saying, and
    // not worth reporting the send as failed over.
    if (stepError) console.error(`Chase steps for thread ${threadId} could not be created:`, stepError)
    else stepsCreated = drafts.length
  }

  return NextResponse.json({
    sent: true,
    threadId,
    gmailThreadId: sent.threadId,
    gmailMessageId: sent.messageId,
    from: sent.fromEmail,
    stepsCreated,
  })
}
