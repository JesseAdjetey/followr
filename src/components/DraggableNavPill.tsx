'use client'

import { useRef } from 'react'
import { motion, useMotionValue, animate } from 'framer-motion'
import { usePathname, useRouter } from 'next/navigation'
import { navDir, NAV_ORDER, getNavDirection } from '@/lib/navDirection'

const LABELS: Record<string, string> = {
  '/': 'Feed',
  '/templates': 'Templates',
  '/settings': 'Settings',
}

const DRAG_THRESHOLD = 72

export function DraggableNavPill() {
  const pathname = usePathname()
  const router = useRouter()
  const x = useMotionValue(0)
  const dragging = useRef(false)

  const currentIdx = NAV_ORDER.findIndex(r =>
    r === '/' ? pathname === '/' : pathname.startsWith(r)
  )
  const label = LABELS[NAV_ORDER[currentIdx]] ?? 'Followr'
  const canGoNext = currentIdx < NAV_ORDER.length - 1
  const canGoPrev = currentIdx > 0

  function navigate(href: string) {
    navDir.current = getNavDirection(pathname, href)
    router.push(href)
  }

  return (
    <motion.button
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={{ left: canGoNext ? 0.25 : 0.05, right: canGoPrev ? 0.25 : 0.05 }}
      style={{
        x,
        touchAction: 'none',
        border: '1px solid var(--border2)',
        background: 'var(--surface)',
        color: 'var(--text)',
        fontSize: 13,
        fontWeight: 700,
        fontFamily: 'inherit',
        letterSpacing: '0.01em',
        userSelect: 'none',
        WebkitUserSelect: 'none',
      }}
      onDragStart={() => { dragging.current = true }}
      onDragEnd={(_, info) => {
        dragging.current = false
        if (info.offset.x < -DRAG_THRESHOLD && canGoNext) {
          navigate(NAV_ORDER[currentIdx + 1])
        } else if (info.offset.x > DRAG_THRESHOLD && canGoPrev) {
          navigate(NAV_ORDER[currentIdx - 1])
        } else {
          animate(x, 0, { type: 'spring', stiffness: 500, damping: 35 })
        }
      }}
      onClick={() => { /* drag handles nav */ }}
      className="inline-flex items-center px-4 py-1.5 rounded-lg select-none cursor-grab active:cursor-grabbing"
    >
      {label}
    </motion.button>
  )
}
