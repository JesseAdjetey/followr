'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/cn'

interface AppShellProps {
  children: React.ReactNode
  rightPanel?: React.ReactNode
}

export function AppShell({ children, rightPanel }: AppShellProps) {
  const pathname = usePathname()

  const navItems = [
    {
      href: '/',
      label: 'Feed',
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="3" width="18" height="18" rx="3" />
          <path d="M3 9h18M9 21V9" />
        </svg>
      ),
    },
    {
      href: '/templates',
      label: 'Templates',
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="16" y1="13" x2="8" y2="13" />
          <line x1="16" y1="17" x2="8" y2="17" />
          <polyline points="10 9 9 9 8 9" />
        </svg>
      ),
    },
    {
      href: '/settings',
      label: 'Settings',
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
        </svg>
      ),
    },
  ]

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: 'var(--bg)' }}>
      {/* Sidebar — desktop only */}
      <aside
        className="hidden lg:flex flex-col py-5 flex-shrink-0"
        style={{ width: 240, background: '#fff', borderRight: '1px solid rgba(0,0,0,0.08)' }}
      >
        {/* Logo */}
        <div className="px-5 mb-6">
          <span className="font-semibold" style={{ fontSize: 20, letterSpacing: '-0.02em' }}>Followr</span>
        </div>

        {/* Nav */}
        <nav className="flex flex-col gap-0.5 px-2.5">
          {navItems.map(item => {
            const active = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium transition-all',
                  active
                    ? 'bg-accent-bg text-accent'
                    : 'text-muted hover:bg-surface2'
                )}
              >
                {item.icon}
                {item.label}
              </Link>
            )
          })}
        </nav>
      </aside>

      {/* Main content */}
      <main className="flex flex-1 overflow-hidden">
        {/* Feed / content area */}
        <div className="flex flex-col flex-1 overflow-hidden">
          {children}
        </div>

        {/* Right detail panel — desktop only */}
        {rightPanel && (
          <aside
            className="hidden lg:flex flex-col overflow-hidden flex-shrink-0"
            style={{ width: 380, background: '#fff', borderLeft: '1px solid rgba(0,0,0,0.08)' }}
          >
            {rightPanel}
          </aside>
        )}
      </main>

      {/* Bottom nav — mobile only */}
      <nav
        className="lg:hidden fixed bottom-0 left-0 right-0 flex"
        style={{ background: '#fff', borderTop: '1px solid rgba(0,0,0,0.08)', paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        {navItems.map(item => {
          const active = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex-1 flex flex-col items-center gap-1 py-2.5 text-xs font-medium transition-all"
              style={{ color: active ? '#2563EB' : 'var(--muted)' }}
            >
              {item.icon}
              {item.label}
            </Link>
          )
        })}
      </nav>
    </div>
  )
}
