'use client'

import type { Template, StepDraft } from '@/types'

interface StepCardProps {
  step: StepDraft
  index: number
  templates: Template[]
  onChange: (index: number, field: keyof StepDraft, value: unknown) => void
  onRemove: (index: number) => void
}

export function StepCard({ step, index, templates, onChange, onRemove }: StepCardProps) {
  return (
    <div
      className="rounded-xl p-4 flex flex-col gap-3"
      style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.08)' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--muted)', letterSpacing: '0.07em' }}>
          Follow-up {step.step_number}
        </span>
        {index > 0 && (
          <button
            onClick={() => onRemove(index)}
            className="text-xs"
            style={{ color: 'var(--muted)' }}
          >
            Remove
          </button>
        )}
      </div>

      {/* Timing */}
      <div>
        <label className="text-xs font-medium block mb-1.5" style={{ color: 'var(--muted)' }}>Send after</label>
        <div className="flex gap-2">
          <input
            type="number"
            min={1}
            max={365}
            value={step.send_after_days}
            onChange={e => onChange(index, 'send_after_days', parseInt(e.target.value) || 1)}
            className="rounded-lg px-3 py-2 text-sm font-medium w-20 outline-none"
            style={{
              background: 'var(--surface2)',
              border: '1px solid rgba(0,0,0,0.10)',
              color: 'var(--text)',
            }}
          />
          <select
            value={step.time_unit}
            onChange={e => onChange(index, 'time_unit', e.target.value)}
            className="rounded-lg px-3 py-2 text-sm font-medium flex-1 outline-none"
            style={{
              background: 'var(--surface2)',
              border: '1px solid rgba(0,0,0,0.10)',
              color: 'var(--text)',
            }}
          >
            <option value="days">days</option>
            <option value="weeks">weeks</option>
          </select>
        </div>
      </div>

      {/* Message source toggle */}
      <div>
        <label className="text-xs font-medium block mb-1.5" style={{ color: 'var(--muted)' }}>Message</label>
        <div
          className="flex rounded-lg overflow-hidden mb-2"
          style={{ border: '1px solid rgba(0,0,0,0.10)', background: 'var(--surface2)' }}
        >
          <button
            onClick={() => onChange(index, 'message_source', 'template')}
            className="flex-1 py-1.5 text-xs font-medium transition-all"
            style={
              step.message_source === 'template'
                ? { background: '#fff', color: 'var(--text)', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }
                : { background: 'transparent', color: 'var(--muted)' }
            }
          >
            Use template
          </button>
          <button
            onClick={() => onChange(index, 'message_source', 'custom')}
            className="flex-1 py-1.5 text-xs font-medium transition-all"
            style={
              step.message_source === 'custom'
                ? { background: '#fff', color: 'var(--text)', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }
                : { background: 'transparent', color: 'var(--muted)' }
            }
          >
            Write custom
          </button>
        </div>

        {step.message_source === 'template' ? (
          <select
            value={step.template_id ?? ''}
            onChange={e => onChange(index, 'template_id', e.target.value || null)}
            className="w-full rounded-lg px-3 py-2 text-sm outline-none"
            style={{
              background: 'var(--surface2)',
              border: '1px solid rgba(0,0,0,0.10)',
              color: step.template_id ? 'var(--text)' : 'var(--hint)',
            }}
          >
            <option value="">Select a template…</option>
            {templates.map(t => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        ) : (
          <textarea
            value={step.custom_body}
            onChange={e => onChange(index, 'custom_body', e.target.value)}
            placeholder={`Hi {{name}}, just following up on my previous email…`}
            rows={4}
            className="w-full rounded-lg px-3 py-2 text-sm resize-none outline-none leading-relaxed"
            style={{
              background: 'var(--surface2)',
              border: '1px solid rgba(0,0,0,0.10)',
              color: 'var(--text)',
            }}
          />
        )}
      </div>
    </div>
  )
}
