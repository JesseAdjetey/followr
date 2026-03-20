import { format } from 'date-fns'

interface ThreadBubbleProps {
  body: string
  sentAt: string
  direction: 'sent' | 'received'
  senderName?: string
}

export function ThreadBubble({ body, sentAt, direction, senderName }: ThreadBubbleProps) {
  const isSent = direction === 'sent'

  return (
    <div className={`flex ${isSent ? 'justify-end' : 'justify-start'}`}>
      <div style={{ maxWidth: '80%' }}>
        {!isSent && senderName && (
          <p className="text-xs mb-1 font-medium" style={{ color: 'var(--muted)' }}>{senderName}</p>
        )}
        <div
          className="rounded-xl px-3.5 py-2.5 text-sm leading-relaxed"
          style={{
            background: isSent ? '#2563EB' : '#fff',
            color: isSent ? '#fff' : 'var(--text)',
            border: isSent ? 'none' : '1px solid rgba(0,0,0,0.08)',
            whiteSpace: 'pre-wrap',
          }}
        >
          {body}
        </div>
        <p className="text-xs mt-1" style={{ color: 'var(--hint)', textAlign: isSent ? 'right' : 'left', fontSize: 10 }}>
          {format(new Date(sentAt), 'MMM d, h:mm a')}
        </p>
      </div>
    </div>
  )
}
