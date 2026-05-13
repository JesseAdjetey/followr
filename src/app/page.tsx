'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { AppShell } from '@/components/AppShell'
import { FilterTabs, type FilterTab } from '@/components/feed/FilterTabs'
import { ThreadCard } from '@/components/feed/ThreadCard'
import { NewEmailBanner } from '@/components/feed/NewEmailBanner'
import { useThreads } from '@/hooks/useThreads'
import { useSettings } from '@/hooks/useSettings'
import type { ThreadWithUrgency, UrgencyGroup } from '@/types'

const SECTION_LABELS: Record<string, string> = {
  overdue: 'Overdue',
  today: 'Due today',
  this_week: 'This week',
  later: 'Later',
  replied: 'Replied',
  completed: 'Completed',
}

const SECTION_ORDER: UrgencyGroup[] = ['overdue', 'today', 'this_week', 'later', 'replied', 'completed']

export default function FeedPage() {
  const router = useRouter()
  const { threads, loading, reload } = useThreads()
  const { settings } = useSettings()
  const [activeFilter, setActiveFilter] = useState<FilterTab>('all')
  const [syncing, setSyncing] = useState(false)

  async function handleSync() {
    setSyncing(true)
    try {
      await fetch('/api/gmail/sync', { method: 'POST' })
      await reload()
    } finally {
      setSyncing(false)
    }
  }

  const pendingSetup = threads.filter(t => t.status === 'pending_setup')
  const active = threads.filter(t => t.status !== 'pending_setup')

  const filtered = useMemo(() => {
    if (activeFilter === 'all') return active
    if (activeFilter === 'overdue') return active.filter(t => t.urgency === 'overdue')
    if (activeFilter === 'today') return active.filter(t => t.urgency === 'today')
    if (activeFilter === 'this_week') return active.filter(t => t.urgency === 'this_week')
    if (activeFilter === 'replied') return active.filter(t => t.status === 'replied')
    return active
  }, [active, activeFilter])

  const grouped = useMemo(() => {
    const map: Partial<Record<UrgencyGroup, ThreadWithUrgency[]>> = {}
    for (const t of filtered) {
      if (!map[t.urgency]) map[t.urgency] = []
      map[t.urgency]!.push(t)
    }
    return map
  }, [filtered])

  function handleCardClick(thread: ThreadWithUrgency) {
    router.push(`/thread/${thread.id}`)
  }

  return (
    <AppShell>
      {/* Top bar */}
      <div
        className="flex items-center justify-between px-4 py-3.5"
        style={{ background: 'var(--bg)', minHeight: 52 }}
      >
        <span className="font-semibold lg:hidden" style={{ fontSize: 18, letterSpacing: '-0.02em' }}>Followr</span>
        <span className="hidden lg:block font-semibold" style={{ fontSize: 18, letterSpacing: '-0.02em' }}>Feed</span>
        <div className="flex items-center gap-2">
          <button
            onClick={handleSync}
            disabled={syncing}
            className="text-xs font-medium px-2.5 py-1 rounded-full transition-opacity hover:opacity-70 flex items-center gap-1"
            style={{ background: 'var(--surface2)', color: 'var(--muted)', fontSize: 10, opacity: syncing ? 0.5 : 1 }}
            title="Sync Gmail now"
          >
            <svg
              width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
              style={{ transform: syncing ? 'rotate(360deg)' : undefined, transition: syncing ? 'transform 0.6s linear' : undefined }}
            >
              <path d="M23 4v6h-6"/><path d="M1 20v-6h6"/>
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
            </svg>
            {syncing ? 'Syncing…' : 'Sync'}
          </button>
          <Link
            href="/settings"
            className="text-xs font-mono px-2.5 py-1 rounded-full transition-opacity hover:opacity-70"
            style={{ background: 'var(--surface2)', color: 'var(--muted)', fontSize: 10 }}
          >
            {settings?.watched_cc_address || 'Set CC address →'}
          </Link>
        </div>
      </div>

      {/* New email banners */}
      {pendingSetup.map(t => (
        <NewEmailBanner key={t.id} thread={t} />
      ))}

      {/* Filter tabs */}
      <FilterTabs active={activeFilter} onChange={setActiveFilter} />

      {/* Thread list */}
      <div className="flex-1 overflow-y-auto px-4 py-3 pb-20 lg:pb-4 flex flex-col gap-2">
        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="w-5 h-5 rounded-full border-2 border-accent border-t-transparent animate-spin" />
          </div>
        )}

        {!loading && filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 gap-2">
            <p className="text-sm font-medium" style={{ color: 'var(--muted)' }}>No threads here</p>
            <p className="text-xs" style={{ color: 'var(--hint)' }}>
              CC your watched address on an email to get started
            </p>
          </div>
        )}

        {SECTION_ORDER.map(group => {
          const groupThreads = grouped[group]
          if (!groupThreads?.length) return null
          return (
            <div key={group}>
              <p
                className="text-xs font-semibold uppercase tracking-widest mb-2 mt-1"
                style={{ color: 'var(--hint)', letterSpacing: '0.07em' }}
              >
                {SECTION_LABELS[group]}
              </p>
              <div className="flex flex-col gap-2">
                {groupThreads.map(thread => (
                  <ThreadCard
                    key={thread.id}
                    thread={thread}
                    onClick={() => handleCardClick(thread)}
                  />
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </AppShell>
  )
}
