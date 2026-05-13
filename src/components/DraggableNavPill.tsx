'use client'

import { usePathname, useRouter } from 'next/navigation'
import { navDir, NAV_ORDER, getNavDirection } from '@/lib/navDirection'
import { NavPill } from './NavPill'

const LABELS: Record<string, string> = {
  '/': 'Feed',
  '/templates': 'Templates',
  '/settings': 'Settings',
}

export function DraggableNavPill() {
  const pathname = usePathname()
  const router = useRouter()

  const currentIdx = NAV_ORDER.findIndex(r =>
    r === '/' ? pathname === '/' : pathname.startsWith(r)
  )

  function navigate(href: string) {
    navDir.current = getNavDirection(pathname, href)
    router.push(href)
  }

  const prevHref = currentIdx > 0 ? NAV_ORDER[currentIdx - 1] : undefined
  const nextHref = currentIdx < NAV_ORDER.length - 1 ? NAV_ORDER[currentIdx + 1] : undefined

  return (
    <NavPill
      currentLabel={LABELS[NAV_ORDER[currentIdx]] ?? 'Followr'}
      prevLabel={prevHref ? LABELS[prevHref] : undefined}
      nextLabel={nextHref ? LABELS[nextHref] : undefined}
      onPrev={prevHref ? () => navigate(prevHref) : undefined}
      onNext={nextHref ? () => navigate(nextHref) : undefined}
    />
  )
}
