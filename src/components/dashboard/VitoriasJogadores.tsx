'use client'

import Link from 'next/link'
import type { VitoriasJogador } from '@/types'

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

  return (
    <div className="card-flush animate-fade-up">
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

      {/* Cabeçalho */}
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

      {/* Linhas */}
      {vitorias.map((v, idx) => {
        const detalhe = grandesVoltas.find(g => g.userId === v.perfil.id)
        const giro   = detalhe?.giro   ?? 0
        const tour   = detalhe?.tour   ?? 0
        const vuelta = detalhe?.vuelta ?? 0
        const inicial = v.perfil.username?.[0]?.toUpperCase() ?? '?'

        return (
          <div
            key={v.perfil.id}
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
                display: 'flex', alignItems: 'center', gap: '0.6rem',
                textDecoration: 'none', overflow: 'hidden',
                transition: 'opacity 0.15s',
              }}
              onMouseEnter={e => (e.currentTarget.style.opacity = '0.7')}
              onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
            >
              {/* Avatar */}
              <div style={{
                width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                overflow: 'hidden',
                background: v.perfil.avatar_url ? 'transparent' : 'rgba(200,244,0,0.12)',
                border: '1.5px solid rgba(200,244,0,0.2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: 'Barlow Condensed, sans-serif',
                fontSize: '0.75rem', fontWeight: 900,
                color: 'var(--lime)',
              }}>
                {v.perfil.avatar_url
                  ? <img src={v.perfil.avatar_url} alt={v.perfil.username} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : inicial
                }
              </div>

              {/* Medalha + username */}
              <span style={{
                fontSize: '0.88rem', fontWeight: 600,
                color: idx === 0 ? 'var(--lime)' : '#e0e0f0',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {medals[idx] ?? ''} {v.perfil.username}
              </span>
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
  )
}
