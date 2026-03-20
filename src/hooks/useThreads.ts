'use client'

import { useState, useEffect, useCallback } from 'react'
import { createBrowserSupabaseClient } from '@/lib/supabase'
import { enrichThread } from '@/lib/urgency'
import type { ThreadWithUrgency } from '@/types'

export function useThreads() {
  const [threads, setThreads] = useState<ThreadWithUrgency[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/threads')
      if (!res.ok) throw new Error(await res.text())
      const data = await res.json()
      setThreads(data.map(enrichThread))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load threads')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()

    // Realtime subscription
    const supabase = createBrowserSupabaseClient()
    const channel = supabase
      .channel('threads-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'threads' }, () => load())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'steps' }, () => load())
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [load])

  return { threads, loading, error, reload: load }
}
