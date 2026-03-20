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
  const { threads, loading } = useThreads()
  const { settings } = useSettings()
  const [activeFilter, setActiveFilter] = useState<FilterTab>('all')
  const [selectedId, setSelectedId] = useState<string | null>(null)

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
    setSelectedId(thread.id)
    router.push(`/thread/${thread.id}`)
  }

  const selectedThread = active.find(t => t.id === selectedId) ?? null

  // Detail panel content (desktop)
  const DetailPanel = selectedThread ? (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="px-5 py-4 border-b" style={{ borderColor: 'rgba(0,0,0,0.08)' }}>
        <p className="text-sm font-semibold leading-tight line-clamp-1" style={{ letterSpacing: '-0.01em' }}>
          {selectedThread.subject}
        </p>
        <p className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>
          {selectedThread.recipient_name || selectedThread.recipient_email}
        </p>
      </div>
      <div className="flex-1 flex items-center justify-center">
        <a
          href={`/thread/${selectedThread.id}`}
          className="text-sm font-medium"
          style={{ color: 'var(--accent)' }}
        >
          Open full view →
        </a>
      </div>
    </div>
  ) : (
    <div className="flex flex-col h-full items-center justify-center gap-2 px-8 text-center">
      <p className="text-sm font-medium" style={{ color: 'var(--muted)' }}>Select a thread to preview</p>
      <p className="text-xs" style={{ color: 'var(--hint)' }}>Click any thread card to see details</p>
    </div>
  )

  return (
    <AppShell rightPanel={DetailPanel}>
      {/* Top bar */}
      <div
        className="flex items-center justify-between px-4 py-3.5"
        style={{ background: '#fff', borderBottom: '1px solid rgba(0,0,0,0.08)', minHeight: 52 }}
      >
        <span className="font-semibold lg:hidden" style={{ fontSize: 18, letterSpacing: '-0.02em' }}>Followr</span>
        <span className="hidden lg:block font-semibold" style={{ fontSize: 18, letterSpacing: '-0.02em' }}>Feed</span>
        <Link
          href="/settings"
          className="text-xs font-mono px-2.5 py-1 rounded-full transition-opacity hover:opacity-70"
          style={{ background: 'var(--surface2)', color: 'var(--muted)', fontSize: 10 }}
        >
          {settings?.watched_cc_address || 'Set CC address →'}
        </Link>
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
                    selected={thread.id === selectedId}
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
