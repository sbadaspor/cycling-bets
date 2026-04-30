'use client'

import { useState } from 'react'
import Link from 'next/link'
import type { CategoriaProvaTipo } from '@/types'
import { tipoGrandeVolta } from '@/lib/provaUtils'

// ── Types ─────────────────────────────────────────────
export interface ResultadoApp {
  provaId: string
  nome: string
  ano: number
  posicao: number
  pontosTotal: number
  totalParticipantes: number
}

export interface ResultadoHistorico {
  id: string
  nome: string
  ano: number
  posicao: number       // posicao_grupo
  pontosTotal: number
  apostasTop: string[]
  resultadoRealTop: string[]
  camisolaSprint?: string | null
  camisolaSprintReal?: string | null
  camisolaMontanha?: string | null
  camisolaMontanhaReal?: string | null
  camisolaJuventude?: string | null
  camisolaJuventudeReal?: string | null
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
  resultadosHistoricos?: ResultadoHistorico[]
  palmares: EntradaPalmar[]
}

// ── Helpers ────────────────────────────────────────────
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
    <div className="card-flush" style={{ overflow: 'hidden' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '1rem 1.25rem', background: 'none', border: 'none', cursor: 'pointer',
          textAlign: 'left',
        }}
      >
        <div>
          {subtitle && (
            <p style={{ fontSize: '0.65rem', color: 'var(--lime)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.15rem' }}>
              {subtitle}
            </p>
          )}
          <h2 style={{
            fontFamily: 'Barlow Condensed, sans-serif', fontSize: '1.2rem',
            fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em',
            color: 'var(--text)',
          }}>
            {title}
            {count !== undefined && (
              <span style={{
                marginLeft: '0.5rem', fontSize: '0.72rem', fontWeight: 700,
                background: 'var(--surface-2)', color: 'var(--text-dim)',
                border: '1px solid var(--border-hi)',
                padding: '0.15rem 0.45rem', borderRadius: '999px', verticalAlign: 'middle',
              }}>{count}</span>
            )}
          </h2>
        </div>
        <span style={{ color: 'var(--text-dim)', fontSize: '0.85rem', flexShrink: 0 }}>
          {open ? '▲' : '▼'}
        </span>
      </button>
      {open && <div style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}>{children}</div>}
    </div>
  )
}

// ── Detalhe de aposta histórica ───────────────────────
function DetalheHistorico({ r }: { r: ResultadoHistorico }) {
  const realSet = new Set((r.resultadoRealTop ?? []).map(n => n.trim().toLowerCase()).filter(Boolean))

  return (
    <div style={{ background: 'rgba(0,0,0,0.2)', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
      <div style={{ padding: '0.5rem 1.25rem', background: 'rgba(255,255,255,0.02)' }}>
        <p style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          A minha aposta vs resultado real
        </p>
      </div>
      {(r.apostasTop ?? []).map((nome, i) => {
        if (!nome?.trim()) return null
        const acertou = realSet.has(nome.trim().toLowerCase())
        const posReal = (r.resultadoRealTop ?? []).findIndex(n => n.trim().toLowerCase() === nome.trim().toLowerCase()) + 1
        return (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.4rem 1.25rem', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
            <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '0.75rem', fontWeight: 800, width: 20, textAlign: 'center', color: 'var(--text-sub)', flexShrink: 0 }}>{i + 1}</span>
            <span style={{ flex: 1, fontSize: '0.82rem', color: acertou ? 'var(--text)' : 'var(--text-dim)' }}>{nome}</span>
            {acertou
              ? <span style={{ fontSize: '0.7rem', color: '#44cc88', fontWeight: 700, flexShrink: 0 }}>✅ {posReal}º · +1pt</span>
              : <span style={{ fontSize: '0.7rem', color: 'rgba(255,107,107,0.6)', flexShrink: 0 }}>❌</span>
            }
          </div>
        )
      })}
      {/* Camisolas */}
      {[
        { label: '🟢 Sprint', apostada: r.camisolaSprint, real: r.camisolaSprintReal },
        { label: '🔴 Montanha', apostada: r.camisolaMontanha, real: r.camisolaMontanhaReal },
        { label: '⚪ Juventude', apostada: r.camisolaJuventude, real: r.camisolaJuventudeReal },
      ].filter(c => c.apostada).map(({ label, apostada, real }) => {
        const acertou = apostada && real && apostada.trim().toLowerCase() === real.trim().toLowerCase()
        return (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.4rem 1.25rem', borderTop: '1px solid var(--border)', background: 'rgba(255,255,255,0.01)' }}>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-sub)', width: 20, flexShrink: 0 }}>🎽</span>
            <span style={{ flex: 1, fontSize: '0.8rem', color: 'var(--text-dim)' }}>{label}: {apostada}</span>
            {acertou
              ? <span style={{ fontSize: '0.7rem', color: '#44cc88', fontWeight: 700 }}>✅ +1pt · Real: {real}</span>
              : <span style={{ fontSize: '0.7rem', color: 'var(--text-sub)' }}>Real: {real || '?'}</span>
            }
          </div>
        )
      })}
    </div>
  )
}

