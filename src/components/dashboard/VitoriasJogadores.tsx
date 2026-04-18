'use client'

import Link from 'next/link'
import type { CategoriaProvaTipo, VitoriasJogador } from '@/types'

interface Props {
  vitorias: VitoriasJogador[]
}

const CATEGORIAS: { tipo: CategoriaProvaTipo; label: string; emoji: string }[] = [
  { tipo: 'grande_volta',  label: 'Grandes Voltas',      emoji: '🏔️' },
  { tipo: 'prova_semana',  label: 'Provas de uma semana', emoji: '📅' },
  { tipo: 'monumento',     label: 'Monumentos',           emoji: '🗿' },
  { tipo: 'prova_dia',     label: 'Provas de um dia',     emoji: '⚡' },
]

export default function VitoriasJogadores({ vitorias }: Props) {
  if (vitorias.length === 0) return null

  const categoriasComVitorias = CATEGORIAS.filter(c =>
    vitorias.some(v => v.porCategoria[c.tipo] > 0)
  )
  const maxTotal = Math.max(...vitorias.map(v => v.total))
  const medals = ['🥇', '🥈', '🥉']

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {/* Vitórias totais */}
      <div className="card-flush animate-fade-up">
        <div style={{ padding: '1rem 1.25rem 0.85rem', borderBottom: '1px solid var(--border)' }}>
          <p style={{ fontSize: '0.68rem', color: 'var(--lime)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.15rem' }}>
            🏆 Vitórias
          </p>
          <h2 style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '1.2rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Hall of Fame</h2>
        </div>
        <div style={{ padding: '0.75rem 1.25rem', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
          {vitorias.map((v, idx) => {
            const pct = maxTotal > 0 ? (v.total / maxTotal) * 100 : 0
            return (
              <div key={v.perfil.id} style={{
                display: 'flex', alignItems: 'center', gap: '0.75rem',
                padding: '0.75rem', borderRadius: '0.75rem',
                background: idx === 0 ? 'rgba(200,244,0,0.06)' : 'var(--surface-2)',
                border: `1px solid ${idx === 0 ? 'rgba(200,244,0,0.18)' : 'var(--border)'}`,
              }}>
                <span style={{
                  fontSize: idx < 3 ? '1.25rem' : '0.8rem',
                  fontFamily: 'Barlow Condensed, sans-serif',
                  fontWeight: 800, width: 32, textAlign: 'center', flexShrink: 0,
                  color: 'var(--text-dim)',
                }}>
                  {medals[idx] ?? `#${idx + 1}`}
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                    {/* Clickable name */}
                    <Link
                      href={`/perfil/${v.perfil.id}`}
                      style={{
                        fontSize: '0.9rem', fontWeight: 600,
                        color: idx === 0 ? 'var(--lime)' : 'var(--text)',
                        textDecoration: 'none',
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        transition: 'opacity 0.15s',
                      }}
                      onMouseEnter={e => (e.currentTarget.style.opacity = '0.75')}
                      onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
                    >
                      {v.perfil.username}
                    </Link>
                    <span style={{
                      fontFamily: 'Barlow Condensed, sans-serif',
                      fontSize: '1rem', fontWeight: 800,
                      color: idx === 0 ? 'var(--lime)' : 'var(--text-dim)',
                      flexShrink: 0, marginLeft: '0.5rem',
                    }}>
                      {v.total}×
                    </span>
                  </div>
                  <div style={{ height: 4, background: 'var(--bg)', borderRadius: 2, overflow: 'hidden' }}>
                    <div style={{
                      height: '100%', borderRadius: 2,
                      width: `${pct}%`,
                      background: idx === 0 ? 'var(--lime)' : 'var(--surface-2)',
                      border: idx === 0 ? 'none' : '1px solid var(--border-hi)',
                      transition: 'width 0.6s ease',
                    }} />
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Por categoria */}
      {categoriasComVitorias.length > 0 && (
        <div className="card-flush animate-fade-up delay-1">
          <div style={{ padding: '1rem 1.25rem 0.85rem', borderBottom: '1px solid var(--border)' }}>
            <p style={{ fontSize: '0.68rem', color: 'var(--lime)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.15rem' }}>
              🏅 Detalhe
            </p>
            <h2 style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '1.2rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Por Categoria</h2>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ background: 'var(--surface-2)' }}>
                  <th style={{ padding: '0.6rem 1.25rem', textAlign: 'left', fontSize: '0.68rem', color: 'var(--text-sub)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Jogador</th>
                  {categoriasComVitorias.map(c => (
                    <th key={c.tipo} style={{ padding: '0.6rem 0.75rem', textAlign: 'center', fontSize: '0.68rem', color: 'var(--text-sub)', fontWeight: 600, letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>
                      {c.emoji} {c.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {vitorias.map((v, idx) => (
                  <tr key={v.perfil.id} className="table-row-alt" style={{ borderTop: '1px solid var(--border)' }}>
                    <td style={{ padding: '0.7rem 1.25rem' }}>
                      <Link
                        href={`/perfil/${v.perfil.id}`}
                        style={{
                          color: idx === 0 ? 'var(--lime)' : 'var(--text)',
                          fontWeight: 500, textDecoration: 'none',
                          transition: 'opacity 0.15s',
                        }}
                        onMouseEnter={e => (e.currentTarget.style.opacity = '0.75')}
                        onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
                      >
                        {v.perfil.username}
                      </Link>
                    </td>
                    {categoriasComVitorias.map(c => {
                      const n = v.porCategoria[c.tipo]
                      return (
                        <td key={c.tipo} style={{ padding: '0.7rem 0.75rem', textAlign: 'center' }}>
                          <span style={{
                            fontFamily: 'Barlow Condensed, sans-serif',
                            fontSize: '1rem', fontWeight: 800,
                            color: n > 0 ? 'var(--lime)' : 'var(--text-sub)',
                          }}>
                            {n > 0 ? n : '—'}
                          </span>
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
