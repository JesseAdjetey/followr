'use client'

import Image from 'next/image'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { cn } from '@/lib/cn'
import { createBrowserSupabaseClient } from '@/lib/supabase'

interface AppShellProps {
  children: React.ReactNode
  rightPanel?: React.ReactNode
}

export function AppShell({ children, rightPanel }: AppShellProps) {
  const pathname = usePathname()
  const router = useRouter()

  async function handleSignOut() {
    const supabase = createBrowserSupabaseClient()
    await supabase.auth.signOut()
    router.push('/auth/signin')
  }

  const navItems = [
    {
      href: '/',
      label: 'Feed',
      icon: (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="3" width="18" height="18" rx="3" />
          <path d="M3 9h18M9 21V9" />
        </svg>
      ),
    },
    {
      href: '/templates',
      label: 'Templates',
      icon: (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
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
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
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
        style={{ width: 220, background: 'var(--bg)' }}
      >
        {/* Logo */}
        <div className="px-5 mb-8">
          <Image
            src="/Followr_WordxIcon_Logo_Black.png"
            alt="Followr"
            width={110}
            height={36}
            style={{ objectFit: 'contain', objectPosition: 'left' }}
            priority
          />
        </div>

        {/* Nav */}
        <nav className="flex flex-col gap-1 px-3">
          {navItems.map(item => {
            const active = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-bold transition-all',
                  active
                    ? 'text-[#1B222B]'
                    : 'text-[#888580] hover:text-[#1B222B]'
                )}
                style={
                  active
                    ? { border: '1px solid rgba(27,34,43,0.18)', background: 'rgba(27,34,43,0.04)' }
                    : { border: '1px solid transparent' }
                }
              >
                {item.icon}
                {item.label}
              </Link>
            )
          })}
        </nav>

        <div className="mt-auto px-3">
          <button
            onClick={handleSignOut}
            className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-bold w-full transition-all hover:text-[#1B222B]"
            style={{ color: 'var(--hint)', border: '1px solid transparent' }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            Sign out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex flex-1 overflow-hidden">
        {/* Feed / content area */}
        <div className="flex flex-col flex-1 overflow-hidden">
          {children}
        </div>

        {/* Right detail panel — desktop only, only when content provided */}
        {rightPanel && (
          <aside
            className="hidden lg:flex flex-col overflow-hidden flex-shrink-0"
            style={{ width: 360, background: 'var(--bg)', borderLeft: '1px solid rgba(27,34,43,0.08)' }}
          >
            {rightPanel}
          </aside>
        )}
      </main>

      {/* Bottom nav — mobile only */}
      <nav
        className="lg:hidden fixed bottom-0 left-0 right-0 flex"
        style={{ background: 'var(--bg)', borderTop: '1px solid rgba(27,34,43,0.08)', paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        {navItems.map(item => {
          const active = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex-1 flex flex-col items-center gap-1 py-2.5 text-xs font-bold transition-all"
              style={{ color: active ? '#1B222B' : 'var(--muted)' }}
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
