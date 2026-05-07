'use client'

import { useState } from 'react'
import type { EtapaResultado, Aposta } from '@/types'
import { calcularPontos } from '@/lib/pontuacao'
import type { CategoriaProvaTipo } from '@/types'

interface Props {
  etapas: EtapaResultado[]
  apostas: Aposta[]
  categoria?: CategoriaProvaTipo
}

const CORES = ['#c8f400', '#3b9eff', '#ff9500', '#ff4d6d', '#a78bfa']

export default function MomentoDaVirada({ etapas, apostas, categoria }: Props) {
  const [tab, setTab] = useState<'posicao' | 'pontos'>('posicao')
  const [hoveredEtapa, setHoveredEtapa] = useState<number | null>(null)

  if (etapas.length < 2 || apostas.length < 2) return null

  // Calcular pontos de cada jogador em cada etapa (não cumulativo — cada etapa é independente)
  type Snapshot = { userId: string; username: string; pontos: number; posicao: number }
  const timeline: Array<{ etapa: EtapaResultado; snapshots: Snapshot[] }> = []

  for (const etapa of etapas) {
    const scores = apostas.map(aposta => {
      const calc = calcularPontos(
        aposta.apostas_top20 ?? [],
        etapa.classificacao_geral_top20 ?? [],
        {
          sprint: aposta.camisola_sprint ?? '',
          montanha: aposta.camisola_montanha ?? '',
          juventude: aposta.camisola_juventude ?? '',
        },
        {
          sprint: etapa.camisola_sprint ?? '',
          montanha: etapa.camisola_montanha ?? '',
          juventude: etapa.camisola_juventude ?? '',
        },
        categoria
      )
      return { userId: aposta.user_id, username: aposta.perfil?.username ?? '?', pontos: calc.pontos_total }
    }).sort((a, b) => b.pontos - a.pontos)

    const snapshots: Snapshot[] = scores.map((s, i) => ({
      ...s,
      posicao: i + 1,
    }))

    timeline.push({ etapa, snapshots })
  }

  const userIds = apostas.map(a => a.user_id)
  const nomes: Record<string, string> = {}
  apostas.forEach(a => { nomes[a.user_id] = a.perfil?.username ?? '?' })

  // Dados para o gráfico
  const W = 560
  const H = 180
  const paddingL = 28
  const paddingR = 16
  const paddingT = 16
  const paddingB = 32
  const chartW = W - paddingL - paddingR
  const chartH = H - paddingT - paddingB

  const numEtapas = timeline.length
  const xStep = numEtapas > 1 ? chartW / (numEtapas - 1) : chartW

  function xAt(i: number) {
    return paddingL + (numEtapas > 1 ? i * xStep : chartW / 2)
  }

  // Eixo Y para posição: 1 no topo, N em baixo
  function yPosicao(pos: number) {
    const maxPos = apostas.length
    return paddingT + ((pos - 1) / Math.max(maxPos - 1, 1)) * chartH
  }

  // Eixo Y para pontos: max no topo, 0 em baixo
  const maxPontos = Math.max(...timeline.flatMap(t => t.snapshots.map(s => s.pontos)), 1)
  function yPontos(pts: number) {
    return paddingT + chartH - (pts / maxPontos) * chartH
  }

  function buildPath(userId: string) {
    return timeline.map((t, i) => {
      const s = t.snapshots.find(x => x.userId === userId)
      if (!s) return ''
      const x = xAt(i)
      const y = tab === 'posicao' ? yPosicao(s.posicao) : yPontos(s.pontos)
      return `${i === 0 ? 'M' : 'L'} ${x} ${y}`
    }).filter(Boolean).join(' ')
  }

  const ultimaEtapa = timeline[timeline.length - 1]
  const etapaHovered = hoveredEtapa !== null ? timeline[hoveredEtapa] : null

  return (
    <div className="card-flush animate-fade-up" style={{ overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ padding: '0.875rem 1.25rem', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <p style={{ fontSize: '0.68rem', color: 'var(--lime)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.15rem' }}>⚡ Evolução</p>
          <h2 style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '1.2rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Etapa a Etapa</h2>
        </div>
        {/* Tabs posição / pontos */}
        <div style={{ display: 'flex', gap: '0.35rem' }}>
          {(['posicao', 'pontos'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                padding: '0.3rem 0.7rem', borderRadius: '0.5rem', fontSize: '0.72rem', fontWeight: 700,
                cursor: 'pointer', fontFamily: 'DM Sans, sans-serif',
                border: tab === t ? '1px solid var(--lime)' : '1px solid var(--border)',
                background: tab === t ? 'rgba(200,244,0,0.12)' : 'var(--surface-2)',
                color: tab === t ? 'var(--lime)' : 'var(--text-dim)',
              }}
            >
              {t === 'posicao' ? '🏅 Posição' : '⚡ Pontos'}
            </button>
          ))}
        </div>
      </div>

      {/* Legenda */}
      <div style={{ padding: '0.6rem 1.25rem', borderBottom: '1px solid var(--border)', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
        {userIds.map((uid, i) => (
          <div key={uid} style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <div style={{ width: 20, height: 3, borderRadius: 2, background: CORES[i % CORES.length] }} />
            <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', fontWeight: 600 }}>{nomes[uid]}</span>
          </div>
        ))}
      </div>

      {/* Gráfico SVG */}
      <div style={{ padding: '0.5rem 1rem 0', position: 'relative' }}>
        <svg
          width="100%"
          viewBox={`0 0 ${W} ${H}`}
          style={{ overflow: 'visible', display: 'block' }}
          onMouseLeave={() => setHoveredEtapa(null)}
        >
          {/* Linhas de grelha horizontais */}
          {tab === 'posicao'
            ? userIds.map((_, i) => {
                const y = yPosicao(i + 1)
                return (
                  <line key={i} x1={paddingL} y1={y} x2={W - paddingR} y2={y}
                    stroke="rgba(255,255,255,0.05)" strokeWidth={0.5} />
                )
              })
            : [0, 0.25, 0.5, 0.75, 1].map((f, i) => {
                const y = paddingT + chartH - f * chartH
                return (
                  <g key={i}>
                    <line x1={paddingL} y1={y} x2={W - paddingR} y2={y}
                      stroke="rgba(255,255,255,0.05)" strokeWidth={0.5} />
                    <text x={paddingL - 4} y={y + 4} textAnchor="end"
                      fill="rgba(255,255,255,0.25)" fontSize={9} fontFamily="Barlow Condensed, sans-serif">
                      {Math.round(f * maxPontos)}
                    </text>
                  </g>
                )
              })
          }

          {/* Labels eixo Y posição */}
          {tab === 'posicao' && userIds.map((_, i) => (
            <text key={i} x={paddingL - 4} y={yPosicao(i + 1) + 4} textAnchor="end"
              fill="rgba(255,255,255,0.25)" fontSize={9} fontFamily="Barlow Condensed, sans-serif">
              {i + 1}º
            </text>
          ))}

          {/* Labels eixo X (etapas) */}
          {timeline.map((t, i) => (
            <text key={i} x={xAt(i)} y={H - 4} textAnchor="middle"
              fill="rgba(255,255,255,0.3)" fontSize={9} fontFamily="Barlow Condensed, sans-serif">
              {t.etapa.is_final ? '🏁' : `E${t.etapa.numero_etapa}`}
            </text>
          ))}

          {/* Linha vertical de hover */}
          {hoveredEtapa !== null && (
            <line
              x1={xAt(hoveredEtapa)} y1={paddingT}
              x2={xAt(hoveredEtapa)} y2={paddingT + chartH}
              stroke="rgba(255,255,255,0.15)" strokeWidth={1} strokeDasharray="3 3"
            />
          )}

          {/* Linhas de cada jogador */}
          {userIds.map((uid, i) => (
            <path
              key={uid}
              d={buildPath(uid)}
              fill="none"
              stroke={CORES[i % CORES.length]}
              strokeWidth={2}
              strokeLinejoin="round"
              strokeLinecap="round"
              opacity={hoveredEtapa !== null ? 0.4 : 1}
              style={{ transition: 'opacity 0.15s' }}
            />
          ))}

          {/* Pontos interactivos */}
          {timeline.map((t, etapaIdx) =>
            userIds.map((uid, i) => {
              const s = t.snapshots.find(x => x.userId === uid)
              if (!s) return null
              const x = xAt(etapaIdx)
              const y = tab === 'posicao' ? yPosicao(s.posicao) : yPontos(s.pontos)
              const isHovered = hoveredEtapa === etapaIdx
              return (
                <circle
                  key={uid}
                  cx={x} cy={y}
                  r={isHovered ? 5 : 3}
                  fill={CORES[i % CORES.length]}
                  stroke="var(--surface-1, #0a0a0a)"
                  strokeWidth={1.5}
                  opacity={isHovered ? 1 : 0.8}
                  style={{ transition: 'r 0.1s, opacity 0.1s', cursor: 'pointer' }}
                  onMouseEnter={() => setHoveredEtapa(etapaIdx)}
                />
              )
            })
          )}

          {/* Área invisível para capturar hover por coluna */}
          {timeline.map((_, i) => (
            <rect
              key={i}
              x={xAt(i) - xStep / 2}
              y={paddingT}
              width={xStep}
              height={chartH}
              fill="transparent"
              onMouseEnter={() => setHoveredEtapa(i)}
            />
          ))}
        </svg>

        {/* Tooltip */}
        {etapaHovered && (
          <div style={{
            position: 'absolute', top: 8,
            left: Math.min(xAt(hoveredEtapa!) / W * 100, 60) + '%',
            background: 'var(--surface-2)', border: '1px solid var(--border)',
            borderRadius: '0.5rem', padding: '0.5rem 0.75rem',
            fontSize: '0.75rem', pointerEvents: 'none', zIndex: 10,
            minWidth: 140,
          }}>
            <p style={{ fontSize: '0.65rem', color: 'var(--text-sub)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.35rem' }}>
              {etapaHovered.etapa.is_final ? '🏁 Final' : `Etapa ${etapaHovered.etapa.numero_etapa}`}
            </p>
            {etapaHovered.snapshots.map((s, i) => (
              <div key={s.userId} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.15rem 0' }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: CORES[userIds.indexOf(s.userId) % CORES.length], flexShrink: 0 }} />
                <span style={{ flex: 1, color: 'var(--text-dim)' }}>{s.username}</span>
                <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 800, color: i === 0 ? 'var(--lime)' : 'var(--text)' }}>
                  {tab === 'posicao' ? `${s.posicao}º` : `${s.pontos}pts`}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Classificação da última etapa */}
      <div style={{ padding: '0.875rem 1.25rem', borderTop: '1px solid var(--border)', marginTop: '0.25rem' }}>
        <p style={{ fontSize: '0.65rem', color: 'var(--text-sub)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.5rem' }}>
          Última etapa — E{ultimaEtapa.etapa.numero_etapa}
        </p>
        {ultimaEtapa.snapshots.map((s, i) => (
          <div key={s.userId} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.3rem 0', borderBottom: i < ultimaEtapa.snapshots.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: CORES[userIds.indexOf(s.userId) % CORES.length], flexShrink: 0 }} />
            <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '0.85rem', fontWeight: 800, color: i === 0 ? 'var(--lime)' : 'var(--text-sub)', width: 24 }}>
              {i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉'}
            </span>
            <span style={{ flex: 1, fontSize: '0.875rem', fontWeight: 600, color: i === 0 ? 'var(--lime)' : 'var(--text)' }}>{s.username}</span>
            <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '1rem', fontWeight: 800, color: i === 0 ? 'var(--lime)' : 'var(--text)' }}>{s.pontos}pts</span>
          </div>
        ))}
      </div>
    </div>
  )
}
