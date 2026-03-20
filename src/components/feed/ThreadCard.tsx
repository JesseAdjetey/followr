'use client'

import { cn } from '@/lib/cn'
import { Pill } from '@/components/ui/Pill'
import type { ThreadWithUrgency } from '@/types'
import { getStatusLabel } from '@/lib/urgency'

const ACCENT_COLORS: Record<string, string> = {
  overdue:    '#DC2626',
  today:      '#D97706',
  this_week:  '#2563EB',
  later:      '#2563EB',
  replied:    'transparent',
  completed:  'transparent',
}

interface ThreadCardProps {
  thread: ThreadWithUrgency
  selected?: boolean
  onClick?: () => void
}

export function ThreadCard({ thread, selected, onClick }: ThreadCardProps) {
  const accentColor = ACCENT_COLORS[thread.urgency] ?? 'transparent'
  const statusLabel = getStatusLabel(thread)
  const hasAccent = accentColor !== 'transparent'

  const pillStatus =
    thread.urgency === 'overdue' ? 'overdue' :
    thread.urgency === 'today' ? 'needs_approval' :
    thread.status === 'replied' ? 'replied' :
    thread.status === 'completed' ? 'completed' :
    'waiting'

  return (
    <div
      onClick={onClick}
      className={cn(
        'relative bg-white cursor-pointer transition-all',
        hasAccent ? 'rounded-r-xl rounded-l-none' : 'rounded-xl',
        selected && 'ring-2 ring-accent ring-offset-1'
      )}
      style={{
        borderLeft: hasAccent ? `3px solid ${accentColor}` : undefined,
        border: !hasAccent ? '1px solid rgba(0,0,0,0.08)' : '1px solid rgba(0,0,0,0.08)',
        borderLeftColor: hasAccent ? accentColor : 'rgba(0,0,0,0.08)',
        boxShadow: selected ? '0 0 0 2px #EEF4FF' : undefined,
      }}
    >
      <div className="p-3.5 flex flex-col gap-1.5">
        {/* Subject + pill */}
        <div className="flex items-start justify-between gap-2">
          <p
            className="text-sm font-semibold leading-tight line-clamp-1 flex-1"
            style={{ color: 'var(--text)', letterSpacing: '-0.01em' }}
          >
            {thread.subject || '(no subject)'}
          </p>
          <Pill label={statusLabel} status={pillStatus} />
        </div>

        {/* Recipient */}
        <div className="flex items-center gap-1.5">
          <span className="text-xs" style={{ color: 'var(--muted)' }}>
            {thread.recipient_name || thread.recipient_email}
          </span>
          <span className="text-xs font-mono" style={{ color: 'var(--hint)', fontSize: 10 }}>
            {thread.recipient_email !== thread.recipient_name ? thread.recipient_email : ''}
          </span>
        </div>

        {/* Progress dots + mode tag */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            {Array.from({ length: thread.steps_total }).map((_, i) => {
              const isSent = i < thread.steps_sent
              const isCurrent = i === thread.steps_sent
              return (
                <span
                  key={i}
                  className="rounded-full"
                  style={{
                    width: 7,
                    height: 7,
                    background: isSent ? '#16A34A' : isCurrent ? '#2563EB' : '#E5E3DF',
                    border: isCurrent ? '1.5px solid #2563EB' : undefined,
                  }}
                />
              )
            })}
            {thread.steps_total > 0 && (
              <span className="text-xs ml-1" style={{ color: 'var(--hint)', fontSize: 10 }}>
                Follow-up {Math.min(thread.steps_sent + 1, thread.steps_total)} of {thread.steps_total}
              </span>
            )}
          </div>

          <span
            className="text-xs font-mono rounded-full px-1.5 py-0.5"
            style={{ fontSize: 10, background: 'var(--surface2)', color: 'var(--muted)' }}
          >
            {thread.send_mode === 'auto_send' ? 'auto' : 'approval'}
          </span>
        </div>
      </div>
    </div>
  )
}
