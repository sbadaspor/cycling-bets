'use client'

import { useState } from 'react'
import Link from 'next/link'
import type { CategoriaProvaTipo } from '@/types'

// ── Types ─────────────────────────────────────────────
export interface ResultadoApp {
  provaId: string
  nome: string
  ano: number
  posicao: number
  pontosTotal: number
  totalParticipantes: number
}

export interface EntradaPalmar {
  key: string
  nome: string
  ano: number
  categoria: CategoriaProvaTipo
  provaId?: string
  tipo: 'historica' | 'app'
}

interface Props {
  resultados: ResultadoApp[]
  palmares: EntradaPalmar[]
}

// ── Helpers ────────────────────────────────────────────
function tipoGrandeVolta(nome: string): 'giro' | 'tour' | 'vuelta' | null {
  const n = nome.toLowerCase()
  if (n.includes('giro'))   return 'giro'
  if (n.includes('tour'))   return 'tour'
  if (n.includes('vuelta')) return 'vuelta'
  return null
}

function labelCategoria(tipo: CategoriaProvaTipo) {
  const map: Record<CategoriaProvaTipo, { emoji: string; label: string }> = {
    grande_volta: { emoji: '🏔️', label: 'Grande Volta' },
    prova_semana: { emoji: '📅', label: 'Prova de uma semana' },
    monumento:    { emoji: '🗿', label: 'Monumento' },
    prova_dia:    { emoji: '⚡', label: 'Prova de um dia' },
  }
  return map[tipo] ?? { emoji: '🏆', label: tipo }
}

function posicaoLabel(pos: number) {
  if (pos === 1) return { text: '🥇 1.º', color: 'var(--lime)' }
  if (pos === 2) return { text: '🥈 2.º', color: '#c8d0d8' }
  if (pos === 3) return { text: '🥉 3.º', color: '#cd8b4a' }
  return { text: `${pos}.º`, color: '#9a9ab5' }
}

// ── Accordion wrapper ──────────────────────────────────
function Accordion({
  title, subtitle, count, children, defaultOpen = false,
}: {
  title: string
  subtitle?: string
  count?: number
  children: React.ReactNode
  defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <div className="card-flush">
      {/* Header / trigger */}
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '1rem 1.25rem', background: 'none', border: 'none', cursor: 'pointer',
          textAlign: 'left',
          borderBottom: open ? '1px solid rgba(255,255,255,0.1)' : 'none',
          transition: 'background 0.15s',
        }}
      >
        <div>
          {subtitle && (
            <p style={{
              fontSize: '0.68rem', color: 'var(--lime)', fontWeight: 700,
              textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.15rem',
            }}>
              {subtitle}
            </p>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <h2 style={{
              fontFamily: 'Barlow Condensed, sans-serif', fontSize: '1.2rem',
              fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em',
              color: 'var(--text)',
            }}>
              {title}
            </h2>
            {count !== undefined && (
              <span style={{
                fontFamily: 'Barlow Condensed, sans-serif',
                fontSize: '0.85rem', fontWeight: 800,
                background: 'rgba(200,244,0,0.12)', color: 'var(--lime)',
                border: '1px solid rgba(200,244,0,0.2)',
                padding: '0.1rem 0.5rem', borderRadius: '999px',
              }}>
                {count}
              </span>
            )}
          </div>
        </div>

        {/* Chevron */}
        <span style={{
          fontSize: '0.9rem', color: 'var(--lime)',
          transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
          transition: 'transform 0.2s ease', flexShrink: 0, marginLeft: '0.5rem',
        }}>
          ▼
        </span>
      </button>

      {/* Content */}
      {open && <div>{children}</div>}
    </div>
  )
}

