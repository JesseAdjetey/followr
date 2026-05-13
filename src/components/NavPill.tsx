'use client'

import { useRef } from 'react'
import { motion, useMotionValue, animate } from 'framer-motion'

const DRAG_THRESHOLD = 56

interface NavPillProps {
  currentLabel: string
  prevLabel?: string
  nextLabel?: string
  onPrev?: () => void
  onNext?: () => void
  /** Pass a width/maxWidth to constrain (e.g. for thread detail centered pill) */
  style?: React.CSSProperties
}

export function NavPill({
  currentLabel,
  prevLabel,
  nextLabel,
  onPrev,
  onNext,
  style,
}: NavPillProps) {
  const x = useMotionValue(0)
  const trackRef = useRef<HTMLDivElement>(null)
  const canGoPrev = !!onPrev
  const canGoNext = !!onNext

  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'stretch',
        border: '1px solid var(--border2)',
        background: 'var(--surface)',
        borderRadius: 8,
        overflow: 'hidden',
        ...style,
      }}
    >
      {/* Left chevron — always rendered, dimmed when unavailable */}
      <button
        onClick={onPrev}
        disabled={!canGoPrev}
        style={{
          display: 'flex',
          alignItems: 'center',
          padding: '0 7px 0 9px',
          flexShrink: 0,
          color: 'var(--muted)',
          opacity: canGoPrev ? 0.8 : 0.2,
          cursor: canGoPrev ? 'pointer' : 'default',
          background: 'transparent',
          border: 'none',
          transition: 'opacity 0.15s',
        }}
      >
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <polyline points="15 18 9 12 15 6"/>
        </svg>
      </button>

      {/* Draggable text track — only this moves */}
      <div
        ref={trackRef}
        style={{
          position: 'relative',
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
          /* Fade edges so adjacent labels dissolve smoothly */
          maskImage: 'linear-gradient(to right, transparent, black 12%, black 88%, transparent)',
          WebkitMaskImage: 'linear-gradient(to right, transparent, black 12%, black 88%, transparent)',
          minWidth: 48,
          padding: '7px 2px',
        }}
      >
        <motion.div
          drag="x"
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={{
            left: canGoNext ? 0.28 : 0.04,
            right: canGoPrev ? 0.28 : 0.04,
          }}
          style={{
            x,
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'grab',
            userSelect: 'none',
            WebkitUserSelect: 'none',
            touchAction: 'none',
          }}
          onDragEnd={(_, info) => {
            // Commit distance moves the adjacent label to approx center without overshooting into the fade zone
            const commitDist = (trackRef.current?.offsetWidth ?? 140) * 0.38
            if (info.offset.x < -DRAG_THRESHOLD && canGoNext) {
              animate(x, -commitDist, { duration: 0.13, ease: [0.4, 0, 0.2, 1], onComplete: () => onNext?.() })
            } else if (info.offset.x > DRAG_THRESHOLD && canGoPrev) {
              animate(x, commitDist, { duration: 0.13, ease: [0.4, 0, 0.2, 1], onComplete: () => onPrev?.() })
            } else {
              animate(x, 0, { type: 'spring', stiffness: 480, damping: 34 })
            }
          }}
        >
          {/* Prev label — peeks in from left on right-drag */}
          {prevLabel && (
            <span
              style={{
                position: 'absolute',
                right: '100%',
                paddingRight: 18,
                opacity: 0.35,
                whiteSpace: 'nowrap',
                fontSize: 12,
                fontWeight: 700,
                fontFamily: 'inherit',
                pointerEvents: 'none',
                color: 'var(--text)',
              }}
            >
              {prevLabel}
            </span>
          )}

          {/* Current label */}
          <span
            style={{
              fontSize: 13,
              fontWeight: 700,
              fontFamily: 'inherit',
              color: 'var(--text)',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              maxWidth: '100%',
              display: 'block',
            }}
          >
            {currentLabel}
          </span>

          {/* Next label — peeks in from right on left-drag */}
          {nextLabel && (
            <span
              style={{
                position: 'absolute',
                left: '100%',
                paddingLeft: 18,
                opacity: 0.35,
                whiteSpace: 'nowrap',
                fontSize: 12,
                fontWeight: 700,
                fontFamily: 'inherit',
                pointerEvents: 'none',
                color: 'var(--text)',
              }}
            >
              {nextLabel}
            </span>
          )}
        </motion.div>
      </div>

      {/* Right chevron */}
      <button
        onClick={onNext}
        disabled={!canGoNext}
        style={{
          display: 'flex',
          alignItems: 'center',
          padding: '0 9px 0 7px',
          flexShrink: 0,
          color: 'var(--muted)',
          opacity: canGoNext ? 0.8 : 0.2,
          cursor: canGoNext ? 'pointer' : 'default',
          background: 'transparent',
          border: 'none',
          transition: 'opacity 0.15s',
        }}
      >
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <polyline points="9 18 15 12 9 6"/>
        </svg>
      </button>
    </div>
  )
}
