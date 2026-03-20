'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { AppShell } from '@/components/AppShell'
import { EmailPreview } from '@/components/setup/EmailPreview'
import { ModeToggle } from '@/components/setup/ModeToggle'
import { StepCard } from '@/components/setup/StepCard'
import { useTemplates } from '@/hooks/useTemplates'
import type { Thread, StepDraft, SendMode } from '@/types'

const DEFAULT_STEP = (): StepDraft => ({
  step_number: 1,
  send_after_days: 3,
  time_unit: 'days',
  message_source: 'template',
  template_id: null,
  custom_body: '',
})

export default function SetupPage() {
  const params = useParams()
  const router = useRouter()
  const { templates, loading: templatesLoading } = useTemplates()

  const [thread, setThread] = useState<Thread | null>(null)
  const [loading, setLoading] = useState(true)
  const [sendMode, setSendMode] = useState<SendMode>('auto_send')
  const [steps, setSteps] = useState<StepDraft[]>([DEFAULT_STEP()])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    async function load() {
      // Find thread by gmail_thread_id
      const res = await fetch('/api/threads')
      if (!res.ok) { setLoading(false); return }
      const all: Thread[] = await res.json()
      const found = all.find(t => t.gmail_thread_id === params.gmailThreadId)
      if (!found) { router.push('/'); return }
      setThread(found)
      setSendMode(found.send_mode)
      setLoading(false)
    }
    load()
  }, [params.gmailThreadId, router])

  // Set default template_id once templates load
  useEffect(() => {
    if (templates.length > 0 && steps[0].template_id === null && steps[0].message_source === 'template') {
      setSteps(prev => prev.map((s, i) => i === 0 ? { ...s, template_id: templates[0].id } : s))
    }
  }, [templates])

  function handleStepChange(index: number, field: keyof StepDraft, value: unknown) {
    setSteps(prev => prev.map((s, i) => i === index ? { ...s, [field]: value } : s))
  }

  function addStep() {
    if (steps.length >= 5) return
    setSteps(prev => [
      ...prev,
      {
        ...DEFAULT_STEP(),
        step_number: prev.length + 1,
        template_id: templates[0]?.id ?? null,
      },
    ])
  }

  function removeStep(index: number) {
    setSteps(prev =>
      prev.filter((_, i) => i !== index).map((s, i) => ({ ...s, step_number: i + 1 }))
    )
  }

  async function handleActivate() {
    if (!thread) return
    setSaving(true)
    try {
      const res = await fetch('/api/threads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ threadId: thread.id, sendMode, steps }),
      })
      if (res.ok) router.push('/')
    } finally {
      setSaving(false)
    }
  }

  if (loading || templatesLoading) {
    return (
      <AppShell>
        <div className="flex items-center justify-center h-full">
          <div className="w-5 h-5 rounded-full border-2 border-accent border-t-transparent animate-spin" />
        </div>
      </AppShell>
    )
  }

  if (!thread) return null

  return (
    <AppShell>
      <div className="flex flex-col h-full overflow-hidden" style={{ background: 'var(--bg)' }}>
        {/* Top bar */}
        <div
          className="flex items-center gap-3 px-4 py-3"
          style={{ background: '#fff', borderBottom: '1px solid rgba(0,0,0,0.08)' }}
        >
          <button
            onClick={() => router.push('/')}
            className="text-sm font-medium"
            style={{ color: '#2563EB' }}
          >
            ← Back
          </button>
          <p className="flex-1 font-semibold text-sm truncate" style={{ letterSpacing: '-0.01em' }}>
            Set up follow-ups
          </p>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto px-4 py-4 pb-32 flex flex-col gap-4">
          {/* Email preview */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: 'var(--hint)', letterSpacing: '0.07em' }}>
              Original email
            </p>
            <EmailPreview thread={thread} />
          </div>

          {/* Send mode */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: 'var(--hint)', letterSpacing: '0.07em' }}>
              Send mode
            </p>
            <ModeToggle value={sendMode} onChange={setSendMode} />
            <p className="text-xs mt-1.5" style={{ color: 'var(--hint)' }}>
              {sendMode === 'auto_send'
                ? 'Follow-ups send automatically on schedule.'
                : 'Each follow-up waits for your approval before sending.'}
            </p>
          </div>

          {/* Step cards */}
          <div className="flex flex-col gap-3">
            <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--hint)', letterSpacing: '0.07em' }}>
              Follow-up steps
            </p>
            {steps.map((step, i) => (
              <StepCard
                key={i}
                step={step}
                index={i}
                templates={templates}
                onChange={handleStepChange}
                onRemove={removeStep}
              />
            ))}

            {/* Add step button */}
            {steps.length < 5 && (
              <button
                onClick={addStep}
                className="py-3 text-sm font-medium rounded-xl transition-all hover:bg-accent-bg"
                style={{
                  border: '1.5px dashed rgba(0,0,0,0.15)',
                  color: 'var(--muted)',
                  background: 'transparent',
                }}
              >
                + Add another follow-up step
              </button>
            )}
          </div>
        </div>

        {/* Fixed footer */}
        <div
          className="fixed bottom-0 left-0 right-0 lg:relative flex gap-3 px-4 py-3"
          style={{ background: '#fff', borderTop: '1px solid rgba(0,0,0,0.08)', paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}
        >
          <button
            onClick={() => router.push('/')}
            className="flex-1 py-3 text-sm font-medium rounded-xl transition-opacity hover:opacity-80"
            style={{ background: 'var(--surface2)', color: 'var(--muted)', border: '1px solid rgba(0,0,0,0.10)' }}
          >
            Skip for now
          </button>
          <button
            onClick={handleActivate}
            disabled={saving}
            className="flex-1 py-3 text-sm font-semibold rounded-xl transition-opacity hover:opacity-85 disabled:opacity-50"
            style={{ background: '#2563EB', color: '#fff' }}
          >
            {saving ? 'Activating…' : 'Activate follow-ups'}
          </button>
        </div>
      </div>
    </AppShell>
  )
}
