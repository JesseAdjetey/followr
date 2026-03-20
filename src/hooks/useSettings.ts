'use client'

import { useState, useEffect, useCallback } from 'react'

export interface UserSettings {
  watched_cc_address: string
  default_send_mode: 'auto_send' | 'requires_approval'
  notifications_enabled: boolean
}

export function useSettings() {
  const [settings, setSettings] = useState<UserSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/settings')
      .then(r => r.json())
      .then(data => {
        if (!data.error) setSettings(data)
        else setError(data.error)
      })
      .catch(() => setError('Failed to load settings'))
      .finally(() => setLoading(false))
  }, [])

  const update = useCallback(async (patch: Partial<UserSettings>) => {
    setSaving(true)
    setError(null)
    try {
      const res = await fetch('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setSettings(data)
      return true
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to save')
      return false
    } finally {
      setSaving(false)
    }
  }, [])

  return { settings, loading, saving, error, update }
}
