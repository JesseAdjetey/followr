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
import { enrichThread, getStatusLabel } from '@/lib/urgency'
import type { Thread, Step, ThreadWithUrgency } from '@/types'

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
        // Reload thread
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
        <div className="flex items-center justify-center h-full">
          <div className="w-5 h-5 rounded-full border-2 border-accent border-t-transparent animate-spin" />
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
        {/* Top bar */}
        <div
          className="flex items-center gap-3 px-4 py-3"
          style={{ background: '#fff', borderBottom: '1px solid rgba(0,0,0,0.08)' }}
        >
          <button
            onClick={() => router.push('/')}
            className="text-sm flex items-center gap-1 font-medium"
            style={{ color: '#2563EB' }}
          >
            ← Back
          </button>
          <p className="flex-1 font-semibold text-sm truncate" style={{ letterSpacing: '-0.01em' }}>
            {thread.subject || '(no subject)'}
          </p>
          <Pill label={statusLabel} status={pillStatus} />
        </div>

        <div className="flex-1 overflow-y-auto pb-20 lg:pb-4">
          {/* Sequence timeline */}
          <div style={{ background: '#fff', borderBottom: '1px solid rgba(0,0,0,0.08)' }}>
            <SequenceTimeline steps={steps.sort((a, b) => a.step_number - b.step_number)} />
          </div>

          {/* Contact bar */}
          <div
            className="flex items-center gap-3 px-4 py-3 mx-4 mt-4 rounded-xl"
            style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.08)' }}
          >
            <Avatar name={thread.recipient_name || thread.recipient_email} />
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm">{thread.recipient_name || thread.recipient_email}</p>
              <p className="text-xs font-mono truncate" style={{ color: 'var(--muted)', fontSize: 10 }}>
                {thread.recipient_email}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleSnooze}
                className="text-xs px-3 py-1.5 rounded-lg font-medium"
                style={{ background: 'var(--surface2)', color: 'var(--muted)', border: '1px solid rgba(0,0,0,0.10)' }}
              >
                Snooze
              </button>
              <button
                onClick={handleStop}
                className="text-xs px-3 py-1.5 rounded-lg font-medium"
                style={{ background: '#FEF2F2', color: '#DC2626' }}
              >
                Stop
              </button>
            </div>
          </div>

          {/* Thread conversation */}
          <div className="flex flex-col gap-3 px-4 mt-4">
            {/* Original email */}
            <ThreadBubble
              body={thread.email_snippet || '(original email)'}
              sentAt={thread.email_date}
              direction="received"
              senderName={thread.recipient_name || thread.recipient_email}
            />

            {/* Sent follow-ups */}
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

            {/* "Now" divider */}
            {pendingSteps.length > 0 && (
              <div className="flex items-center gap-3 my-1">
                <div className="flex-1 h-px" style={{ background: 'rgba(0,0,0,0.08)' }} />
                <span className="text-xs font-mono" style={{ color: 'var(--hint)', fontSize: 10 }}>
                  Now · {format(new Date(), 'MMM d')}
                </span>
                <div className="flex-1 h-px" style={{ background: 'rgba(0,0,0,0.08)' }} />
              </div>
            )}

            {/* Pending ghost cards */}
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

            {/* Replied notice */}
            {thread.status === 'replied' && (
              <div
                className="rounded-xl p-3.5 text-sm text-center font-medium"
                style={{ background: '#F0FDF4', color: '#16A34A' }}
              >
                Recipient replied — sequence paused ✓
              </div>
            )}

            {thread.status === 'completed' && (
              <div
                className="rounded-xl p-3.5 text-sm text-center font-medium"
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
