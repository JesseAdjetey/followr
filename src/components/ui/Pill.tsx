import { cn } from '@/lib/cn'
import type { ThreadStatus } from '@/types'

const configs: Record<string, { bg: string; text: string }> = {
  overdue:      { bg: '#FEF2F2', text: '#DC2626' },
  needs_approval: { bg: '#FFFBEB', text: '#D97706' },
  waiting:      { bg: '#EEF4FF', text: '#2563EB' },
  replied:      { bg: '#F7F6F2', text: '#B8B5AE' },
  completed:    { bg: '#F7F6F2', text: '#B8B5AE' },
  snoozed:      { bg: '#F7F6F2', text: '#B8B5AE' },
  pending_setup:{ bg: '#EEF4FF', text: '#2563EB' },
}

interface PillProps {
  label: string
  status?: ThreadStatus | 'today' | 'upcoming'
  className?: string
}

export function Pill({ label, status, className }: PillProps) {
  const cfg = status ? (configs[status] ?? configs.waiting) : { bg: '#EEF4FF', text: '#2563EB' }
  return (
    <span
      className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold', className)}
      style={{ background: cfg.bg, color: cfg.text, fontSize: 11 }}
    >
      {label}
    </span>
  )
}
