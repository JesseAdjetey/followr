import { format } from 'date-fns'
import type { Thread } from '@/types'

interface EmailPreviewProps {
  thread: Thread
}

export function EmailPreview({ thread }: EmailPreviewProps) {
  return (
    <div
      className="rounded-xl p-4 flex flex-col gap-2"
      style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.08)' }}
    >
      <p className="font-semibold text-sm leading-tight" style={{ letterSpacing: '-0.01em' }}>
        {thread.subject || '(no subject)'}
      </p>
      <div className="flex items-center gap-1.5">
        <span className="text-xs" style={{ color: 'var(--muted)' }}>From</span>
        <span className="text-xs font-medium">{thread.sender_name || thread.sender_email}</span>
        <span className="text-xs font-mono" style={{ color: 'var(--hint)', fontSize: 10 }}>
          {thread.sender_email}
        </span>
      </div>
      <div className="flex items-center gap-1.5">
        <span className="text-xs" style={{ color: 'var(--muted)' }}>To</span>
        <span className="text-xs font-medium">{thread.recipient_name || thread.recipient_email}</span>
        <span className="text-xs font-mono" style={{ color: 'var(--hint)', fontSize: 10 }}>
          {thread.recipient_email}
        </span>
      </div>
      <div style={{ borderTop: '1px solid rgba(0,0,0,0.06)', paddingTop: 8, marginTop: 4 }}>
        <p className="text-xs leading-relaxed" style={{ color: 'var(--muted)' }}>
          {thread.email_snippet || 'No preview available'}
        </p>
      </div>
      <p className="text-xs font-mono" style={{ color: 'var(--hint)', fontSize: 10 }}>
        {format(new Date(thread.email_date), 'MMM d, yyyy · h:mm a')}
      </p>
    </div>
  )
}
