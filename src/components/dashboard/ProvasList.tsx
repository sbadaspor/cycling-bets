import React from 'react'
import Link from 'next/link'
import type { Prova } from '@/types'
import { categorizarProva, compararProvas } from '@/lib/provaStatus'

interface Props {
  provas: Prova[]
  userId?: string
  provasComAposta?: Set<string>
}

export function ProvasList({ provas, userId, provasComAposta = new Set() }: Props) {
  const futuras = provas
    .map(categorizarProva)
    .filter(p => p.estado === 'futura')
    .sort(compararProvas)

  if (futuras.length === 0) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: '2rem 1.25rem' }}>
        <div style={{ fontSize: '1.75rem', marginBottom: '0.5rem' }}>📅</div>
        <p style={{ color: 'var(--text-dim)', fontSize: '0.875rem' }}>Sem provas agendadas</p>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      {futuras.map((prova, i) => {
        const dias = prova.diasAteInicio
        const txtTempo = dias === 0 ? 'Hoje' : dias === 1 ? 'Amanhã' : `${dias}d`
        const urgente = dias <= 3
        const jaApostou = provasComAposta.has(prova.id)
        const semAposta = !jaApostou && userId

        // Barra de progresso: dias até início (máx 30 dias)
        const totalDias = Math.max(1, Math.min(dias, 30))
        const progressoPct = Math.max(4, Math.round((1 - totalDias / 30) * 100))

        const dataInicio = new Date(prova.data_inicio).toLocaleDateString('pt-PT', { day: 'numeric', month: 'short' })
        const dataFim = new Date(prova.data_fim).toLocaleDateString('pt-PT', { day: 'numeric', month: 'short', year: 'numeric' })

        return (
          <div
            key={prova.id}
            className={`card animate-fade-up delay-${Math.min(i + 1, 5)}`}
            style={{ padding: '0', position: 'relative', overflow: 'hidden' }}
          >
            {/* Barra lateral de cor */}
            <div style={{
              position: 'absolute', left: 0, top: 0, bottom: 0, width: 3,
              background: jaApostou ? 'var(--blue)' : urgente ? 'var(--lime)' : 'rgba(255,255,255,0.08)',
              borderRadius: '1rem 0 0 1rem',
            }} />

            <div style={{ padding: '0.9rem 1rem 0.9rem 1.25rem' }}>
              {/* Linha topo: nome + badges */}
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.5rem', marginBottom: '0.4rem' }}>
                <p style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text)', lineHeight: 1.25, flex: 1 }}>
                  {prova.nome}
                </p>
                <div style={{ display: 'flex', gap: '0.35rem', alignItems: 'center', flexShrink: 0 }}>
                  {jaApostou && (
                    <span style={{
                      background: 'rgba(68,136,255,0.12)', color: 'var(--blue)',
                      border: '1px solid rgba(68,136,255,0.25)',
                      padding: '0.15rem 0.5rem', borderRadius: '999px',
                      fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.04em',
                    }}>✓ Apostado</span>
                  )}
                  {semAposta && urgente && (
                    <span style={{
                      background: 'rgba(255,80,0,0.12)', color: '#ff6030',
                      border: '1px solid rgba(255,80,0,0.25)',
                      padding: '0.15rem 0.5rem', borderRadius: '999px',
                      fontSize: '0.68rem', fontWeight: 700,
                    }}>⚠️ Por apostar</span>
                  )}
                  <span style={{
                    background: urgente ? 'rgba(200,244,0,0.12)' : 'var(--surface-2)',
                    color: urgente ? 'var(--lime)' : 'var(--text-dim)',
                    border: `1px solid ${urgente ? 'rgba(200,244,0,0.3)' : 'var(--border-hi)'}`,
                    padding: '0.15rem 0.5rem', borderRadius: '999px',
                    fontSize: '0.68rem', fontWeight: 700,
                    fontFamily: 'Barlow Condensed, sans-serif',
                  }}>{txtTempo}</span>
                </div>
              </div>

              {/* Data */}
              <p style={{ fontSize: '0.72rem', color: 'var(--text-sub)', marginBottom: '0.6rem' }}>
                {dataInicio} → {dataFim}
              </p>

              {/* Barra de progresso */}
              <div style={{
                height: 3, background: 'var(--surface-2)',
                borderRadius: '999px', overflow: 'hidden', marginBottom: '0.75rem',
              }}>
                <div style={{
                  height: '100%', width: `${progressoPct}%`,
                  background: urgente
                    ? 'linear-gradient(90deg, rgba(200,244,0,0.9), rgba(200,244,0,0.5))'
                    : 'rgba(255,255,255,0.12)',
                  borderRadius: '999px',
                  transition: 'width 0.4s ease',
                }} />
              </div>

              {/* Botão aposta rápida */}
              {userId && (
                <Link
                  href={`/apostas/${prova.id}`}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
                    background: jaApostou ? 'var(--surface-2)' : 'rgba(200,244,0,0.12)',
                    color: jaApostou ? 'var(--text-dim)' : 'var(--lime)',
                    border: `1px solid ${jaApostou ? 'var(--border-hi)' : 'rgba(200,244,0,0.25)'}`,
                    padding: '0.4rem 0.875rem',
                    borderRadius: '0.5rem',
                    fontSize: '0.78rem', fontWeight: 700,
                    textDecoration: 'none',
                    transition: 'all 0.12s',
                  }}
                >
                  {jaApostou ? '✏️ Editar aposta' : '🎯 Apostar agora'}
                </Link>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
