'use client'

import Link from 'next/link'
import type { CategoriaProvaTipo, VitoriasJogador } from '@/types'

interface GrandeVoltaDetalhe {
  userId: string
  giro: number
  tour: number
  vuelta: number
}

interface Props {
  vitorias: VitoriasJogador[]
  grandesVoltas?: GrandeVoltaDetalhe[]
}

const medals = ['🥇', '🥈', '🥉']

export default function VitoriasJogadores({ vitorias, grandesVoltas = [] }: Props) {
  if (vitorias.length === 0) return null

  const maxTotal = Math.max(...vitorias.map(v => v.total))

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

      {/* ── Hall of Fame — vitórias totais ─────────── */}
      <div className="card-flush animate-fade-up">
        <div style={{ padding: '1rem 1.25rem 0.85rem', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
          <p style={{
            fontSize: '0.68rem', color: 'var(--lime)', fontWeight: 700,
            textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.15rem',
          }}>
            🏆 Vitórias
          </p>
          <h2 style={{
            fontFamily: 'Barlow Condensed, sans-serif', fontSize: '1.2rem',
            fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em',
          }}>
            Hall of Fame
          </h2>
        </div>

        <div style={{ padding: '0.75rem 1.25rem', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
          {vitorias.map((v, idx) => {
            const pct = maxTotal > 0 ? (v.total / maxTotal) * 100 : 0
            return (
              <div key={v.perfil.id} style={{
                display: 'flex', alignItems: 'center', gap: '0.75rem',
                padding: '0.75rem', borderRadius: '0.75rem',
                background: idx === 0 ? 'rgba(200,244,0,0.06)' : 'rgba(255,255,255,0.03)',
                border: `1px solid ${idx === 0 ? 'rgba(200,244,0,0.18)' : 'rgba(255,255,255,0.08)'}`,
              }}>
                <span style={{
                  fontSize: idx < 3 ? '1.25rem' : '0.8rem',
                  fontFamily: 'Barlow Condensed, sans-serif',
                  fontWeight: 800, width: 32, textAlign: 'center', flexShrink: 0,
                }}>
                  {medals[idx] ?? `#${idx + 1}`}
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                    <Link
                      href={`/perfil/${v.perfil.id}`}
                      style={{
                        fontSize: '0.9rem', fontWeight: 600,
                        color: idx === 0 ? 'var(--lime)' : '#e0e0f0',
                        textDecoration: 'none', overflow: 'hidden',
                        textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        transition: 'opacity 0.15s',
                      }}
                      onMouseEnter={e => (e.currentTarget.style.opacity = '0.7')}
                      onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
                    >
                      {v.perfil.username}
                    </Link>
                    <span style={{
                      fontFamily: 'Barlow Condensed, sans-serif',
                      fontSize: '1rem', fontWeight: 800,
                      color: idx === 0 ? 'var(--lime)' : '#9a9ab5',
                      flexShrink: 0, marginLeft: '0.5rem',
                    }}>
                      {v.total}×
                    </span>
                  </div>
                  <div style={{ height: 4, background: 'rgba(255,255,255,0.06)', borderRadius: 2, overflow: 'hidden' }}>
                    <div style={{
                      height: '100%', borderRadius: 2, width: `${pct}%`,
                      background: idx === 0 ? 'var(--lime)' : 'rgba(255,255,255,0.2)',
                      transition: 'width 0.6s ease',
                    }} />
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* ── Grandes Voltas breakdown ────────────────── */}
      <div className="card-flush animate-fade-up delay-1">
        <div style={{ padding: '1rem 1.25rem 0.85rem', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
          <p style={{
            fontSize: '0.68rem', color: 'var(--lime)', fontWeight: 700,
            textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.15rem',
          }}>
            🏔️ Grandes Voltas
          </p>
          <h2 style={{
            fontFamily: 'Barlow Condensed, sans-serif', fontSize: '1.2rem',
            fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em',
          }}>
            Giro · Tour · Vuelta
          </h2>
        </div>

        {/* Table header */}
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr repeat(3, 64px)',
          padding: '0.5rem 1.25rem',
          background: 'rgba(255,255,255,0.03)',
          borderBottom: '1px solid rgba(255,255,255,0.07)',
        }}>
          <span style={{ fontSize: '0.65rem', color: '#6a6a86', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Jogador
          </span>
          {[
            { label: 'Giro', flag: '🇮🇹' },
            { label: 'Tour', flag: '🇫🇷' },
            { label: 'Vuelta', flag: '🇪🇸' },
          ].map(col => (
            <div key={col.label} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '0.85rem' }}>{col.flag}</div>
              <div style={{ fontSize: '0.6rem', color: '#6a6a86', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                {col.label}
              </div>
            </div>
          ))}
        </div>

        {/* Rows */}
        {vitorias.map((v, idx) => {
          const detalhe = grandesVoltas.find(g => g.userId === v.perfil.id)
          const giro   = detalhe?.giro   ?? 0
          const tour   = detalhe?.tour   ?? 0
          const vuelta = detalhe?.vuelta ?? 0

          return (
            <div
              key={v.perfil.id}
              className="table-row-alt"
              style={{
                display: 'grid', gridTemplateColumns: '1fr repeat(3, 64px)',
                padding: '0.75rem 1.25rem',
                borderBottom: idx < vitorias.length - 1 ? '1px solid rgba(255,255,255,0.07)' : 'none',
                alignItems: 'center',
              }}
            >
              <Link
                href={`/perfil/${v.perfil.id}`}
                style={{
                  fontSize: '0.88rem', fontWeight: 600,
                  color: idx === 0 ? 'var(--lime)' : '#e0e0f0',
                  textDecoration: 'none', overflow: 'hidden',
                  textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  transition: 'opacity 0.15s',
                }}
                onMouseEnter={e => (e.currentTarget.style.opacity = '0.7')}
                onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
              >
                {medals[idx] ?? ''} {v.perfil.username}
              </Link>

              {[giro, tour, vuelta].map((n, i) => (
                <div key={i} style={{ textAlign: 'center' }}>
                  <span style={{
                    fontFamily: 'Barlow Condensed, sans-serif',
                    fontSize: '1.25rem', fontWeight: 900,
                    color: n > 0 ? 'var(--lime)' : '#4a4a66',
                  }}>
                    {n > 0 ? n : '—'}
                  </span>
                </div>
              ))}
            </div>
          )
        })}
      </div>

    </div>
  )
}
