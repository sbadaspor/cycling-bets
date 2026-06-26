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

const PLAYER_COLORS = ['#E0451F', '#2563EB', '#16A34A', '#E8488B', '#EAB308']
const MUTED = '#B3AC9B'

export default function VitoriasJogadores({ vitorias, grandesVoltas = [] }: Props) {
  if (vitorias.length === 0) return null

  return (
    <section style={{ background: '#fff', border: '1px solid #E9E4D9', borderRadius: 16, padding: 22 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 18 }}>
        <h2 style={{ font: "700 18px 'Archivo', sans-serif", color: '#16140F', margin: 0 }}>
          Grandes Voltas
        </h2>
        <span style={{ font: "500 12px 'Archivo', sans-serif", color: '#A79F8E' }}>
          — palmarés histórico
        </span>
      </div>

      {/* Cabeçalho da tabela */}
      <div style={{
        display: 'grid', gridTemplateColumns: '1fr 64px 64px 64px 76px',
        alignItems: 'center', padding: '0 6px 12px',
        borderBottom: '1px solid #ECE8DE',
      }}>
        <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#A79F8E' }}>
          Jogador
        </div>
        {[
          { label: 'GIRO',   dot: '#E8488B' },
          { label: 'TOUR',   dot: '#EAB308' },
          { label: 'VUELTA', dot: '#D6322B' },
        ].map(col => (
          <div key={col.label} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}>
            <span style={{ width: 9, height: 9, borderRadius: '50%', background: col.dot, display: 'inline-block' }} />
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, fontWeight: 600, letterSpacing: '0.06em', color: '#857E6F' }}>
              {col.label}
            </span>
          </div>
        ))}
        <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, fontWeight: 600, letterSpacing: '0.06em', color: '#857E6F', textAlign: 'center' }}>
          TOTAL
        </div>
      </div>

      {/* Linhas */}
      {vitorias.map((v, idx) => {
        const detalhe = grandesVoltas.find(g => g.userId === v.perfil.id)
        const giro   = detalhe?.giro   ?? 0
        const tour   = detalhe?.tour   ?? 0
        const vuelta = detalhe?.vuelta ?? 0
        const total  = giro + tour + vuelta
        const cor    = PLAYER_COLORS[idx] ?? '#A79F8E'
        const inicial = v.perfil.username?.[0]?.toUpperCase() ?? '?'
        const nome = v.perfil.full_name || v.perfil.username

        return (
          <div
            key={v.perfil.id}
            style={{
              display: 'grid', gridTemplateColumns: '1fr 64px 64px 64px 76px',
              alignItems: 'center', padding: '14px 6px',
              borderBottom: idx < vitorias.length - 1 ? '1px solid #F1EDE3' : 'none',
            }}
          >
            <Link
              href={`/perfil/${v.perfil.id}`}
              style={{ display: 'flex', alignItems: 'center', gap: 11, textDecoration: 'none' }}
            >
              <div style={{
                width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
                background: v.perfil.avatar_url ? 'transparent' : cor,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                font: "700 11px 'Archivo', sans-serif", color: '#fff', overflow: 'hidden',
              }}>
                {v.perfil.avatar_url
                  ? <img src={v.perfil.avatar_url} alt={nome} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : inicial
                }
              </div>
              <span style={{ font: "700 15px 'Archivo', sans-serif", color: '#16140F' }}>{nome}</span>
            </Link>

            {[giro, tour, vuelta].map((n, i) => (
              <div key={i} style={{ textAlign: 'center', font: "700 16px 'Archivo', sans-serif", color: n > 0 ? '#16140F' : MUTED }}>
                {n > 0 ? n : '—'}
              </div>
            ))}

            <div style={{ textAlign: 'center' }}>
              <span style={{
                display: 'inline-block', minWidth: 30, padding: '4px 9px',
                borderRadius: 8, background: '#F4F0E6', border: '1px solid #E9E4D9',
                font: "700 14px 'Archivo', sans-serif", color: '#16140F',
              }}>
                {total}
              </span>
            </div>
          </div>
        )
      })}
    </section>
  )
}
