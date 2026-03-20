'use client'

import { useState } from 'react'
import { extractVariables } from '@/lib/templates'
import type { Template } from '@/types'

interface TemplateEditorProps {
  template?: Template
  onSave: (name: string, body: string) => Promise<void>
  onCancel: () => void
}

export function TemplateEditor({ template, onSave, onCancel }: TemplateEditorProps) {
  const [name, setName] = useState(template?.name ?? '')
  const [body, setBody] = useState(template?.body ?? '')
  const [saving, setSaving] = useState(false)

  const variables = extractVariables(body)

  async function handleSave() {
    if (!name.trim() || !body.trim()) return
    setSaving(true)
    try {
      await onSave(name.trim(), body.trim())
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <label className="text-xs font-semibold block mb-1.5" style={{ color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
          Template name
        </label>
        <input
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="e.g. Gentle nudge"
          className="w-full rounded-xl px-3.5 py-2.5 text-sm outline-none"
          style={{
            background: 'var(--surface2)',
            border: '1px solid rgba(0,0,0,0.10)',
            color: 'var(--text)',
          }}
        />
      </div>

      <div>
        <label className="text-xs font-semibold block mb-1.5" style={{ color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
          Message
        </label>
        <textarea
          value={body}
          onChange={e => setBody(e.target.value)}
          placeholder={`Hi {{name}}, just following up…`}
          rows={6}
          className="w-full rounded-xl px-3.5 py-2.5 text-sm resize-none outline-none leading-relaxed"
          style={{
            background: 'var(--surface2)',
            border: '1px solid rgba(0,0,0,0.10)',
            color: 'var(--text)',
          }}
        />
        <p className="text-xs mt-1.5" style={{ color: 'var(--hint)' }}>
          Variables: <span className="font-mono" style={{ color: 'var(--accent)' }}>{'{{name}}'}</span>,{' '}
          <span className="font-mono" style={{ color: 'var(--accent)' }}>{'{{subject}}'}</span>,{' '}
          <span className="font-mono" style={{ color: 'var(--accent)' }}>{'{{invoice}}'}</span>,{' '}
          <span className="font-mono" style={{ color: 'var(--accent)' }}>{'{{sender}}'}</span>
        </p>
      </div>

      {variables.length > 0 && (
        <div className="flex flex-wrap gap-1">
          <span className="text-xs" style={{ color: 'var(--muted)' }}>Detected:</span>
          {variables.map(v => (
            <span key={v} className="text-xs font-mono rounded px-1.5 py-0.5" style={{ background: '#EEF4FF', color: '#2563EB', fontSize: 10 }}>
              {`{{${v}}}`}
            </span>
          ))}
        </div>
      )}

      <div className="flex gap-2 pt-1">
        <button
          onClick={onCancel}
          className="flex-1 py-2.5 text-sm font-medium rounded-xl transition-opacity hover:opacity-80"
          style={{ background: 'var(--surface2)', color: 'var(--muted)', border: '1px solid rgba(0,0,0,0.10)' }}
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          disabled={!name.trim() || !body.trim() || saving}
          className="flex-1 py-2.5 text-sm font-semibold rounded-xl transition-opacity hover:opacity-85 disabled:opacity-50"
          style={{ background: '#2563EB', color: '#fff' }}
        >
          {saving ? 'Saving…' : template ? 'Save changes' : 'Create template'}
        </button>
      </div>
    </div>
  )
}
