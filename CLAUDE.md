# Followr — Claude Code Instructions

You are building **Followr**, an automated email follow-up app. Read this file first, then read the docs in order before writing any code.

## Read these docs first (in order)
1. `docs/PRD.md` — full product requirements, logic, screen descriptions
2. `docs/DESIGN.md` — UI decisions, component map, design tokens
3. `docs/STACK.md` — tech stack, architecture decisions, environment setup
4. `supabase/schema.sql` — full database schema, run this in Supabase first
5. `src/lib/gmail.ts` — Gmail OAuth skeleton, complete the TODOs

## What this app does
Followr watches a designated CC email address. When that address appears in the CC field of an incoming Gmail, it creates a tracked thread and lets the user configure an automated follow-up sequence — using saved templates or custom messages per step — that fires as replies in the same email chain.

## Core user journey
1. User CCs `followup@acme.com` when sending an email
2. Followr detects the CC via Gmail watch/polling
3. A banner appears on the Feed prompting setup
4. User configures steps (timing + template or custom message per step)
5. User sets send mode: auto-send or requires-approval
6. Sequence runs — auto threads fire silently, manual threads wait for approval
7. If recipient replies → sequence pauses automatically
8. Overdue = manual thread missed its approval deadline → push notification sent

## The 4 screens to build
- **Feed** (`/`) — priority list of threads, grouped by urgency
- **Detail** (`/thread/[id]`) — full thread view with sequence timeline + email history
- **Setup** (`/setup/[gmailThreadId]`) — configure follow-ups for a new CC'd email  
- **Templates** (`/templates`) — manage reusable message templates

## Design reference
The HTML mockups in `/design` are your visual source of truth:
- `design/followr_mobile.html` — mobile layout reference
- `design/followr_desktop.html` — desktop layout reference (3-column: sidebar + feed + detail panel)

Match these designs closely. Use DM Sans as the primary font, loaded from Google Fonts.

## Key constraints
- Never auto-send on a thread marked `requires_approval` — it must wait for user action
- Pause sequence immediately when a reply is detected from the recipient
- "Overdue" status only applies to `requires_approval` threads
- All follow-ups send as replies in the original Gmail thread (same thread ID)
- Templates support variables: `{{name}}`, `{{subject}}`, `{{invoice}}`, `{{sender}}`

## Build order (recommended)
1. Supabase setup — run schema, configure env vars
2. Gmail OAuth — complete `src/lib/gmail.ts` TODOs  
3. Feed page — thread cards, filter tabs, status pills
4. Detail page — sequence timeline, thread conversation, ghost cards
5. Setup page — step cards, template/custom toggle, send mode toggle
6. Templates page — template grid, create/edit/delete
7. Background job — Gmail watch + sequence scheduler (Supabase Edge Function)
