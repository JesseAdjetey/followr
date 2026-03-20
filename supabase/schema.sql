-- Followr — Supabase Schema
-- Run this in your Supabase SQL editor

-- ── EXTENSIONS ──────────────────────────────────────────────
create extension if not exists "uuid-ossp";

-- ── SETTINGS ────────────────────────────────────────────────
create table public.settings (
  id                  uuid primary key default uuid_generate_v4(),
  user_id             uuid references auth.users(id) on delete cascade not null unique,
  watched_cc_address  text not null default '',
  default_send_mode   text not null default 'auto_send' check (default_send_mode in ('auto_send', 'requires_approval')),
  notifications_enabled boolean not null default true,
  gmail_access_token  text,
  gmail_refresh_token text,
  gmail_token_expiry  timestamptz,
  gmail_watch_expiry  timestamptz,
  gmail_history_id    text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

alter table public.settings enable row level security;
create policy "Users can manage own settings"
  on public.settings for all using (auth.uid() = user_id);

-- ── TEMPLATES ───────────────────────────────────────────────
create table public.templates (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid references auth.users(id) on delete cascade not null,
  name        text not null,
  body        text not null,
  variables   text[] not null default '{}',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table public.templates enable row level security;
create policy "Users can manage own templates"
  on public.templates for all using (auth.uid() = user_id);

-- Seed default templates on user creation (trigger below)

-- ── THREADS ─────────────────────────────────────────────────
create table public.threads (
  id                uuid primary key default uuid_generate_v4(),
  user_id           uuid references auth.users(id) on delete cascade not null,

  -- Gmail identifiers
  gmail_thread_id   text not null,
  gmail_message_id  text not null,

  -- Email metadata
  subject           text not null,
  recipient_name    text,
  recipient_email   text not null,
  sender_name       text,
  sender_email      text not null,
  email_snippet     text,
  email_date        timestamptz not null,

  -- Sequence config
  send_mode         text not null default 'auto_send'
                    check (send_mode in ('auto_send', 'requires_approval')),

  -- Status
  status            text not null default 'pending_setup'
                    check (status in (
                      'pending_setup',  -- detected, not yet configured
                      'waiting',        -- auto-send, sequence running
                      'needs_approval', -- manual, waiting for approval
                      'overdue',        -- manual, approval deadline missed
                      'replied',        -- recipient replied, sequence paused
                      'completed',      -- all steps sent, no reply
                      'snoozed'         -- user deferred
                    )),

  snoozed_until     timestamptz,
  replied_at        timestamptz,
  completed_at      timestamptz,

  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),

  unique(user_id, gmail_thread_id)
);

alter table public.threads enable row level security;
create policy "Users can manage own threads"
  on public.threads for all using (auth.uid() = user_id);

create index threads_user_status on public.threads(user_id, status);
create index threads_user_updated on public.threads(user_id, updated_at desc);

-- ── STEPS ───────────────────────────────────────────────────
create table public.steps (
  id              uuid primary key default uuid_generate_v4(),
  thread_id       uuid references public.threads(id) on delete cascade not null,
  user_id         uuid references auth.users(id) on delete cascade not null,

  step_number     integer not null,

  -- Timing
  send_after_days integer not null default 3,  -- days after previous step (or thread creation for step 1)
  scheduled_at    timestamptz,                  -- computed when thread is activated

  -- Message
  message_source  text not null default 'template'
                  check (message_source in ('template', 'custom')),
  template_id     uuid references public.templates(id) on delete set null,
  custom_body     text,
  resolved_body   text,  -- final message after variable substitution (set before send)

  -- Status
  status          text not null default 'pending'
                  check (status in (
                    'pending',   -- not yet due
                    'due',       -- due, waiting for send or approval
                    'approved',  -- approved by user (requires_approval), ready to send
                    'sent',      -- sent via Gmail
                    'skipped'    -- user skipped this step
                  )),

  sent_at         timestamptz,
  gmail_message_id text,  -- the Gmail message ID of the sent reply

  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),

  unique(thread_id, step_number)
);

alter table public.steps enable row level security;
create policy "Users can manage own steps"
  on public.steps for all using (auth.uid() = user_id);

create index steps_scheduled on public.steps(scheduled_at) where status = 'pending';
create index steps_thread on public.steps(thread_id, step_number);

-- ── UPDATED_AT TRIGGER ──────────────────────────────────────
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger set_updated_at before update on public.settings
  for each row execute function public.handle_updated_at();
create trigger set_updated_at before update on public.templates
  for each row execute function public.handle_updated_at();
create trigger set_updated_at before update on public.threads
  for each row execute function public.handle_updated_at();
create trigger set_updated_at before update on public.steps
  for each row execute function public.handle_updated_at();

-- ── SEED DEFAULT TEMPLATES ON SIGNUP ────────────────────────
create or replace function public.seed_default_templates()
returns trigger as $$
begin
  insert into public.templates (user_id, name, body, variables) values
  (
    new.id,
    'Gentle nudge',
    'Hi {{name}}, just following up on my previous message — wanted to make sure it didn''t get buried. Let me know your thoughts!',
    array['name']
  ),
  (
    new.id,
    'Invoice reminder',
    'Hi {{name}}, this is a friendly reminder that invoice {{invoice}} is outstanding. Please let me know if you have any questions.',
    array['name', 'invoice']
  ),
  (
    new.id,
    'Final check-in',
    'Hi {{name}}, I wanted to send one final note on this. If the timing isn''t right, no worries at all — just let me know either way.',
    array['name']
  ),
  (
    new.id,
    'Partnership follow-up',
    'Hi {{name}}, circling back on the partnership proposal. Happy to adjust any terms — would love to find a time to connect.',
    array['name']
  );

  insert into public.settings (user_id) values (new.id);

  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.seed_default_templates();

-- ── REALTIME ────────────────────────────────────────────────
-- Enable realtime on threads so the feed updates live
alter publication supabase_realtime add table public.threads;
alter publication supabase_realtime add table public.steps;
