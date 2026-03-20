# Followr — Design Document

## Reference Files
- `design/followr_mobile.html` — mobile UI (phone frame, bottom nav)
- `design/followr_desktop.html` — desktop UI (Mac chrome, 3-column layout)

Always refer to these HTML files as the visual source of truth.

---

## Design Tokens

```css
/* Colors */
--bg:         #F2F1ED   /* page background */
--surface:    #FFFFFF   /* cards, panels */
--surface2:   #F7F6F2   /* secondary surfaces, inputs */
--border:     rgba(0,0,0,0.08)
--border2:    rgba(0,0,0,0.14)
--text:       #1A1814
--muted:      #888580
--hint:       #B8B5AE
--accent:     #2563EB   /* primary blue */
--accent-bg:  #EEF4FF
--green:      #16A34A
--green-bg:   #F0FDF4
--red:        #DC2626
--red-bg:     #FEF2F2
--amber:      #D97706
--amber-bg:   #FFFBEB

/* Typography */
--font:  'DM Sans', sans-serif      /* body, UI */
--mono:  'DM Mono', monospace       /* tags, dates, email addresses */

/* Layout */
--sidebar-w:  240px
--detail-w:   380px
--radius:     12px
--radius-sm:  8px
```

---

## Layout

### Mobile
- Single column, full screen
- Bottom nav: Feed | Templates (2 items)
- Feed → Detail: full page push transition
- Setup: full page

### Desktop (≥1024px)
- 3-column: Sidebar (240px) + Main feed (flex-1) + Detail panel (380px)
- Sidebar: always visible, nav items with badges
- Detail panel: shows selected thread, always visible on desktop
- Setup: modal overlay (560px wide, centred)
- Templates: replaces feed+detail area (full width minus sidebar)

---

## Component Map

### ThreadCard
```
Props: thread (Thread), selected (bool), onClick
States: red (overdue), amber (today), blue (upcoming), none (replied)
Left accent border colour matches state
Shows: subject, recipient, status pill, progress dots, mode tag
```

### SequenceTimeline
```
Props: steps (Step[])
Circle states: done (green), active (blue outlined), pending (grey)
Connecting lines: green when done, grey when not
Labels: date (mono) + status text below each circle
```

### GhostCard
```
Props: step (Step), onEdit, onApprove (if requires_approval + overdue)
Dashed border, italic message body
Shows "Edit before sending ›" link always
Shows "Approve & send ›" link only when requires_approval and overdue/due
```

### StepCard (setup)
```
Props: stepNumber, onRemove
Fields: timing (number + days/weeks), message source toggle (template | custom)
Template mode: select dropdown
Custom mode: textarea
```

### TemplateCard
```
Props: template (Template), onEdit, onDuplicate, onDelete
Shows name, preview (150 chars), variables highlighted in accent colour
```

---

## Status Pills

| Status | Background | Text |
|--------|-----------|------|
| overdue | #FEF2F2 | #DC2626 |
| due today | #FFFBEB | #D97706 |
| upcoming | #EEF4FF | #2563EB |
| replied | #F7F6F2 | #B8B5AE |
| completed | #F7F6F2 | #B8B5AE |

---

## Typography Rules
- App name: 20px, weight 600, letter-spacing -0.02em
- Page titles: 22px, weight 600, letter-spacing -0.02em
- Card subjects: 13–14px, weight 600
- Body / secondary: 12–13px, weight 400
- Labels / hints: 10–11px, weight 500–600, uppercase + letter-spacing 0.06–0.08em
- Email addresses, dates, mono tags: DM Mono, 11–12px
- Mode tags (auto/approval): DM Mono, 10px, surface2 background, pill shape

---

## Interaction Notes
- Card hover: border darkens to border2, subtle box-shadow
- Card selected (desktop): accent border + accent-bg box-shadow ring
- Buttons: slight opacity drop on hover (0.85), scale(0.98) on active
- New email banner: pulsing dot animation (opacity 1 → 0.4, 2s loop)
- Ghost cards: dashed border, italic text, slightly muted
- Sequence connector lines fill green left-to-right as steps complete
