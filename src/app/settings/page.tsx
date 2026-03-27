'use client'

import { useState, useEffect } from 'react'
import { AppShell } from '@/components/AppShell'
import { StepCard } from '@/components/setup/StepCard'
import { useSettings } from '@/hooks/useSettings'
import { useTemplates } from '@/hooks/useTemplates'
import type { StepDraft } from '@/types'

const DEFAULT_AUTO_STEP = (): StepDraft => ({
  step_number: 1,
  send_after_days: 3,
  time_unit: 'days',
  message_source: 'template',
  template_id: null,
  custom_body: '',
})

export default function SettingsPage() {
  const { settings, loading, saving, error, update } = useSettings()
  const { templates } = useTemplates()

  const [ccAddress, setCcAddress] = useState('')
  const [sendMode, setSendMode] = useState<'auto_send' | 'requires_approval'>('auto_send')
  const [notifications, setNotifications] = useState(true)
  const [autoEnabled, setAutoEnabled] = useState(false)
  const [autoSendMode, setAutoSendMode] = useState<'auto_send' | 'requires_approval'>('auto_send')
  const [autoSteps, setAutoSteps] = useState<StepDraft[]>([DEFAULT_AUTO_STEP()])
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (settings) {
      setCcAddress(settings.watched_cc_address)
      setSendMode(settings.default_send_mode)
      setNotifications(settings.notifications_enabled)
      setAutoEnabled(settings.auto_followup_enabled)
      setAutoSendMode(settings.auto_followup_send_mode)
      setAutoSteps(
        settings.auto_followup_steps?.length > 0
          ? settings.auto_followup_steps
          : [DEFAULT_AUTO_STEP()]
      )
    }
  }, [settings])

  // Set default template once templates load
  useEffect(() => {
    if (templates.length > 0 && autoSteps[0]?.template_id === null && autoSteps[0]?.message_source === 'template') {
      setAutoSteps(prev => prev.map((s, i) => i === 0 ? { ...s, template_id: templates[0].id } : s))
    }
  }, [templates])

  function handleStepChange(index: number, field: keyof StepDraft, value: unknown) {
    setAutoSteps(prev => prev.map((s, i) => i === index ? { ...s, [field]: value } : s))
  }

  function addStep() {
    if (autoSteps.length >= 5) return
    setAutoSteps(prev => [
      ...prev,
      { ...DEFAULT_AUTO_STEP(), step_number: prev.length + 1, template_id: templates[0]?.id ?? null },
    ])
  }

  function removeStep(index: number) {
    setAutoSteps(prev =>
      prev.filter((_, i) => i !== index).map((s, i) => ({ ...s, step_number: i + 1 }))
    )
  }

  async function handleSave() {
    const ok = await update({
      watched_cc_address: ccAddress.trim(),
      default_send_mode: sendMode,
      notifications_enabled: notifications,
      auto_followup_enabled: autoEnabled,
      auto_followup_send_mode: autoSendMode,
      auto_followup_steps: autoEnabled ? autoSteps : [],
    })
    if (ok) {
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    }
  }

  return (
    <AppShell>
      {/* Top bar */}
      <div
        className="flex items-center justify-between px-4 py-3.5"
        style={{ background: '#fff', borderBottom: '1px solid rgba(0,0,0,0.08)', minHeight: 52 }}
      >
        <span className="font-semibold" style={{ fontSize: 18, letterSpacing: '-0.02em' }}>Settings</span>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-6 pb-20 lg:pb-6 max-w-lg mx-auto w-full">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-5 h-5 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent' }} />
          </div>
        ) : (
          <div className="flex flex-col gap-6">

            {/* CC Address */}
            <div className="bg-white rounded-2xl p-5 flex flex-col gap-4" style={{ border: '1px solid rgba(0,0,0,0.08)' }}>
              <div>
                <p className="font-semibold text-sm" style={{ letterSpacing: '-0.01em' }}>Watched CC address</p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>
                  CC this address on any email you want Followr to track.
                </p>
              </div>
              <input
                type="email"
                value={ccAddress}
                onChange={e => setCcAddress(e.target.value)}
                placeholder="followup@yourcompany.com"
                className="w-full px-3.5 py-2.5 rounded-xl text-sm outline-none transition-all"
                style={{ border: '1.5px solid rgba(0,0,0,0.12)', background: 'var(--surface2)', fontFamily: 'inherit' }}
                onFocus={e => (e.target.style.borderColor = 'var(--accent)')}
                onBlur={e => (e.target.style.borderColor = 'rgba(0,0,0,0.12)')}
              />
              <p className="text-xs" style={{ color: 'var(--hint)' }}>
                You can use any email address you control — a Gmail alias, a shared inbox, or a forwarding address.
              </p>
            </div>

            {/* Default send mode */}
            <div className="bg-white rounded-2xl p-5 flex flex-col gap-4" style={{ border: '1px solid rgba(0,0,0,0.08)' }}>
              <div>
                <p className="font-semibold text-sm" style={{ letterSpacing: '-0.01em' }}>Default send mode</p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>
                  Applied to new threads unless overridden in setup.
                </p>
              </div>
              <div className="flex flex-col gap-2">
                {([
                  { value: 'auto_send' as const, label: 'Auto-send', desc: 'Follow-ups fire automatically on schedule.' },
                  { value: 'requires_approval' as const, label: 'Requires approval', desc: 'Each step waits for your review before sending.' },
                ] as const).map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => setSendMode(opt.value)}
                    className="flex items-start gap-3 px-4 py-3 rounded-xl text-left transition-all"
                    style={{
                      border: sendMode === opt.value ? '1.5px solid var(--accent)' : '1.5px solid rgba(0,0,0,0.10)',
                      background: sendMode === opt.value ? 'var(--accent-bg)' : '#fff',
                    }}
                  >
                    <span className="mt-0.5 w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center" style={{ borderColor: sendMode === opt.value ? 'var(--accent)' : 'rgba(0,0,0,0.2)' }}>
                      {sendMode === opt.value && <span className="w-2 h-2 rounded-full" style={{ background: 'var(--accent)' }} />}
                    </span>
                    <div>
                      <p className="text-sm font-medium" style={{ color: sendMode === opt.value ? 'var(--accent)' : 'var(--text)' }}>{opt.label}</p>
                      <p className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>{opt.desc}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* ── Auto Follow-up ── */}
            <div className="bg-white rounded-2xl p-5 flex flex-col gap-4" style={{ border: '1px solid rgba(0,0,0,0.08)' }}>
              {/* Header + toggle */}
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-semibold text-sm" style={{ letterSpacing: '-0.01em' }}>Auto follow-up</p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>
                    When on, every new CC'd email automatically starts the sequence below — no setup needed.
                  </p>
                </div>
                <button
                  onClick={() => setAutoEnabled(v => !v)}
                  className="relative flex-shrink-0 w-11 h-6 rounded-full transition-colors"
                  style={{ background: autoEnabled ? 'var(--accent)' : 'rgba(0,0,0,0.15)' }}
                >
                  <span
                    className="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform"
                    style={{ transform: autoEnabled ? 'translateX(20px)' : 'translateX(0)' }}
                  />
                </button>
              </div>

              {autoEnabled && (
                <div className="flex flex-col gap-4 pt-1">
                  {/* Send mode for auto */}
                  <div>
                    <p className="text-xs font-medium mb-2" style={{ color: 'var(--muted)' }}>Send mode for auto follow-ups</p>
                    <div className="flex rounded-lg overflow-hidden" style={{ border: '1px solid rgba(0,0,0,0.10)', background: 'var(--surface2)' }}>
                      {([
                        { value: 'auto_send' as const, label: 'Auto-send' },
                        { value: 'requires_approval' as const, label: 'Needs approval' },
                      ] as const).map(opt => (
                        <button
                          key={opt.value}
                          onClick={() => setAutoSendMode(opt.value)}
                          className="flex-1 py-2 text-xs font-medium transition-all"
                          style={
                            autoSendMode === opt.value
                              ? { background: '#fff', color: 'var(--text)', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }
                              : { background: 'transparent', color: 'var(--muted)' }
                          }
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Step cards */}
                  <div className="flex flex-col gap-3">
                    <p className="text-xs font-medium" style={{ color: 'var(--muted)' }}>Default follow-up steps</p>
                    {autoSteps.map((step, i) => (
                      <StepCard
                        key={i}
                        step={step}
                        index={i}
                        templates={templates}
                        onChange={handleStepChange}
                        onRemove={removeStep}
                      />
                    ))}
                    {autoSteps.length < 5 && (
                      <button
                        onClick={addStep}
                        className="py-3 text-sm font-medium rounded-xl transition-all hover:bg-accent-bg"
                        style={{ border: '1.5px dashed rgba(0,0,0,0.15)', color: 'var(--muted)', background: 'transparent' }}
                      >
                        + Add another step
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Notifications */}
            <div className="bg-white rounded-2xl p-5" style={{ border: '1px solid rgba(0,0,0,0.08)' }}>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="font-semibold text-sm" style={{ letterSpacing: '-0.01em' }}>Push notifications</p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>
                    Get notified when a thread becomes overdue.
                  </p>
                </div>
                <button
                  onClick={() => setNotifications(v => !v)}
                  className="relative flex-shrink-0 w-11 h-6 rounded-full transition-colors"
                  style={{ background: notifications ? 'var(--accent)' : 'rgba(0,0,0,0.15)' }}
                >
                  <span
                    className="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform"
                    style={{ transform: notifications ? 'translateX(20px)' : 'translateX(0)' }}
                  />
                </button>
              </div>
            </div>

            {/* Save */}
            <div className="flex items-center gap-3">
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-5 py-2.5 rounded-xl text-sm font-medium transition-all"
                style={{
                  background: !saving ? 'var(--accent)' : 'rgba(0,0,0,0.08)',
                  color: !saving ? '#fff' : 'var(--muted)',
                  cursor: !saving ? 'pointer' : 'not-allowed',
                }}
              >
                {saving ? 'Saving…' : 'Save changes'}
              </button>
              {saved && <span className="text-sm" style={{ color: '#16a34a' }}>Saved!</span>}
              {error && <span className="text-sm" style={{ color: '#dc2626' }}>{error}</span>}
            </div>

          </div>
        )}
      </div>
    </AppShell>
  )
}
