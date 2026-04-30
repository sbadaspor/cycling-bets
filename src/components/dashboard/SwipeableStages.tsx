'use client'

import { useState, useRef, useCallback } from 'react'
import type { EtapaResultado } from '@/types'
import ApostaDetalhe from '@/components/dashboard/ApostaDetalhe'
import type { Aposta } from '@/types'

interface Props {
  aposta: Aposta
  etapas: EtapaResultado[]
  ehProvaUser: boolean
}

export default function SwipeableStages({ aposta, etapas, ehProvaUser }: Props) {
  const [idx, setIdx] = useState(etapas.length - 1) // começa na última
  const touchStartX = useRef<number | null>(null)
  const touchStartY = useRef<number | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const etapa = etapas[idx] ?? null

  const goTo = useCallback((newIdx: number) => {
    if (newIdx < 0 || newIdx >= etapas.length) return
    setIdx(newIdx)
  }, [etapas.length])

  function onTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0].clientX
    touchStartY.current = e.touches[0].clientY
  }

  function onTouchEnd(e: React.TouchEvent) {
    if (touchStartX.current === null || touchStartY.current === null) return
    const dx = e.changedTouches[0].clientX - touchStartX.current
    const dy = e.changedTouches[0].clientY - touchStartY.current
    // Só reconhecer swipe horizontal (|dx| > |dy| e > 50px)
    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 50) {
      if (dx < 0) goTo(idx + 1) // swipe left → próxima etapa
      else goTo(idx - 1)         // swipe right → etapa anterior
    }
    touchStartX.current = null
    touchStartY.current = null
  }

  if (etapas.length === 0) return null

  // Se só há uma etapa, mostrar sem swipe UI
  if (etapas.length === 1) {
    return <ApostaDetalhe aposta={aposta} ultimaEtapa={etapas[0]} ehProvaUser={ehProvaUser} />
  }

  return (
    <div ref={containerRef} onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
      {/* Navegação de etapas */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '0.5rem',
        marginBottom: '0.75rem', overflowX: 'auto',
        paddingBottom: '0.25rem',
        scrollbarWidth: 'none',
      }}>
        <button
          onClick={() => goTo(idx - 1)}
          disabled={idx === 0}
          style={{
            padding: '0.35rem 0.6rem', borderRadius: '0.5rem',
            background: 'var(--surface-2)', border: '1px solid var(--border-hi)',
            color: idx === 0 ? 'var(--text-sub)' : 'var(--text)',
            fontSize: '0.8rem', cursor: idx === 0 ? 'default' : 'pointer',
            flexShrink: 0,
          }}
        >
          ←
        </button>

        {/* Dots / pills */}
        <div style={{ display: 'flex', gap: '0.3rem', flex: 1, justifyContent: 'center', flexWrap: 'nowrap', overflow: 'hidden' }}>
          {etapas.map((e, i) => (
            <button
              key={e.id}
              onClick={() => goTo(i)}
              style={{
                padding: '0.2rem 0.5rem',
                borderRadius: '999px', border: 'none', cursor: 'pointer',
                background: i === idx ? 'var(--lime)' : 'var(--surface-2)',
                color: i === idx ? '#0a0a0a' : 'var(--text-dim)',
                fontSize: '0.68rem', fontWeight: 700,
                fontFamily: 'Barlow Condensed, sans-serif',
                flexShrink: 0,
                transition: 'background 0.15s, color 0.15s',
                minWidth: '2rem',
              }}
            >
              {e.is_final ? '🏁' : `E${e.numero_etapa}`}
            </button>
          ))}
        </div>

        <button
          onClick={() => goTo(idx + 1)}
          disabled={idx === etapas.length - 1}
          style={{
            padding: '0.35rem 0.6rem', borderRadius: '0.5rem',
            background: 'var(--surface-2)', border: '1px solid var(--border-hi)',
            color: idx === etapas.length - 1 ? 'var(--text-sub)' : 'var(--text)',
            fontSize: '0.8rem', cursor: idx === etapas.length - 1 ? 'default' : 'pointer',
            flexShrink: 0,
          }}
        >
          →
        </button>
      </div>

      {/* Hint de swipe (mobile) */}
      <p style={{ fontSize: '0.65rem', color: 'var(--text-sub)', textAlign: 'center', marginBottom: '0.75rem' }}>
        ← desliza para navegar entre etapas →
      </p>

      {/* Conteúdo da etapa */}
      <div style={{ animation: 'fadeIn 0.2s ease' }}>
        <ApostaDetalhe aposta={aposta} ultimaEtapa={etapa} ehProvaUser={ehProvaUser} />
      </div>
    </div>
  )
}
