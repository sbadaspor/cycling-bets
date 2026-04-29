'use client'

import { useEffect, useState } from 'react'

interface Props {
  dataInicio: string // ISO string
  diasAteInicio: number
}

export default function CountdownTimer({ dataInicio, diasAteInicio }: Props) {
  const [timeLeft, setTimeLeft] = useState('')
  const [urgente, setUrgente] = useState(false)

  useEffect(() => {
    function calc() {
      const diff = new Date(dataInicio).getTime() - Date.now()
      if (diff <= 0) {
        setTimeLeft('A decorrer')
        return
      }
      const d = Math.floor(diff / 86400000)
      const h = Math.floor((diff % 86400000) / 3600000)
      const m = Math.floor((diff % 3600000) / 60000)
      const s = Math.floor((diff % 60000) / 1000)

      setUrgente(d < 1)

      if (d > 0) {
        setTimeLeft(`${d}d ${h}h ${m}m`)
      } else if (h > 0) {
        setTimeLeft(`${h}h ${m}m ${s}s`)
      } else {
        setTimeLeft(`${m}m ${s}s`)
      }
    }

    // Só ativar timer em tempo real se faltar menos de 2 dias
    calc()
    if (diasAteInicio > 2) return
    const id = setInterval(calc, 1000)
    return () => clearInterval(id)
  }, [dataInicio, diasAteInicio])

  if (!timeLeft) return null

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '0.4rem',
      marginTop: '0.5rem',
    }}>
      <span style={{ fontSize: '0.65rem', color: urgente ? '#ff9500' : 'var(--text-sub)' }}>
        {urgente ? '⏰' : '🕐'}
      </span>
      <span style={{
        fontFamily: 'Barlow Condensed, sans-serif',
        fontSize: '0.82rem', fontWeight: 700,
        color: urgente ? '#ff9500' : 'var(--text-dim)',
        fontVariantNumeric: 'tabular-nums',
        letterSpacing: '0.02em',
      }}>
        {timeLeft}
      </span>
      <span style={{ fontSize: '0.65rem', color: 'var(--text-sub)' }}>
        para fechar apostas
      </span>
    </div>
  )
}
