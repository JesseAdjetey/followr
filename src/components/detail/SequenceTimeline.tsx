'use client'

import { format } from 'date-fns'
import type { Step } from '@/types'

interface SequenceTimelineProps {
  steps: Step[]
}

export function SequenceTimeline({ steps }: SequenceTimelineProps) {
  if (steps.length === 0) return null

  return (
    <div className="flex items-start px-4 py-4 overflow-x-auto gap-0" style={{ scrollbarWidth: 'none' }}>
      {steps.map((step, i) => {
        const isDone = step.status === 'sent' || step.status === 'skipped'
        const isCurrent = step.status === 'due' || step.status === 'approved'
        const isLast = i === steps.length - 1

        const circleStyle = isDone
          ? { background: '#16A34A', borderColor: '#16A34A' }
          : isCurrent
          ? { background: '#fff', borderColor: '#2563EB', borderWidth: 2 }
          : { background: '#fff', borderColor: '#E5E3DF', borderWidth: 1.5 }

        const lineColor = isDone ? '#16A34A' : '#E5E3DF'

        return (
          <div key={step.id} className="flex items-start flex-shrink-0">
            {/* Step + label */}
            <div className="flex flex-col items-center gap-1.5" style={{ minWidth: 64 }}>
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold border"
                style={{ ...circleStyle, color: isDone ? '#fff' : isCurrent ? '#2563EB' : '#B8B5AE' }}
              >
                {isDone ? (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                ) : (
                  step.step_number
                )}
              </div>
              <div className="flex flex-col items-center gap-0.5">
                {step.scheduled_at && (
                  <span
                    className="font-mono text-center leading-tight"
                    style={{ fontSize: 9, color: 'var(--muted)' }}
                  >
                    {format(new Date(step.scheduled_at), 'MMM d')}
                  </span>
                )}
                <span
                  className="text-center leading-tight"
                  style={{ fontSize: 9, color: isDone ? '#16A34A' : isCurrent ? '#2563EB' : 'var(--hint)' }}
                >
                  {isDone ? 'Sent' : isCurrent ? 'Due' : 'Pending'}
                </span>
              </div>
            </div>

            {/* Connector line */}
            {!isLast && (
              <div
                className="h-0.5 mt-4 flex-shrink-0"
                style={{ width: 32, background: lineColor }}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}
