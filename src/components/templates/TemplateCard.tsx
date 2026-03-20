'use client'

import type { Template } from '@/types'

interface TemplateCardProps {
  template: Template
  onEdit: () => void
  onDuplicate: () => void
  onDelete: () => void
}

const VAR_REGEX = /\{\{(\w+)\}\}/g

function highlightVars(text: string) {
  const parts: (string | JSX.Element)[] = []
  let last = 0
  let match: RegExpExecArray | null

  VAR_REGEX.lastIndex = 0
  while ((match = VAR_REGEX.exec(text)) !== null) {
    if (match.index > last) parts.push(text.slice(last, match.index))
    parts.push(
      <span
        key={match.index}
        className="rounded px-0.5 font-mono font-medium"
        style={{ background: '#EEF4FF', color: '#2563EB', fontSize: '0.85em' }}
      >
        {match[0]}
      </span>
    )
    last = match.index + match[0].length
  }
  if (last < text.length) parts.push(text.slice(last))
  return parts
}

export function TemplateCard({ template, onEdit, onDuplicate, onDelete }: TemplateCardProps) {
  const preview = template.body.slice(0, 150)

  return (
    <div
      className="rounded-xl p-4 flex flex-col gap-2.5 transition-all hover:shadow-sm"
      style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.08)' }}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="font-semibold text-sm" style={{ letterSpacing: '-0.01em' }}>{template.name}</p>
        <div className="flex gap-2 flex-shrink-0">
          <button onClick={onEdit} className="text-xs" style={{ color: 'var(--accent)' }}>Edit</button>
          <button onClick={onDuplicate} className="text-xs" style={{ color: 'var(--muted)' }}>Duplicate</button>
          <button onClick={onDelete} className="text-xs" style={{ color: '#DC2626' }}>Delete</button>
        </div>
      </div>

      <p className="text-xs leading-relaxed" style={{ color: 'var(--muted)' }}>
        {highlightVars(preview)}
        {template.body.length > 150 && '…'}
      </p>

      {template.variables.length > 0 && (
        <div className="flex flex-wrap gap-1 pt-0.5">
          {template.variables.map(v => (
            <span
              key={v}
              className="text-xs font-mono rounded px-1.5 py-0.5"
              style={{ background: '#EEF4FF', color: '#2563EB', fontSize: 10 }}
            >
              {`{{${v}}}`}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
