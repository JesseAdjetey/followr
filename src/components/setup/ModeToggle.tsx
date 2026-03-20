'use client'

import type { SendMode } from '@/types'

interface ModeToggleProps {
  value: SendMode
  onChange: (mode: SendMode) => void
}

export function ModeToggle({ value, onChange }: ModeToggleProps) {
  return (
    <div className="flex rounded-xl overflow-hidden" style={{ border: '1px solid rgba(0,0,0,0.12)', background: 'var(--surface2)' }}>
      <button
        onClick={() => onChange('auto_send')}
        className="flex-1 py-2.5 text-sm font-medium transition-all"
        style={
          value === 'auto_send'
            ? { background: '#2563EB', color: '#fff' }
            : { background: 'transparent', color: 'var(--muted)' }
        }
      >
        Auto-send
      </button>
      <button
        onClick={() => onChange('requires_approval')}
        className="flex-1 py-2.5 text-sm font-medium transition-all"
        style={
          value === 'requires_approval'
            ? { background: '#2563EB', color: '#fff' }
            : { background: 'transparent', color: 'var(--muted)' }
        }
      >
        Needs approval
      </button>
    </div>
  )
}