// ── Main component ─────────────────────────────────────
export default function PerfilSections({ resultados, palmares }: Props) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

      {/* ── Os meus resultados ── */}
      <Accordion
        subtitle="📊 Histórico"
        title="Os meus resultados"
        count={resultados.length}
      >
        {resultados.length === 0 ? (
          <div style={{ padding: '2rem 1.25rem', textAlign: 'center', color: '#9a9ab5', fontSize: '0.875rem' }}>
            Ainda não há resultados registados na app.
          </div>
        ) : (
          <div>
            {resultados.map((r, idx) => {
              const { text: posText, color: posColor } = posicaoLabel(r.posicao)
              const tipo = tipoGrandeVolta(r.nome)
              const flag = tipo === 'giro' ? '🇮🇹' : tipo === 'tour' ? '🇫🇷' : tipo === 'vuelta' ? '🇪🇸' : '🏁'

              return (
                <Link
                  key={r.provaId}
                  href={`/provas/${r.provaId}`}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '0.875rem',
                    padding: '0.875rem 1.25rem', textDecoration: 'none',
                    borderBottom: idx < resultados.length - 1 ? '1px solid rgba(255,255,255,0.07)' : 'none',
                    transition: 'background 0.12s',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.03)')}
                  onMouseLeave={e => (e.currentTarget.style.background = '')}
                >
                  {/* Position */}
                  <div style={{
                    width: 48, flexShrink: 0, textAlign: 'center',
                    fontFamily: 'Barlow Condensed, sans-serif',
                    fontSize: '1rem', fontWeight: 900, color: posColor,
                  }}>
                    {posText}
                  </div>

                  {/* Divider */}
                  <div style={{ width: 1, height: 30, background: 'rgba(255,255,255,0.1)', flexShrink: 0 }} />

                  {/* Race info */}
                  <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontSize: '0.95rem', flexShrink: 0 }}>{flag}</span>
                    <div style={{ minWidth: 0 }}>
                      <p style={{
                        fontSize: '0.88rem', fontWeight: 600, color: '#e0e0f0',
                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                      }}>
                        {r.nome}
                      </p>
                      <p style={{ fontSize: '0.7rem', color: '#9a9ab5' }}>
                        de {r.totalParticipantes} participantes
                      </p>
                    </div>
                  </div>

                  {/* Points */}
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <span style={{
                      fontFamily: 'Barlow Condensed, sans-serif',
                      fontSize: '1.2rem', fontWeight: 900,
                      color: r.posicao === 1 ? 'var(--lime)' : '#b0b0c8',
                    }}>
                      {r.pontosTotal}
                    </span>
                    <span style={{ fontSize: '0.62rem', color: '#6a6a86', marginLeft: 2 }}>pts</span>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </Accordion>

      {/* ── Competições ganhas ── */}
      <Accordion
        subtitle="🏆 Historial"
        title="Competições Ganhas"
        count={palmares.length}
      >
        {palmares.length === 0 ? (
          <div style={{ padding: '2rem 1.25rem', textAlign: 'center', color: '#9a9ab5', fontSize: '0.875rem' }}>
            Ainda não há vitórias registadas.
          </div>
        ) : (
          <div>
            {palmares.map((entrada, idx) => {
              const cat = labelCategoria(entrada.categoria)
              const tipo = tipoGrandeVolta(entrada.nome)
              const flag = tipo === 'giro' ? '🇮🇹' : tipo === 'tour' ? '🇫🇷' : tipo === 'vuelta' ? '🇪🇸' : '🏆'

              const inner = (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: '1rem',
                  padding: '0.875rem 1.25rem',
                  borderBottom: idx < palmares.length - 1 ? '1px solid rgba(255,255,255,0.07)' : 'none',
                }}>
                  {/* Year */}
                  <span style={{
                    fontFamily: 'Barlow Condensed, sans-serif',
                    fontSize: '1.05rem', fontWeight: 900, color: 'var(--lime)',
                    width: 40, flexShrink: 0, textAlign: 'center',
                  }}>
                    {entrada.ano}
                  </span>

                  <div style={{ width: 1, height: 30, background: 'rgba(255,255,255,0.1)', flexShrink: 0 }} />

                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontSize: '1rem', flexShrink: 0 }}>{flag}</span>
                    <div style={{ minWidth: 0 }}>
                      <p style={{
                        fontSize: '0.9rem', fontWeight: 600,
                        color: entrada.provaId ? '#e0e0f0' : '#b0b0c8',
                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                      }}>
                        {entrada.nome}
                      </p>
                      <p style={{ fontSize: '0.7rem', color: '#9a9ab5', marginTop: '0.1rem' }}>
                        {cat.emoji} {cat.label}
                      </p>
                    </div>
                  </div>

                  {/* Badge */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
                    {entrada.tipo === 'historica' ? (
                      <span style={{
                        fontSize: '0.6rem', fontWeight: 700, color: '#9a9ab5',
                        background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)',
                        padding: '0.15rem 0.5rem', borderRadius: '999px',
                        textTransform: 'uppercase', letterSpacing: '0.06em',
                      }}>
                        Histórico
                      </span>
                    ) : (
                      <span style={{ fontSize: '0.75rem', color: 'var(--lime)', opacity: 0.7 }}>→</span>
                    )}
                    <span style={{ fontSize: '1rem' }}>🏆</span>
                  </div>
                </div>
              )

              return entrada.provaId ? (
                <Link
                  key={entrada.key}
                  href={`/provas/${entrada.provaId}`}
                  style={{ display: 'block', textDecoration: 'none', transition: 'background 0.12s' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.03)')}
                  onMouseLeave={e => (e.currentTarget.style.background = '')}
                >
                  {inner}
                </Link>
              ) : (
                <div key={entrada.key}>{inner}</div>
              )
            })}
          </div>
        )}
      </Accordion>

    </div>
  )
}
