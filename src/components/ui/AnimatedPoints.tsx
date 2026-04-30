'use client'

import { useEffect, useRef, useState } from 'react'

interface Props {
  value: number
  duration?: number // ms
  isTop3?: boolean
}

export default function AnimatedPoints({ value, duration = 800, isTop3 = false }: Props) {
  const [displayed, setDisplayed] = useState(0)
  const prevRef = useRef(0)
  const rafRef = useRef<number | null>(null)

  useEffect(() => {
    const from = prevRef.current
    const to = value
    if (from === to) return

    const start = performance.now()

    const step = (now: number) => {
      const elapsed = now - start
      const progress = Math.min(elapsed / duration, 1)
      // easeOutExpo
      const ease = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress)
      setDisplayed(Math.round(from + (to - from) * ease))
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(step)
      } else {
        prevRef.current = to
      }
    }

    rafRef.current = requestAnimationFrame(step)
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current) }
  }, [value, duration])

  return (
    <div style={{ textAlign: 'right', flexShrink: 0 }}>
      <span style={{
        fontFamily: 'Barlow Condensed, sans-serif',
        fontSize: '1.25rem', fontWeight: 800,
        color: isTop3 ? 'var(--lime)' : 'var(--text)',
        display: 'inline-block',
        transition: 'transform 0.15s',
      }}>
        {displayed}
      </span>
      <span style={{ fontSize: '0.65rem', color: 'var(--text-sub)', marginLeft: '2px' }}>pts</span>
    </div>
  )
}
