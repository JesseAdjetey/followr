'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { AnimatePresence, motion } from 'framer-motion'
import { cn } from '@/lib/cn'
import { navDir, NAV_ORDER, getNavDirection } from '@/lib/navDirection'
import { createBrowserSupabaseClient } from '@/lib/supabase'
import { useTheme, type Theme } from './ThemeProvider'

interface AppShellProps {
  children: React.ReactNode
  rightPanel?: React.ReactNode
}

const THEME_CYCLE: Theme[] = ['light', 'system', 'dark']
const THEME_ICONS: Record<Theme, React.ReactNode> = {
  light: (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="5"/>
      <line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/>
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
      <line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/>
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
    </svg>
  ),
  system: (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="2" y="3" width="20" height="14" rx="2"/>
      <line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/>
    </svg>
  ),
  dark: (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
    </svg>
  ),
}

export function AppShell({ children, rightPanel }: AppShellProps) {
  const pathname = usePathname()
  const router = useRouter()
  const { theme, setTheme } = useTheme()
  const [collapsed, setCollapsed] = useState(false)

  const [systemDark, setSystemDark] = useState(false)

  useEffect(() => {
    const saved = localStorage.getItem('followr-sidebar-collapsed')
    if (saved === '1') setCollapsed(true)
  }, [])

  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    setSystemDark(mq.matches)
    const handler = (e: MediaQueryListEvent) => setSystemDark(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  const isDark = theme === 'dark' || (theme === 'system' && systemDark)

  function toggleCollapsed() {
    setCollapsed(v => {
      const next = !v
      localStorage.setItem('followr-sidebar-collapsed', next ? '1' : '0')
      return next
    })
  }

  function cycleTheme() {
    const idx = THEME_CYCLE.indexOf(theme)
    setTheme(THEME_CYCLE[(idx + 1) % THEME_CYCLE.length])
  }

  async function handleSignOut() {
    const supabase = createBrowserSupabaseClient()
    await supabase.auth.signOut()
    router.push('/auth/signin')
  }

  function navigateTo(href: string) {
    navDir.current = getNavDirection(pathname, href)
    router.push(href)
  }

  const navItems = [
    {
      href: '/',
      label: 'Feed',
      icon: (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="3" width="18" height="18" rx="3"/>
          <path d="M3 9h18M9 21V9"/>
        </svg>
      ),
    },
    {
      href: '/templates',
      label: 'Templates',
      icon: (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
          <polyline points="14 2 14 8 20 8"/>
          <line x1="16" y1="13" x2="8" y2="13"/>
          <line x1="16" y1="17" x2="8" y2="17"/>
        </svg>
      ),
    },
    {
      href: '/settings',
      label: 'Settings',
      icon: (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="3"/>
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
        </svg>
      ),
    },
  ]

  const sidebarW = collapsed ? 64 : 220

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: 'var(--bg)' }}>
      {/* Sidebar — desktop only */}
      <motion.aside
        animate={{ width: sidebarW }}
        transition={{ type: 'spring', stiffness: 320, damping: 32 }}
        className="hidden lg:flex flex-col py-5 flex-shrink-0 relative overflow-hidden"
        style={{ background: 'var(--bg)' }}
      >
        {/* Logo + single collapse toggle */}
        <div className="mb-8 px-3 flex items-center justify-between">
          {/* Logo: full word+icon when expanded, icon-only when collapsed */}
          <AnimatePresence mode="wait" initial={false}>
            {collapsed ? (
              <motion.div
                key="icon"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={isDark ? '/followr_white_nobg.png' : '/followr_black_nobg.png'}
                  alt="Followr"
                  style={{ width: 28, height: 28, objectFit: 'contain' }}
                />
              </motion.div>
            ) : (
              <motion.div
                key="full"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/Followr_WordxIcon_Logo_Black.png" alt="Followr" className="logo-light" style={{ width: 120, height: 'auto', objectFit: 'contain' }} />
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/Followr_WordxIcon_Logo_White.png" alt="Followr" className="logo-dark" style={{ width: 120, height: 'auto', objectFit: 'contain' }} />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Single collapse/expand toggle — always in the same spot */}
          <button
            onClick={toggleCollapsed}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className="flex-shrink-0 transition-opacity hover:opacity-60 rounded-md p-1"
            style={{ color: 'var(--hint)' }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              {collapsed
                ? <polyline points="9 18 15 12 9 6"/>
                : <polyline points="15 18 9 12 15 6"/>
              }
            </svg>
          </button>
        </div>

        {/* Nav */}
        <nav className="flex flex-col gap-1 px-2">
          {navItems.map(item => {
            const active = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href)
            return (
              <button
                key={item.href}
                onClick={() => navigateTo(item.href)}
                title={collapsed ? item.label : undefined}
                className={cn(
                  'flex items-center rounded-lg text-xs font-bold transition-all w-full',
                  collapsed ? 'justify-center px-0 py-2.5' : 'gap-2.5 px-3 py-2',
                  active ? 'text-[var(--text)]' : 'text-[var(--muted)] hover:text-[var(--text)]'
                )}
                style={
                  active
                    ? { border: '1px solid var(--border2)', background: 'rgba(27,34,43,0.04)' }
                    : { border: '1px solid transparent' }
                }
              >
                {item.icon}
                <AnimatePresence initial={false}>
                  {!collapsed && (
                    <motion.span
                      initial={{ opacity: 0, width: 0 }}
                      animate={{ opacity: 1, width: 'auto' }}
                      exit={{ opacity: 0, width: 0 }}
                      transition={{ duration: 0.15 }}
                      style={{ overflow: 'hidden', whiteSpace: 'nowrap' }}
                    >
                      {item.label}
                    </motion.span>
                  )}
                </AnimatePresence>
              </button>
            )
          })}
        </nav>

        {/* Bottom controls */}
        <div className="mt-auto px-2 flex flex-col gap-2">
          {/* Theme toggle */}
          {collapsed ? (
            <button
              onClick={cycleTheme}
              title={`Theme: ${theme}`}
              className="flex items-center justify-center py-2 w-full rounded-lg transition-all hover:text-[var(--text)]"
              style={{ color: 'var(--muted)', border: '1px solid var(--border)' }}
            >
              {THEME_ICONS[theme]}
            </button>
          ) : (
            <div
              className="flex items-center rounded-lg overflow-hidden"
              style={{ border: '1px solid var(--border)', background: 'var(--surface2)' }}
            >
              {THEME_CYCLE.map(t => (
                <button
                  key={t}
                  title={t}
                  onClick={() => setTheme(t)}
                  className="flex-1 flex items-center justify-center py-1.5 transition-all"
                  style={
                    theme === t
                      ? { background: 'var(--bg)', color: 'var(--text)', borderRadius: 6 }
                      : { background: 'transparent', color: 'var(--hint)' }
                  }
                >
                  {THEME_ICONS[t]}
                </button>
              ))}
            </div>
          )}

          {/* Sign out */}
          <button
            onClick={handleSignOut}
            title="Sign out"
            className={cn(
              'flex items-center rounded-lg text-xs font-bold w-full transition-all hover:text-[var(--text)]',
              collapsed ? 'justify-center py-2' : 'gap-2.5 px-3 py-2'
            )}
            style={{ color: 'var(--hint)', border: '1px solid transparent' }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
              <polyline points="16 17 21 12 16 7"/>
              <line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
            <AnimatePresence initial={false}>
              {!collapsed && (
                <motion.span
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: 'auto' }}
                  exit={{ opacity: 0, width: 0 }}
                  transition={{ duration: 0.15 }}
                  style={{ overflow: 'hidden', whiteSpace: 'nowrap' }}
                >
                  Sign out
                </motion.span>
              )}
            </AnimatePresence>
          </button>
        </div>
      </motion.aside>

      {/* Main content */}
      <main className="flex flex-1 overflow-hidden min-w-0">
        {/* Page area with slide transitions */}
        <div className="flex flex-col flex-1 overflow-hidden relative min-w-0">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={pathname}
              className="flex flex-col overflow-hidden"
              style={{ position: 'absolute', inset: 0 }}
              initial={{ opacity: 0, x: navDir.current * 28 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -navDir.current * 28 }}
              transition={{ duration: 0.22, ease: [0.25, 0.46, 0.45, 0.94] }}
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Right panel */}
        {rightPanel && (
          <aside
            className="hidden lg:flex flex-col overflow-hidden flex-shrink-0"
            style={{ width: 360, background: 'var(--bg)', borderLeft: '1px solid var(--border)' }}
          >
            {rightPanel}
          </aside>
        )}
      </main>

      {/* Bottom nav — mobile */}
      <nav
        className="lg:hidden fixed bottom-0 left-0 right-0 flex"
        style={{ background: 'var(--bg)', borderTop: '1px solid var(--border)', paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        {navItems.map(item => {
          const active = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href)
          return (
            <button
              key={item.href}
              onClick={() => navigateTo(item.href)}
              className="flex-1 flex flex-col items-center gap-1 py-2.5 text-xs font-bold transition-all"
              style={{ color: active ? 'var(--text)' : 'var(--muted)' }}
            >
              {item.icon}
              {item.label}
            </button>
          )
        })}
      </nav>
    </div>
  )
}
