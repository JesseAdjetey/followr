'use client'

import { cn } from '@/lib/cn'

export type FilterTab = 'all' | 'overdue' | 'today' | 'this_week' | 'replied'

const TABS: { id: FilterTab; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'overdue', label: 'Overdue' },
  { id: 'today', label: 'Due today' },
  { id: 'this_week', label: 'This week' },
  { id: 'replied', label: 'Replied' },
]

interface FilterTabsProps {
  active: FilterTab
  onChange: (tab: FilterTab) => void
}

export function FilterTabs({ active, onChange }: FilterTabsProps) {
  return (
    <div
      className="flex gap-1.5 px-4 py-2.5 overflow-x-auto"
      style={{ background: 'var(--bg)', scrollbarWidth: 'none' }}
    >
      {TABS.map(tab => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={cn(
            'text-xs px-3 py-1 rounded-full whitespace-nowrap transition-all',
            active === tab.id
              ? 'font-semibold'
              : 'font-medium'
          )}
          style={
            active === tab.id
              ? { background: '#1B222B', color: '#F2F1ED', border: '1px solid #1B222B' }
              : { background: 'transparent', color: '#888580', border: '1px solid rgba(0,0,0,0.12)' }
          }
        >
          {tab.label}
        </button>
      ))}
    </div>
  )
}
