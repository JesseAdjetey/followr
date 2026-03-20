# Followr — Stack & Architecture

## Tech Stack

| Layer | Choice | Why |
|-------|--------|-----|
| Framework | Next.js 14 (App Router) | API routes + server components + easy deployment |
| Styling | Tailwind CSS | Utility-first, matches design token approach |
| Database | Supabase (Postgres) | Auth, realtime, edge functions, easy local dev |
| Email | Gmail API (Google OAuth) | Read CC'd emails, send replies in-thread |
| Background jobs | Supabase Edge Functions | Gmail watch handler + sequence scheduler |
| Auth | Supabase Auth + Google OAuth | Single sign-on via Gmail account |

---

## Environment Variables

Create a `.env.local` file:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Google / Gmail OAuth
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_REDIRECT_URI=http://localhost:3000/api/auth/callback

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
CRON_SECRET=a_random_secret_for_securing_cron_routes
```

---

## Project Structure

```
followr/
├── CLAUDE.md                  ← Claude Code reads this first
├── docs/
│   ├── PRD.md                 ← Product requirements
│   ├── DESIGN.md              ← UI/design decisions
│   └── STACK.md               ← This file
├── design/
│   ├── followr_mobile.html    ← Mobile UI reference
│   └── followr_desktop.html   ← Desktop UI reference
├── supabase/
│   └── schema.sql             ← Run this in Supabase SQL editor
├── src/
│   ├── app/
│   │   ├── page.tsx                        ← Feed (home)
│   │   ├── thread/[id]/page.tsx            ← Thread detail
│   │   ├── setup/[gmailThreadId]/page.tsx  ← Setup flow
│   │   ├── templates/page.tsx              ← Templates library
│   │   └── api/
│   │       ├── auth/
│   │       │   ├── route.ts               ← Initiate Google OAuth
│   │       │   └── callback/route.ts      ← OAuth callback handler
│   │       ├── gmail/
│   │       │   ├── watch/route.ts         ← Start Gmail push notifications
│   │       │   └── webhook/route.ts       ← Receive Gmail push events
│   │       ├── threads/
│   │       │   ├── route.ts               ← GET all threads, POST new
│   │       │   └── [id]/
│   │       │       ├── route.ts           ← GET/PATCH/DELETE thread
│   │       │       └── approve/route.ts   ← POST approve a step
│   │       └── templates/
│   │           ├── route.ts               ← GET all, POST new
│   │           └── [id]/route.ts          ← PATCH/DELETE template
│   ├── components/
│   │   ├── ui/                ← Reusable primitives (Button, Pill, Avatar)
│   │   ├── feed/              ← ThreadCard, FilterTabs, NewEmailBanner
│   │   ├── detail/            ← SequenceTimeline, GhostCard, ThreadBubble
│   │   ├── setup/             ← StepCard, ModeToggle, EmailPreview
│   │   └── templates/         ← TemplateCard, TemplateEditor
│   ├── lib/
│   │   ├── gmail.ts           ← Gmail API client (OAuth skeleton provided)
│   │   ├── supabase.ts        ← Supabase client helpers
│   │   ├── sequence.ts        ← Sequence scheduling logic
│   │   └── templates.ts       ← Template variable substitution
│   ├── types/
│   │   └── index.ts           ← All TypeScript types
│   └── hooks/
│       ├── useThreads.ts      ← Threads data + realtime subscription
│       └── useTemplates.ts    ← Templates CRUD
├── package.json
├── tailwind.config.ts
└── next.config.ts
```

---

## Gmail Integration Architecture

```
User CCs followup@acme.com
        ↓
Gmail API push notification → /api/gmail/webhook
        ↓
Parse email: extract thread ID, subject, sender, snippet
        ↓
Check if CC address matches watched address (from settings)
        ↓
Create thread record in Supabase (status: 'pending_setup')
        ↓
Frontend detects new pending_setup thread → shows banner
        ↓
User configures sequence → thread becomes 'waiting' or 'needs_approval'
        ↓
Supabase Edge Function (cron every 15min):
  - Find steps where scheduled_at <= now AND status = 'pending'
  - Auto-send threads → send via Gmail API → mark step 'sent'
  - Manual threads past due → mark thread 'overdue' → send push notification
        ↓
Gmail watch also monitors for replies:
  - If recipient replies → pause sequence → mark thread 'replied'
```

---

## Supabase Edge Functions

### `sequence-scheduler` (runs every 15 minutes)
- Find all pending steps where `scheduled_at <= now`
- For `auto_send` threads: call Gmail API to send, update step status
- For `requires_approval` threads past due: update thread to `overdue`, trigger notification

### `gmail-webhook` (HTTP trigger)
- Receives Gmail push notifications
- Parses new emails for the watched CC address
- Creates new thread records
- Detects replies from recipients to pause sequences

---

## Getting Started

```bash
# 1. Install dependencies
npm install

# 2. Set up Supabase
# - Create a project at supabase.com
# - Run supabase/schema.sql in the SQL editor
# - Copy your project URL and keys to .env.local

# 3. Set up Google OAuth
# - Go to console.cloud.google.com
# - Create a project, enable Gmail API
# - Create OAuth 2.0 credentials
# - Add http://localhost:3000/api/auth/callback as redirect URI
# - Copy client ID and secret to .env.local

# 4. Run locally
npm run dev
```
