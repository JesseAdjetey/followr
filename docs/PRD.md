# Followr — Product Requirements Document

## Overview
Followr is a mail follow-up tool that watches a designated CC email address. When that address is detected on an incoming email, it creates a tracked thread and lets the user configure an automated follow-up sequence using saved templates or custom messages per step.

---

## Core Concepts

### The watched CC address
The user configures a single CC email address (e.g. `followup@acme.com`). Whenever this address appears in the CC field of an incoming email, Followr detects it and creates a new thread entry.

### Send modes
Every thread operates in one of two modes:

| Mode | Behaviour |
|------|-----------|
| `auto_send` | Follow-up fires automatically on the scheduled date. No user action needed. |
| `requires_approval` | Follow-up waits for user to approve before sending. If the scheduled date passes without approval, thread becomes `overdue` and a push notification is sent. |

Global default is set in Settings. Each thread can override it during setup or from the detail page at any time.

### Thread statuses

| Status | Meaning |
|--------|---------|
| `waiting` | Auto-send thread. Sequence running. Next follow-up scheduled. |
| `needs_approval` | Manual thread. A follow-up is ready and waiting for approval. |
| `overdue` | Manual thread only. Approval deadline missed. Push notification sent. Stays overdue until user acts. |
| `replied` | Recipient replied. Sequence paused automatically. |
| `completed` | All steps sent, no reply received. |
| `snoozed` | User deferred. Resumes at snoozed date. |

### "Overdue" definition
Overdue ONLY applies to `requires_approval` threads. It means a step was scheduled to go out but the user has not approved it. The thread does NOT auto-send after the deadline — it stays overdue until the user approves, edits, or skips that step.

---

## Screens

### 1. Feed (`/`)
Main screen. All tracked threads sorted by urgency.

**Components:**
- Top bar: app name, watched CC address pill
- New email banner: blue banner when a new CC'd thread is detected (pulsing dot, subject + sender, "Set up follow-ups" CTA)
- Filter tabs: All · Overdue · Due today · This week · Replied (pill-style)
- Thread cards grouped by section: Overdue → Due today → This week → Replied

**Thread card fields:**
- Left colour accent border: red (overdue), amber (due today), blue (upcoming), none (replied)
- Subject line
- Status pill: "3 days overdue" / "Due today" / "In 3 days" / "Replied"
- Recipient name + email
- Progress dots: green (sent), blue (current), grey (pending)
- Stage hint: "Follow-up 2 of 3"
- Mode tag: `auto` or `approval` (monospace, small)

### 2. Thread Detail (`/thread/[id]`)
Full-page view of a single thread.

**Components:**
- Back button, subject (truncated), status pill in top bar
- Sequence timeline: horizontal numbered circles with connecting lines, date + status under each
  - Green filled = sent
  - Blue outlined = current (active or overdue)
  - Grey = pending
- Contact bar: avatar with initials, name, email, Snooze + Stop buttons
- Thread conversation (scrollable):
  - Sent messages: right-aligned blue bubbles
  - Received messages: left-aligned grey bubbles
  - "Now" divider line with timestamp
  - Ghost cards for scheduled sends: dashed border, italic text, "Edit before sending" link
  - On `requires_approval` overdue step: show "Edit first ›" + "Approve & send ›" links

### 3. Setup (`/setup/[gmailThreadId]`)
Configure follow-ups for a newly detected CC'd email. Nothing sends until "Activate follow-ups" is tapped.

**Components:**
- Email preview card: subject, sender, date, body snippet
- Send mode toggle: Auto-send / Needs approval (defaults to global setting)
- Step cards (one per follow-up step):
  - Step number + label
  - Remove link
  - Timing: number input + days/weeks dropdown
  - Message: "Use template" / "Write custom" toggle
    - Template: dropdown of saved templates
    - Custom: textarea
- "+ Add another follow-up step" button (dashed border)
- Footer: "Skip for now" (ghost) + "Activate follow-ups" (primary)

### 4. Templates (`/templates`)
Library of reusable message templates.

**Components:**
- Page title + "New template" button
- Template cards (grid on desktop, list on mobile):
  - Name
  - Message preview (~150 chars)
  - Variable placeholders highlighted: `{{name}}`, `{{invoice}}`, etc.
  - Edit / Duplicate / Delete actions

**Supported variables:**
| Variable | Value |
|----------|-------|
| `{{name}}` | Recipient's first name |
| `{{subject}}` | Original email subject |
| `{{invoice}}` | Invoice number if detected |
| `{{sender}}` | User's own name |

---

## Navigation

| Transition | Trigger |
|------------|---------|
| Feed → Setup | Tap "Set up follow-ups" on banner |
| Feed → Detail | Tap any thread card |
| Feed → Templates | Sidebar / bottom nav |
| Setup → Feed | "Activate", "Skip", or back |
| Detail → Feed | Back button |

---

## Settings
- Watched CC address (single, v1)
- Default send mode (auto / approval)
- Gmail OAuth connection
- Push notifications toggle

---

## V1 Scope
**In:** Gmail only, single account, one CC address, up to 5 steps/thread, templates with variables, auto + manual modes, push notifications for overdue, snooze, auto-pause on reply.

**Out (future):** Outlook/Apple Mail, multiple CC addresses, AI-generated suggestions, team workspace, analytics, open/click tracking.
