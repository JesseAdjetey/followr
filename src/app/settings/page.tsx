'use client'

import { useState, useEffect } from 'react'
import { AppShell } from '@/components/AppShell'
import { useSettings } from '@/hooks/useSettings'

export default function SettingsPage() {
  const { settings, loading, saving, error, update } = useSettings()
  const [ccAddress, setCcAddress] = useState('')
  const [sendMode, setSendMode] = useState<'auto_send' | 'requires_approval'>('auto_send')
  const [notifications, setNotifications] = useState(true)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (settings) {
      setCcAddress(settings.watched_cc_address)
      setSendMode(settings.default_send_mode)
      setNotifications(settings.notifications_enabled)
    }
  }, [settings])

  async function handleSave() {
    const ok = await update({
      watched_cc_address: ccAddress.trim(),
      default_send_mode: sendMode,
      notifications_enabled: notifications,
    })
    if (ok) {
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    }
  }

  const isDirty = settings
    ? ccAddress !== settings.watched_cc_address ||
      sendMode !== settings.default_send_mode ||
      notifications !== settings.notifications_enabled
    : false

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
            <div
              className="bg-white rounded-2xl p-5 flex flex-col gap-4"
              style={{ border: '1px solid rgba(0,0,0,0.08)' }}
            >
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
                style={{
                  border: '1.5px solid rgba(0,0,0,0.12)',
                  background: 'var(--surface2)',
                  fontFamily: 'inherit',
                }}
                onFocus={e => (e.target.style.borderColor = 'var(--accent)')}
                onBlur={e => (e.target.style.borderColor = 'rgba(0,0,0,0.12)')}
              />

              <p className="text-xs" style={{ color: 'var(--hint)' }}>
                You can use any email address you control — a Gmail alias, a shared inbox, or a forwarding address.
              </p>
            </div>

            {/* Default send mode */}
            <div
              className="bg-white rounded-2xl p-5 flex flex-col gap-4"
              style={{ border: '1px solid rgba(0,0,0,0.08)' }}
            >
              <div>
                <p className="font-semibold text-sm" style={{ letterSpacing: '-0.01em' }}>Default send mode</p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>
                  Applied to new threads unless overridden in setup.
                </p>
              </div>

              <div className="flex flex-col gap-2">
                {[
                  {
                    value: 'auto_send' as const,
                    label: 'Auto-send',
                    desc: 'Follow-ups fire automatically on schedule.',
                  },
                  {
                    value: 'requires_approval' as const,
                    label: 'Requires approval',
                    desc: 'Each step waits for your review before sending.',
                  },
                ].map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => setSendMode(opt.value)}
                    className="flex items-start gap-3 px-4 py-3 rounded-xl text-left transition-all"
                    style={{
                      border: sendMode === opt.value ? '1.5px solid var(--accent)' : '1.5px solid rgba(0,0,0,0.10)',
                      background: sendMode === opt.value ? 'var(--accent-bg)' : '#fff',
                    }}
                  >
                    <span
                      className="mt-0.5 w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center"
                      style={{ borderColor: sendMode === opt.value ? 'var(--accent)' : 'rgba(0,0,0,0.2)' }}
                    >
                      {sendMode === opt.value && (
                        <span className="w-2 h-2 rounded-full" style={{ background: 'var(--accent)' }} />
                      )}
                    </span>
                    <div>
                      <p className="text-sm font-medium" style={{ color: sendMode === opt.value ? 'var(--accent)' : 'var(--text)' }}>
                        {opt.label}
                      </p>
                      <p className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>{opt.desc}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Notifications */}
            <div
              className="bg-white rounded-2xl p-5"
              style={{ border: '1px solid rgba(0,0,0,0.08)' }}
            >
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

            {/* Save button */}
            <div className="flex items-center gap-3">
              <button
                onClick={handleSave}
                disabled={!isDirty || saving}
                className="px-5 py-2.5 rounded-xl text-sm font-medium transition-all"
                style={{
                  background: isDirty && !saving ? 'var(--accent)' : 'rgba(0,0,0,0.08)',
                  color: isDirty && !saving ? '#fff' : 'var(--muted)',
                  cursor: isDirty && !saving ? 'pointer' : 'not-allowed',
                }}
              >
                {saving ? 'Saving…' : 'Save changes'}
              </button>

              {saved && (
                <span className="text-sm" style={{ color: '#16a34a' }}>Saved!</span>
              )}
              {error && (
                <span className="text-sm" style={{ color: '#dc2626' }}>{error}</span>
              )}
            </div>
          </div>
        )}
      </div>
    </AppShell>
  )
}
