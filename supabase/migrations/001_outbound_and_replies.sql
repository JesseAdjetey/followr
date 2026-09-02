-- Followr — outbound sending, and knowing who owns which mailbox.
--
-- Run this in the Supabase SQL editor. Every change is additive: existing rows
-- keep working untouched, which is the point.

-- ── Which Gmail account these tokens belong to ──────────────
--
-- settings stores the tokens but never recorded the address. sendReply finds
-- it per send by asking Google, which is fine when the caller already knows
-- whose mailbox it means. It is not enough to be *told* "send this as Jesse"
-- and find the right mailbox, which is what outbound needs.
--
-- Populated when someone connects Gmail, and backfilled for anyone already
-- connected on their next poll.

alter table public.settings
  add column if not exists gmail_address text;


-- ── Threads Followr started itself ──────────────────────────
--
-- Every thread until now arrived by being Cc'd. One that Followr sent first
-- has to be distinguishable, because the poll auto-activates Cc'd threads
-- into the account's default sequence — and a post-call follow-up must not be
-- swept into a five-week merchant chase.

alter table public.threads
  add column if not exists origin text not null default 'cc';

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'threads_origin_check'
  ) then
    alter table public.threads
      add constraint threads_origin_check check (origin in ('cc', 'api'));
  end if;
end $$;


-- ── Sending the same email twice is the failure that matters ──
--
-- The caller retries; a timeout after Gmail accepted the message looks exactly
-- like one before it. The key is claimed before sending, so a retry finds the
-- claim rather than the merchant finding two emails.

alter table public.threads
  add column if not exists idempotency_key text;

create unique index if not exists threads_idempotency
  on public.threads(user_id, idempotency_key)
  where idempotency_key is not null;


-- ── Two more states a thread can be in ──────────────────────
--
-- 'sending'  — claimed, outcome not yet known. Retries are refused rather
--              than risking a second copy.
-- 'failed'   — Gmail refused it outright, so nothing was sent and trying
--              again is safe.

alter table public.threads
  drop constraint if exists threads_status_check;

alter table public.threads
  add constraint threads_status_check check (status in (
    'pending_setup',
    'waiting',
    'needs_approval',
    'overdue',
    'replied',
    'completed',
    'snoozed',
    'sending',
    'failed'
  ));
