'use client'

import { useRouter } from 'next/navigation'
import type { Thread } from '@/types'

interface NewEmailBannerProps {
  thread: Thread
}

export function NewEmailBanner({ thread }: NewEmailBannerProps) {
  const router = useRouter()

  return (
    <div
      className="mx-4 mt-3 rounded-xl p-3.5 flex items-center gap-3 cursor-pointer"
      style={{ background: '#EEF4FF', border: '1px solid #BFDBFE' }}
      onClick={() => router.push(`/setup/${thread.gmail_thread_id}`)}
    >
      <span
        className="w-2 h-2 rounded-full flex-shrink-0 animate-pulse-dot"
        style={{ background: '#2563EB' }}
      />
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold truncate" style={{ color: '#1E3A8A' }}>
          {thread.subject || '(no subject)'}
        </p>
        <p className="text-xs truncate" style={{ color: '#3B82F6' }}>
          From {thread.sender_name || thread.sender_email}
        </p>
      </div>
      <button
        className="text-xs font-semibold whitespace-nowrap flex-shrink-0"
        style={{ color: '#2563EB' }}
      >
        Set up follow-ups →
      </button>
    </div>
  )
}
