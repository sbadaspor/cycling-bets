'use client'

import { useEffect, useRef, useState } from 'react'
import type { EtapaResultado, Aposta } from '@/types'
import { calcularPontos } from '@/lib/pontuacao'
import type { CategoriaProvaTipo } from '@/types'
import { getConfigCategoria } from '@/lib/categoriaConfig'
import { nomeExibir } from '@/lib/perfil'

interface Props {
  etapas: EtapaResultado[]
  apostas: Aposta[]
  categoria?: CategoriaProvaTipo
}

const PLAYER_COLORS = ['#E0451F', '#2563EB', '#16A34A', '#E8488B', '#EAB308']

export default function MomentoDaVirada({ etapas, apostas, categoria }: Props) {
  if (etapas.length < 2 || apostas.length < 2) return null

  getConfigCategoria(categoria)

  // ── 1. Calcular pontos por etapa (não acumulado) ──────────────────
  type Snapshot = { userId: string; nome: string; pontos: number; lider: boolean }
  const timeline: Array<{ etapa: EtapaResultado; snapshots: Snapshot[] }> = []

  for (const etapa of etapas) {
    const snapshots: Snapshot[] = apostas
      .map(aposta => {
        const r = calcularPontos(
          aposta.apostas_top20 ?? [],
          etapa.classificacao_geral_top20 ?? [],
          { sprint: aposta.camisola_sprint ?? '', montanha: aposta.camisola_montanha ?? '', juventude: aposta.camisola_juventude ?? '' },
          { sprint: etapa.camisola_sprint ?? '', montanha: etapa.camisola_montanha ?? '', juventude: etapa.camisola_juventude ?? '' },
          categoria
        )
        return { userId: aposta.user_id, nome: nomeExibir(aposta.perfil, '?'), pontos: r.pontos_total, lider: false }
      })
      .sort((a, b) => b.pontos - a.pontos)
    snapshots.forEach((s, i) => { s.lider = i === 0 })
    timeline.push({ etapa, snapshots })
  }

  // ── 2. Ranking final & cores ──────────────────────────────────────
  const rankingFinal = timeline[timeline.length - 1].snapshots
  const jogadores = rankingFinal.map((s, rank) => ({
    userId: s.userId, nome: s.nome, cor: PLAYER_COLORS[rank] ?? '#A79F8E',
  }))

  // ── 3. Todas as mudanças de liderança ─────────────────────────────
  const mudancas: Array<{ etapa: EtapaResultado; novoLider: string; pontos: number }> = []
  for (let i = 1; i < timeline.length; i++) {
    const antes = timeline[i - 1].snapshots[0]?.userId
    const depois = timeline[i].snapshots[0]?.userId
    if (antes !== depois) {
      mudancas.push({
        etapa: timeline[i].etapa,
        novoLider: timeline[i].snapshots[0].nome,
        pontos: timeline[i].snapshots[0].pontos,
      })
    }
  }
  const ultimaMudanca = mudancas[mudancas.length - 1] ?? null

  // ── 4. Séries para o gráfico ──────────────────────────────────────
  const seriesMap: Record<string, number[]> = {}
  jogadores.forEach(j => { seriesMap[j.userId] = [] })
  timeline.forEach(t => {
    jogadores.forEach(j => {
      const snap = t.snapshots.find(s => s.userId === j.userId)
      seriesMap[j.userId].push(snap?.pontos ?? 0)
    })
  })

  // ── 5. SVG dimensions ─────────────────────────────────────────────
  const W = 720, H = 272
  const padL = 48, padR = 20, padT = 20, padB = 36
  const chartW = W - padL - padR
  const chartH = H - padT - padB
  const numEtapas = timeline.length
  const maxPts = Math.max(...Object.values(seriesMap).flat(), 1)

  function toX(i: number) { return padL + (i / Math.max(numEtapas - 1, 1)) * chartW }
  function toY(pts: number) { return padT + chartH - (pts / maxPts) * chartH }

  const gridLines = Array.from({ length: 5 }, (_, i) => {
    const pts = Math.round((maxPts / 4) * (4 - i))
    return { y: toY(pts), ty: toY(pts) + 4, label: pts }
  })
  const step = Math.max(1, Math.floor(numEtapas / 8))
  const xticks = timeline
    .filter((_, i) => i % step === 0 || i === numEtapas - 1)
    .map(t => ({ x: toX(timeline.indexOf(t)), label: t.etapa.is_final ? 'FIM' : `E${t.etapa.numero_etapa}` }))

  const annIdx = ultimaMudanca ? timeline.findIndex(t => t.etapa.id === ultimaMudanca.etapa.id) : -1
  const annX = annIdx >= 0 ? toX(annIdx) : null

  // ── 6. Animação ───────────────────────────────────────────────────
  const svgRef = useRef<SVGSVGElement>(null)
  const [progress, setProgress] = useState(0) // 0→1
  const animRef = useRef<number | null>(null)
  const startRef = useRef<number | null>(null)
  const DURATION = 1200 // ms

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          observer.disconnect()
          startRef.current = null
          const animate = (ts: number) => {
            if (!startRef.current) startRef.current = ts
            const p = Math.min((ts - startRef.current) / DURATION, 1)
            // ease-out cubic
            setProgress(1 - Math.pow(1 - p, 3))
            if (p < 1) animRef.current = requestAnimationFrame(animate)
          }
          animRef.current = requestAnimationFrame(animate)
        }
      },
      { threshold: 0.2 }
    )
    if (svgRef.current) observer.observe(svgRef.current)
    return () => {
      observer.disconnect()
      if (animRef.current) cancelAnimationFrame(animRef.current)
    }
  }, [])

  // Calcula pontos interpolados até progress * numEtapas
  function animatedPoints(userId: string): string {
    const series = seriesMap[userId] ?? []
    const visible = progress * (numEtapas - 1) // etapas visíveis (com decimais)
    return series
      .map((pts, i) => {
        if (i > Math.ceil(visible)) return null
        // Última etapa visível: interpolar parcialmente
        const y = i < visible
          ? toY(pts)
          : toY(series[Math.floor(visible)] ?? 0) // etapa incompleta mostra ponto atual
        return `${toX(i)},${y}`
      })
      .filter(Boolean)
      .join(' ')
  }

  // ── 7. Modal histórico de mudanças ────────────────────────────────
  const [modalAberto, setModalAberto] = useState(false)

  return (
    <section style={{ background: '#fff', border: '1px solid #E9E4D9', borderRadius: 16, padding: 22, position: 'relative' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 6 }}>
        <div>
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, fontWeight: 600, letterSpacing: '0.16em', textTransform: 'uppercase', color: '#A79F8E' }}>
            Análise
          </div>
          <h2 style={{ font: "700 18px 'Archivo', sans-serif", color: '#16140F', margin: '6px 0 0' }}>
            Evolução etapa a etapa
          </h2>
        </div>
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center' }}>
          {jogadores.map(j => (
            <div key={j.userId} style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              <span style={{ width: 10, height: 10, borderRadius: '50%', background: j.cor, display: 'inline-block', flexShrink: 0 }} />
              <span style={{ font: "600 12px 'Archivo', sans-serif", color: '#4A463D' }}>{j.nome}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Badge clicável — última mudança de liderança */}
      {ultimaMudanca && (
        <button
          onClick={() => setModalAberto(true)}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            margin: '4px 0 14px', padding: '7px 12px',
            borderRadius: 8, background: '#FBF2D9', border: '1px solid #F0E2B0',
            cursor: 'pointer', textAlign: 'left',
            transition: 'background 0.15s, border-color 0.15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = '#F5E8A0'; e.currentTarget.style.borderColor = '#D4C060' }}
          onMouseLeave={e => { e.currentTarget.style.background = '#FBF2D9'; e.currentTarget.style.borderColor = '#F0E2B0' }}
        >
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#A37A0A' }}>
            Etapa {ultimaMudanca.etapa.numero_etapa} · Mudança de liderança
          </span>
          <span style={{ font: "500 12px 'Archivo', sans-serif", color: '#6B5E2E' }}>
            {ultimaMudanca.novoLider} passou para a frente com {ultimaMudanca.pontos} pts
          </span>
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: '#A37A0A', marginLeft: 4 }}>
            {mudancas.length > 1 ? `+${mudancas.length - 1} mais →` : '→'}
          </span>
        </button>
      )}

      {/* Gráfico SVG animado */}
      <svg ref={svgRef} viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: 'block', overflow: 'visible' }}>
        {gridLines.map((g, i) => (
          <g key={i}>
            <line x1={padL} x2={W - padR} y1={g.y} y2={g.y} stroke="#EDE8DC" strokeWidth="1" />
            <text x={padL - 10} y={g.ty} textAnchor="end" style={{ font: "500 10px 'JetBrains Mono', monospace", fill: '#B3AC9B' }}>{g.label}</text>
          </g>
        ))}

        {annX !== null && progress > annIdx / (numEtapas - 1) && (
          <line x1={annX} x2={annX} y1={padT} y2={padT + chartH} stroke="#16140F" strokeWidth="1" strokeDasharray="3 4" opacity="0.28" />
        )}

        {xticks.map((t, i) => (
          <text key={i} x={t.x} y={H - 4} textAnchor="middle" style={{ font: "500 10px 'JetBrains Mono', monospace", fill: '#B3AC9B' }}>{t.label}</text>
        ))}

        {[...jogadores].reverse().map((j, revIdx) => {
          const rank = jogadores.length - 1 - revIdx
          const pts = animatedPoints(j.userId)
          if (!pts) return null
          return (
            <polyline
              key={j.userId}
              points={pts}
              fill="none"
              stroke={j.cor}
              strokeWidth={rank === 0 ? 2.8 : 2.2}
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          )
        })}

        {/* Pontos finais — só aparecem quando a animação chega ao fim */}
        {progress >= 0.99 && jogadores.map((j, rank) => {
          const pts = seriesMap[j.userId]?.[numEtapas - 1] ?? 0
          return (
            <circle key={j.userId} cx={toX(numEtapas - 1)} cy={toY(pts)} r={rank === 0 ? 4.5 : 4} fill={j.cor} stroke="#fff" strokeWidth="2" />
          )
        })}
      </svg>

      {/* Modal histórico de mudanças */}
      {modalAberto && (
        <>
          {/* Overlay */}
          <div
            onClick={() => setModalAberto(false)}
            style={{
              position: 'fixed', inset: 0, background: 'rgba(22,20,15,0.35)',
              zIndex: 100, backdropFilter: 'blur(2px)',
            }}
          />
          {/* Modal */}
          <div style={{
            position: 'fixed', top: '50%', left: '50%',
            transform: 'translate(-50%, -50%)',
            background: '#fff', borderRadius: 16, padding: 28,
            width: 'min(480px, 90vw)', zIndex: 101,
            boxShadow: '0 20px 60px rgba(22,20,15,0.18)',
            maxHeight: '80vh', overflowY: 'auto',
          }}>
            {/* Header modal */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <div>
                <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, fontWeight: 600, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#A79F8E', marginBottom: 4 }}>
                  Histórico
                </div>
                <h3 style={{ font: "700 18px 'Archivo', sans-serif", color: '#16140F', margin: 0 }}>
                  Mudanças de liderança
                </h3>
              </div>
              <button
                onClick={() => setModalAberto(false)}
                style={{
                  width: 34, height: 34, borderRadius: 8,
                  border: '1px solid #E9E4D9', background: 'transparent',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', flexShrink: 0,
                }}
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="#16140F" strokeWidth="2" strokeLinecap="round">
                  <path d="M1 1l12 12M13 1L1 13" />
                </svg>
              </button>
            </div>

            {mudancas.length === 0 ? (
              <p style={{ font: "500 14px 'Archivo', sans-serif", color: '#A79F8E', textAlign: 'center', padding: '1rem 0' }}>
                Sem mudanças de liderança.
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                {mudancas.map((m, idx) => {
                  const cor = jogadores.find(j => j.nome === m.novoLider)?.cor ?? '#A79F8E'
                  const isUltima = idx === mudancas.length - 1
                  return (
                    <div key={m.etapa.id} style={{
                      display: 'flex', alignItems: 'flex-start', gap: 14,
                      padding: '14px 0',
                      borderBottom: idx < mudancas.length - 1 ? '1px solid #F1EDE3' : 'none',
                    }}>
                      {/* Timeline dot */}
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0, paddingTop: 3 }}>
                        <div style={{ width: 10, height: 10, borderRadius: '50%', background: cor, border: '2px solid #fff', boxShadow: `0 0 0 2px ${cor}` }} />
                        {!isUltima && <div style={{ width: 2, flex: 1, background: '#E9E4D9', margin: '6px 0 0' }} />}
                      </div>
                      {/* Conteúdo */}
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#A37A0A', background: '#FBF2D9', padding: '3px 7px', borderRadius: 5 }}>
                            Etapa {m.etapa.numero_etapa}
                          </span>
                          {isUltima && (
                            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, fontWeight: 600, color: '#857E6F' }}>
                              última mudança
                            </span>
                          )}
                        </div>
                        <p style={{ font: "700 15px 'Archivo', sans-serif", color: '#16140F', margin: '0 0 2px' }}>
                          {m.novoLider}
                        </p>
                        <p style={{ font: "500 13px 'Archivo', sans-serif", color: '#857E6F', margin: 0 }}>
                          assumiu a liderança com <span style={{ fontWeight: 700, color: '#16140F' }}>{m.pontos} pts</span>
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </>
      )}
    </section>
  )
}