// ── Row de resultado histórico ─────────────────────────
function ResultadoHistoricoRow({ r, isLast }: { r: ResultadoHistorico; isLast: boolean }) {
  const [expandido, setExpandido] = useState(false)
  const { text: posText, color: posColor } = posicaoLabel(r.posicao)
  const tipo = tipoGrandeVolta(r.nome)
  const flag = tipo === 'giro' ? '🇮🇹' : tipo === 'tour' ? '🇫🇷' : tipo === 'vuelta' ? '🇪🇸' : '🏁'

  return (
    <div style={{ borderBottom: !isLast || expandido ? '1px solid rgba(255,255,255,0.07)' : 'none' }}>
      <button
        onClick={() => setExpandido(e => !e)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: '0.875rem',
          padding: '0.875rem 1.25rem', background: 'none', border: 'none', cursor: 'pointer',
          textAlign: 'left',
          transition: 'background 0.12s',
        }}
        onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.03)')}
        onMouseLeave={e => (e.currentTarget.style.background = '')}
      >
        <div style={{ width: 48, flexShrink: 0, textAlign: 'center', fontFamily: 'Barlow Condensed, sans-serif', fontSize: '1rem', fontWeight: 900, color: posColor }}>
          {posText}
        </div>
        <div style={{ width: 1, height: 30, background: 'rgba(255,255,255,0.1)', flexShrink: 0 }} />
        <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '0.95rem', flexShrink: 0 }}>{flag}</span>
          <div style={{ minWidth: 0 }}>
            <p style={{ fontSize: '0.88rem', fontWeight: 600, color: '#e0e0f0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {r.nome}
            </p>
            <p style={{ fontSize: '0.7rem', color: '#9a9ab5' }}>{r.ano} · histórico</p>
          </div>
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <div>
            <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '1.2rem', fontWeight: 900, color: r.posicao === 1 ? 'var(--lime)' : '#b0b0c8' }}>{r.pontosTotal}</span>
            <span style={{ fontSize: '0.62rem', color: '#6a6a86', marginLeft: 2 }}>pts</span>
          </div>
          <span style={{ fontSize: '0.7rem', color: 'var(--text-sub)' }}>{expandido ? '▲' : '▼'}</span>
        </div>
      </button>
      {expandido && <DetalheHistorico r={r} />}
    </div>
  )
}

