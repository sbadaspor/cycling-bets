import React from 'react'
import Link from 'next/link'
import type { Prova, CategoriaProvaTipo } from '@/types'
import { categorizarProva, compararProvas } from '@/lib/provaStatus'
import CountdownTimer from '@/components/ui/CountdownTimer'

interface Props {
  provas: Prova[]
  userId?: string
  provasComAposta?: Set<string>
}

const CATEGORIA_CONFIG: Record<CategoriaProvaTipo, { icon: string; label: string; badgeClass: string }> = {
  grande_volta:  { icon: '🏔️', label: 'Grande Volta',    badgeClass: 'badge-grande-volta' },
  prova_semana:  { icon: '📅', label: 'Prova da Semana', badgeClass: 'badge-prova-semana' },
  monumento:     { icon: '🗿', label: 'Monumento',        badgeClass: 'badge-monumento' },
  prova_dia:     { icon: '⚡', label: 'Prova de um dia', badgeClass: 'badge-prova-dia' },
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
        const urgente = dias <= 3
        const jaApostou = provasComAposta.has(prova.id)
        const semAposta = !jaApostou && !!userId
        const cat = prova.categoria ? CATEGORIA_CONFIG[prova.categoria] : null
        const progressoPct = Math.max(4, Math.round((1 - Math.min(dias, 30) / 30) * 100))

        return (
          <div
            key={prova.id}
            className={`animate-fade-up delay-${Math.min(i + 1, 5)}`}
            style={{
              background: 'var(--surface)', borderRadius: '1rem', overflow: 'hidden',
              border: '1px solid var(--border)', position: 'relative',
              transition: 'border-color 0.18s, box-shadow 0.18s',
            }}
          >
            {/* Barra lateral */}
            <div style={{
              position: 'absolute', left: 0, top: 0, bottom: 0, width: 3,
              background: jaApostou ? 'var(--blue)' : urgente ? 'var(--lime)' : 'rgba(255,255,255,0.06)',
            }} />

            <div style={{ padding: '0.9rem 1rem 0.9rem 1.25rem' }}>
              {/* Badges topo */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.4rem', flexWrap: 'wrap' }}>
                {cat && (
                  <span className={`badge-categoria ${cat.badgeClass}`}>
                    {cat.icon} {cat.label}
                  </span>
                )}
                {jaApostou && (
                  <span style={{
                    background: 'rgba(68,136,255,0.12)', color: 'var(--blue)',
                    border: '1px solid rgba(68,136,255,0.25)',
                    padding: '0.1rem 0.45rem', borderRadius: '999px',
                    fontSize: '0.65rem', fontWeight: 700,
                  }}>✓ Apostado</span>
                )}
                {semAposta && urgente && (
                  <span style={{
                    background: 'rgba(255,80,0,0.12)', color: '#ff6030',
                    border: '1px solid rgba(255,80,0,0.25)',
                    padding: '0.1rem 0.45rem', borderRadius: '999px',
                    fontSize: '0.65rem', fontWeight: 700,
                  }}>⚠️ Por apostar</span>
                )}
              </div>

              <p style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text)', lineHeight: 1.25, marginBottom: '0.25rem' }}>
                {prova.nome}
              </p>

              <p style={{ fontSize: '0.72rem', color: 'var(--text-sub)' }}>
                {new Date(prova.data_inicio).toLocaleDateString('pt-PT', { day: 'numeric', month: 'short' })}
                {' → '}
                {new Date(prova.data_fim).toLocaleDateString('pt-PT', { day: 'numeric', month: 'short', year: 'numeric' })}
              </p>

              <CountdownTimer dataInicio={prova.data_inicio} diasAteInicio={dias} />

              <div style={{ height: 2, background: 'var(--surface-2)', borderRadius: '999px', overflow: 'hidden', margin: '0.75rem 0' }}>
                <div style={{
                  height: '100%', width: `${progressoPct}%`,
                  background: urgente ? 'linear-gradient(90deg, rgba(200,244,0,0.9), rgba(200,244,0,0.4))' : 'rgba(255,255,255,0.1)',
                  borderRadius: '999px',
                }} />
              </div>

              {userId && (
                <Link
                  href={`/apostas/${prova.id}`}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
                    background: jaApostou ? 'var(--surface-2)' : 'rgba(200,244,0,0.12)',
                    color: jaApostou ? 'var(--text-dim)' : 'var(--lime)',
                    border: `1px solid ${jaApostou ? 'var(--border-hi)' : 'rgba(200,244,0,0.25)'}`,
                    padding: '0.4rem 0.875rem', borderRadius: '0.5rem',
                    fontSize: '0.78rem', fontWeight: 700, textDecoration: 'none',
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
