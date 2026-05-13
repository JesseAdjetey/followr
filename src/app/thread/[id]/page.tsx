'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { AppShell } from '@/components/AppShell'
import { SequenceTimeline } from '@/components/detail/SequenceTimeline'
import { GhostCard } from '@/components/detail/GhostCard'
import { ThreadBubble } from '@/components/detail/ThreadBubble'
import { Avatar } from '@/components/ui/Avatar'
import { Pill } from '@/components/ui/Pill'
import { Skeleton } from '@/components/ui/Skeleton'
import { enrichThread, getStatusLabel } from '@/lib/urgency'
import type { ThreadWithUrgency } from '@/types'

export default function ThreadDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [thread, setThread] = useState<ThreadWithUrgency | null>(null)
  const [loading, setLoading] = useState(true)
  const [approving, setApproving] = useState(false)

  useEffect(() => {
    async function load() {
      const res = await fetch(`/api/threads/${params.id}`)
      if (!res.ok) { router.push('/'); return }
      const data = await res.json()
      setThread(enrichThread(data))
      setLoading(false)
    }
    load()
  }, [params.id, router])

  async function handleApprove() {
    if (!thread) return
    setApproving(true)
    try {
      const res = await fetch(`/api/threads/${thread.id}/approve`, { method: 'POST' })
      if (res.ok) {
        const updated = await fetch(`/api/threads/${thread.id}`)
        if (updated.ok) setThread(enrichThread(await updated.json()))
      }
    } finally {
      setApproving(false)
    }
  }

  async function handleSnooze() {
    if (!thread) return
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    tomorrow.setHours(9, 0, 0, 0)
    await fetch(`/api/threads/${thread.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'snoozed', snoozed_until: tomorrow.toISOString() }),
    })
    router.push('/')
  }

  async function handleStop() {
    if (!thread || !confirm('Stop all follow-ups for this thread?')) return
    await fetch(`/api/threads/${thread.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'completed' }),
    })
    router.push('/')
  }

  if (loading) {
    return (
      <AppShell>
        <div className="flex flex-col h-full overflow-hidden" style={{ background: 'var(--bg)' }}>
          {/* Skeleton top bar */}
          <div className="flex items-center justify-between px-4 py-3 relative" style={{ minHeight: 52 }}>
            <Skeleton className="h-4 w-12" />
            <Skeleton className="h-7 w-40 rounded-lg" style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)' }} />
            <Skeleton className="h-5 w-16 rounded-full" />
          </div>

          {/* Skeleton timeline */}
          <div className="flex items-start px-4 py-4 gap-8">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex flex-col items-center gap-2">
                <Skeleton className="w-8 h-8 rounded-full" style={{ borderRadius: '50%' }} />
                <Skeleton className="h-2.5 w-10" />
              </div>
            ))}
          </div>

          {/* Skeleton contact card */}
          <div className="mx-4 mt-2 rounded-xl p-3 flex items-center gap-3" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <Skeleton className="w-9 h-9 rounded-full flex-shrink-0" style={{ borderRadius: '50%' }} />
            <div className="flex flex-col gap-1.5 flex-1">
              <Skeleton className="h-3.5 w-36" />
              <Skeleton className="h-2.5 w-48" />
            </div>
          </div>

          {/* Skeleton bubbles */}
          <div className="flex flex-col gap-3 px-4 mt-4">
            <div className="flex justify-start">
              <Skeleton className="h-16 rounded-xl" style={{ width: '70%' }} />
            </div>
            <div className="flex justify-end">
              <Skeleton className="h-12 rounded-xl" style={{ width: '60%' }} />
            </div>
            <div className="flex justify-start">
              <Skeleton className="h-20 rounded-xl" style={{ width: '75%' }} />
            </div>
          </div>
        </div>
      </AppShell>
    )
  }

  if (!thread) return null

  const steps = thread.steps ?? []
  const sentSteps = steps.filter(s => s.status === 'sent')
  const pendingSteps = steps.filter(s => s.status === 'pending' || s.status === 'due' || s.status === 'approved')
  const statusLabel = getStatusLabel(thread)

  const pillStatus = thread.urgency === 'overdue' ? 'overdue' :
    thread.urgency === 'today' ? 'needs_approval' :
    thread.status === 'replied' ? 'replied' :
    thread.status === 'completed' ? 'completed' : 'waiting'

  return (
    <AppShell>
      <div className="flex flex-col h-full overflow-hidden" style={{ background: 'var(--bg)' }}>
        {/* Top bar — back left, title centered, status right */}
        <div
          className="flex items-center justify-between px-4 py-3 relative"
          style={{ background: 'var(--bg)', minHeight: 52 }}
        >
          <button
            onClick={() => router.push('/')}
            className="text-xs flex items-center gap-1 font-bold flex-shrink-0 z-10"
            style={{ color: 'var(--accent)' }}
          >
            ← Back
          </button>

          {/* Centered title pill — max 50% of content area */}
          <div
            style={{
              position: 'absolute',
              left: '50%',
              transform: 'translateX(-50%)',
              maxWidth: '50%',
              zIndex: 0,
            }}
          >
            <div
              className="flex items-center px-3.5 py-1.5 rounded-lg"
              style={{
                border: '1px solid var(--border2)',
                background: 'var(--surface)',
                maxWidth: '100%',
              }}
            >
              <span
                className="text-xs font-bold truncate"
                style={{ color: 'var(--text)', letterSpacing: '0.01em' }}
              >
                {thread.subject || '(no subject)'}
              </span>
            </div>
          </div>

          <div className="flex-shrink-0 z-10">
            <Pill label={statusLabel} status={pillStatus} />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto pb-20 lg:pb-4">
          {/* Sequence timeline */}
          <div style={{ background: 'var(--bg)' }}>
            <SequenceTimeline steps={steps.sort((a, b) => a.step_number - b.step_number)} />
          </div>

          {/* Contact bar */}
          <div
            className="flex items-center gap-3 px-4 py-3 mx-4 mt-4 rounded-xl"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
          >
            <Avatar name={thread.recipient_name || thread.recipient_email} />
            <div className="flex-1 min-w-0">
              <p className="font-bold text-sm">{thread.recipient_name || thread.recipient_email}</p>
              <p className="text-xs font-mono truncate" style={{ color: 'var(--muted)', fontSize: 10 }}>
                {thread.recipient_email}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleSnooze}
                className="text-xs px-3 py-1.5 rounded-lg font-bold"
                style={{ background: 'var(--surface2)', color: 'var(--muted)', border: '1px solid var(--border)' }}
              >
                Snooze
              </button>
              <button
                onClick={handleStop}
                className="text-xs px-3 py-1.5 rounded-lg font-bold"
                style={{ background: 'var(--red-bg)', color: '#DC2626' }}
              >
                Stop
              </button>
            </div>
          </div>

          {/* Thread conversation */}
          <div className="flex flex-col gap-3 px-4 mt-4">
            <ThreadBubble
              body={thread.email_snippet || '(original email)'}
              sentAt={thread.email_date}
              direction="received"
              senderName={thread.recipient_name || thread.recipient_email}
            />

            {sentSteps.map(step => (
              step.resolved_body && (
                <ThreadBubble
                  key={step.id}
                  body={step.resolved_body}
                  sentAt={step.sent_at!}
                  direction="sent"
                />
              )
            ))}

            {pendingSteps.length > 0 && (
              <div className="flex items-center gap-3 my-1">
                <div className="flex-1 h-px" style={{ background: 'var(--border)' }} />
                <span className="text-xs font-mono" style={{ color: 'var(--hint)', fontSize: 10 }}>
                  Now · {format(new Date(), 'MMM d')}
                </span>
                <div className="flex-1 h-px" style={{ background: 'var(--border)' }} />
              </div>
            )}

            {pendingSteps.map(step => (
              <GhostCard
                key={step.id}
                step={step}
                threadId={thread.gmail_thread_id}
                onApprove={
                  thread.send_mode === 'requires_approval' && (step.status === 'due' || step.status === 'approved')
                    ? handleApprove
                    : undefined
                }
                isApproving={approving}
              />
            ))}

            {thread.status === 'replied' && (
              <div
                className="rounded-xl p-3.5 text-xs text-center font-bold"
                style={{ background: '#F0FDF4', color: '#16A34A' }}
              >
                Recipient replied — sequence paused ✓
              </div>
            )}

            {thread.status === 'completed' && (
              <div
                className="rounded-xl p-3.5 text-xs text-center font-bold"
                style={{ background: 'var(--surface2)', color: 'var(--muted)' }}
              >
                All follow-ups sent
              </div>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  )
}