// ── Main component ─────────────────────────────────────
export default function PerfilSections({ resultados, resultadosHistoricos = [], palmares }: Props) {
  // Merge e ordenar tudo por ano desc, depois por nome
  const todosResultados: Array<
    | ({ tipo: 'app' } & ResultadoApp)
    | ({ tipo: 'historico' } & ResultadoHistorico)
  > = [
    ...resultados.map(r => ({ tipo: 'app' as const, ...r })),
    ...resultadosHistoricos.map(r => ({ tipo: 'historico' as const, ...r })),
  ].sort((a, b) => {
    const anoA = a.tipo === 'app' ? a.ano : a.ano
    const anoB = b.tipo === 'app' ? b.ano : b.ano
    if (anoB !== anoA) return anoB - anoA
    const nomeA = a.tipo === 'app' ? a.nome : a.nome
    const nomeB = b.tipo === 'app' ? b.nome : b.nome
    return nomeA.localeCompare(nomeB)
  })

  const total = todosResultados.length

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

      {/* ── Os meus resultados ── */}
      <Accordion subtitle="📊 Histórico" title="Os meus resultados" count={total} defaultOpen={total > 0}>
        {total === 0 ? (
          <div style={{ padding: '2rem 1.25rem', textAlign: 'center', color: '#9a9ab5', fontSize: '0.875rem' }}>
            Ainda não há resultados registados.
          </div>
        ) : (
          <div>
            {todosResultados.map((r, idx) => {
              if (r.tipo === 'historico') {
                return (
                  <ResultadoHistoricoRow key={`h-${r.id}`} r={r} isLast={idx === total - 1} />
                )
              }
              // App result
              const { text: posText, color: posColor } = posicaoLabel(r.posicao)
              const tipo = tipoGrandeVolta(r.nome)
              const flag = tipo === 'giro' ? '🇮🇹' : tipo === 'tour' ? '🇫🇷' : tipo === 'vuelta' ? '🇪🇸' : '🏁'
              const borderBottom = idx < total - 1 ? '1px solid rgba(255,255,255,0.07)' : 'none'
              return (
                <Link
                  key={`app-${r.provaId}`}
                  href={`/provas/${r.provaId}`}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.875rem', padding: '0.875rem 1.25rem', textDecoration: 'none', borderBottom, transition: 'background 0.12s' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.03)')}
                  onMouseLeave={e => (e.currentTarget.style.background = '')}
                >
                  <div style={{ width: 48, flexShrink: 0, textAlign: 'center', fontFamily: 'Barlow Condensed, sans-serif', fontSize: '1rem', fontWeight: 900, color: posColor }}>{posText}</div>
                  <div style={{ width: 1, height: 30, background: 'rgba(255,255,255,0.1)', flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontSize: '0.95rem', flexShrink: 0 }}>{flag}</span>
                    <div style={{ minWidth: 0 }}>
                      <p style={{ fontSize: '0.88rem', fontWeight: 600, color: '#e0e0f0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.nome}</p>
                      <p style={{ fontSize: '0.7rem', color: '#9a9ab5' }}>{r.ano} · de {r.totalParticipantes} participantes</p>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '1.2rem', fontWeight: 900, color: r.posicao === 1 ? 'var(--lime)' : '#b0b0c8' }}>{r.pontosTotal}</span>
                    <span style={{ fontSize: '0.62rem', color: '#6a6a86', marginLeft: 2 }}>pts</span>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </Accordion>

      {/* ── Competições ganhas ── */}
      <Accordion subtitle="🏆 Historial" title="Competições Ganhas" count={palmares.length}>
        {palmares.length === 0 ? (
          <div style={{ padding: '2rem 1.25rem', textAlign: 'center', color: '#9a9ab5', fontSize: '0.875rem' }}>
            Ainda sem vitórias registadas.
          </div>
        ) : (
          <div>
            {palmares.map((entrada, idx) => {
              const tipo = tipoGrandeVolta(entrada.nome)
              const flag = tipo === 'giro' ? '🇮🇹' : tipo === 'tour' ? '🇫🇷' : tipo === 'vuelta' ? '🇪🇸' : null
              const { emoji, label } = labelCategoria(entrada.categoria)
              const inner = (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: '0.875rem',
                  padding: '0.875rem 1.25rem',
                  borderBottom: idx < palmares.length - 1 ? '1px solid rgba(255,255,255,0.07)' : 'none',
                  transition: 'background 0.12s',
                }}>
                  <div style={{ width: 48, flexShrink: 0, textAlign: 'center', fontFamily: 'Barlow Condensed, sans-serif', fontSize: '1.25rem', fontWeight: 900, color: 'var(--lime)' }}>
                    🥇
                  </div>
                  <div style={{ width: 1, height: 30, background: 'rgba(255,255,255,0.1)', flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontSize: '0.95rem', flexShrink: 0 }}>{flag ?? emoji}</span>
                    <div style={{ minWidth: 0 }}>
                      <p style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--lime)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {entrada.nome}
                      </p>
                      <p style={{ fontSize: '0.7rem', color: '#9a9ab5' }}>{entrada.ano} · {label}</p>
                    </div>
                  </div>
                  <div style={{ fontSize: '1rem', color: 'var(--lime)', flexShrink: 0 }}>→</div>
                </div>
              )
              return entrada.provaId
                ? (
                  <Link key={entrada.key} href={`/provas/${entrada.provaId}`} style={{ display: 'block', textDecoration: 'none' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.03)')}
                    onMouseLeave={e => (e.currentTarget.style.background = '')}
                  >{inner}</Link>
                )
                : <div key={entrada.key}>{inner}</div>
            })}
          </div>
        )}
      </Accordion>
    </div>
  )
}
