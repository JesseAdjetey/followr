'use client'

import { format } from 'date-fns'
import type { Step } from '@/types'

interface GhostCardProps {
  step: Step
  threadId: string
  onApprove?: () => void
  isApproving?: boolean
}

export function GhostCard({ step, threadId, onApprove, isApproving }: GhostCardProps) {
  const isDue = step.status === 'due' || step.status === 'approved'
  const body = step.resolved_body || step.custom_body || '(message will be resolved before sending)'

  return (
    <div
      className="rounded-xl p-3.5 flex flex-col gap-2"
      style={{
        border: '1.5px dashed rgba(0,0,0,0.15)',
        background: 'var(--surface2)',
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold" style={{ color: 'var(--muted)' }}>
          Follow-up {step.step_number}
          {step.scheduled_at && (
            <span className="font-normal ml-1 font-mono" style={{ fontSize: 10 }}>
              · {format(new Date(step.scheduled_at), 'MMM d')}
            </span>
          )}
        </span>
        <a
          href={`/setup/${threadId}?edit=true`}
          className="text-xs"
          style={{ color: 'var(--accent)' }}
        >
          Edit before sending ›
        </a>
      </div>

      {/* Body preview */}
      <p className="text-sm leading-relaxed italic" style={{ color: 'var(--muted)' }}>
        {body}
      </p>

      {/* Approval actions */}
      {isDue && onApprove && (
        <div className="flex gap-2 pt-1">
          <button
            onClick={onApprove}
            disabled={isApproving}
            className="text-xs font-semibold px-3 py-1.5 rounded-lg transition-opacity hover:opacity-80"
            style={{ background: '#2563EB', color: '#fff' }}
          >
            {isApproving ? 'Sending…' : 'Approve & send ›'}
          </button>
        </div>
      )}
    </div>
  )
}
