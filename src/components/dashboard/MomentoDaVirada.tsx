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
const RIDER_R = 13

export default function MomentoDaVirada({ etapas, apostas, categoria }: Props) {
  if (etapas.length < 2 || apostas.length < 2) return null

  getConfigCategoria(categoria)

  // ── 1. Calcular pontos por etapa ────────────────────────────────
  type Snapshot = { userId: string; nome: string; pontos: number; avatarUrl?: string; lider: boolean }
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
        return {
          userId: aposta.user_id,
          nome: nomeExibir(aposta.perfil, '?'),
          avatarUrl: aposta.perfil?.avatar_url ?? undefined,
          pontos: r.pontos_total,
          lider: false,
        }
      })
      .sort((a, b) => b.pontos - a.pontos)
    snapshots.forEach((s, i) => { s.lider = i === 0 })
    timeline.push({ etapa, snapshots })
  }

  // ── 2. Ranking final & cores ─────────────────────────────────────
  const rankingFinal = timeline[timeline.length - 1].snapshots
  const jogadores = rankingFinal.map((s, rank) => ({
    userId: s.userId, nome: s.nome, cor: PLAYER_COLORS[rank] ?? '#A79F8E',
    avatarUrl: s.avatarUrl,
  }))

  // ── 3. Mudanças de liderança ─────────────────────────────────────
  const mudancas: Array<{ etapa: EtapaResultado; novoLider: string; pontos: number }> = []
  for (let i = 1; i < timeline.length; i++) {
    const antes = timeline[i - 1].snapshots[0]?.userId
    const depois = timeline[i].snapshots[0]?.userId
    if (antes !== depois) {
      mudancas.push({ etapa: timeline[i].etapa, novoLider: timeline[i].snapshots[0].nome, pontos: timeline[i].snapshots[0].pontos })
    }
  }
  const ultimaMudanca = mudancas[mudancas.length - 1] ?? null

  // ── 4. Séries ────────────────────────────────────────────────────
  const seriesMap: Record<string, number[]> = {}
  jogadores.forEach(j => { seriesMap[j.userId] = [] })
  timeline.forEach(t => {
    jogadores.forEach(j => {
      const snap = t.snapshots.find(s => s.userId === j.userId)
      seriesMap[j.userId].push(snap?.pontos ?? 0)
    })
  })

  // ── 5. SVG ───────────────────────────────────────────────────────
  const W = 720, H = 290
  const padL = 48, padR = 24, padT = 20, padB = 36
  const chartW = W - padL - padR
  const chartH = H - padT - padB
  const numEtapas = timeline.length
  const maxPts = Math.max(...Object.values(seriesMap).flat(), 1)

  function toX(i: number) { return padL + (i / Math.max(numEtapas - 1, 1)) * chartW }
  function toY(pts: number) { return padT + chartH - (pts / maxPts) * chartH }

  // Posição interpolada do rider
  function riderPos(userId: string, prog: number): { x: number; y: number } {
    const series = seriesMap[userId] ?? []
    const t = prog * (numEtapas - 1)
    const i = Math.floor(t)
    const frac = t - i
    if (i >= series.length - 1) return { x: toX(numEtapas - 1), y: toY(series[numEtapas - 1] ?? 0) }
    const y1 = toY(series[i] ?? 0)
    const y2 = toY(series[i + 1] ?? 0)
    return { x: toX(i) + frac * (toX(i + 1) - toX(i)), y: y1 + frac * (y2 - y1) }
  }

  // Polyline visível até progress
  function animatedPoints(userId: string): string {
    const series = seriesMap[userId] ?? []
    const t = progress * (numEtapas - 1)
    const pts: string[] = []
    for (let i = 0; i < series.length; i++) {
      if (i > t) break
      pts.push(`${toX(i)},${toY(series[i])}`)
    }
    const { x, y } = riderPos(userId, progress)
    if (pts.length > 0) pts.push(`${x},${y}`)
    return pts.join(' ')
  }

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

  // ── 6. Animação ──────────────────────────────────────────────────
  const svgRef = useRef<SVGSVGElement>(null)
  const [progress, setProgress] = useState(0)
  const animRef = useRef<number | null>(null)
  const startRef = useRef<number | null>(null)
  const DURATION = 2400

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        observer.disconnect()
        startRef.current = null
        const animate = (ts: number) => {
          if (!startRef.current) startRef.current = ts
          const p = Math.min((ts - startRef.current) / DURATION, 1)
          const eased = p < 0.5 ? 2 * p * p : -1 + (4 - 2 * p) * p
          setProgress(eased)
          if (p < 1) animRef.current = requestAnimationFrame(animate)
        }
        animRef.current = requestAnimationFrame(animate)
      }
    }, { threshold: 0.2 })
    if (svgRef.current) observer.observe(svgRef.current)
    return () => { observer.disconnect(); if (animRef.current) cancelAnimationFrame(animRef.current) }
  }, [])

  // ── 7. Cache avatares via canvas ─────────────────────────────────
  const [imgCache, setImgCache] = useState<Record<string, string>>({})
  useEffect(() => {
    jogadores.forEach(j => {
      if (j.avatarUrl && !imgCache[j.userId]) {
        const img = new Image()
        img.crossOrigin = 'anonymous'
        img.onload = () => {
          const canvas = document.createElement('canvas')
          canvas.width = 32; canvas.height = 32
          const ctx = canvas.getContext('2d')!
          ctx.beginPath(); ctx.arc(16, 16, 16, 0, Math.PI * 2); ctx.clip()
          ctx.drawImage(img, 0, 0, 32, 32)
          setImgCache(prev => ({ ...prev, [j.userId]: canvas.toDataURL() }))
        }
        img.src = j.avatarUrl
      }
    })
  }, [jogadores])

  // ── 8. Modal ─────────────────────────────────────────────────────
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

      {/* Badge clicável */}
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

      {/* SVG */}
      <svg ref={svgRef} viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: 'block', overflow: 'visible' }}>
        <defs>
          {jogadores.map(j => (
            <clipPath key={j.userId} id={`clip-etapa-${j.userId}`}>
              <circle cx="0" cy="0" r={RIDER_R} />
            </clipPath>
          ))}
        </defs>

        {/* Grid horizontal */}
        {gridLines.map((g, i) => (
          <g key={i}>
            <line x1={padL} x2={W - padR} y1={g.y} y2={g.y} stroke="#EDE8DC" strokeWidth="1" />
            <text x={padL - 10} y={g.ty} textAnchor="end" style={{ font: "500 10px 'JetBrains Mono', monospace", fill: '#B3AC9B' }}>{g.label}</text>
          </g>
        ))}

        {/* Linha de virada */}
        {annX !== null && progress > annIdx / (numEtapas - 1) && (
          <line x1={annX} x2={annX} y1={padT} y2={padT + chartH} stroke="#16140F" strokeWidth="1" strokeDasharray="3 4" opacity="0.28" />
        )}

        {/* X ticks */}
        {xticks.map((t, i) => (
          <text key={i} x={t.x} y={H - 4} textAnchor="middle" style={{ font: "500 10px 'JetBrains Mono', monospace", fill: '#B3AC9B' }}>{t.label}</text>
        ))}

        {/* Linhas animadas — do último para o primeiro */}
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

        {/* Riders na ponta de cada linha */}
        {jogadores.map((j, rank) => {
          const { x, y } = riderPos(j.userId, progress)
          const cor = j.cor
          const inicial = j.nome[0]?.toUpperCase() ?? '?'
          const dataUrl = imgCache[j.userId]
          const bounce = Math.sin(progress * Math.PI * numEtapas * 2.5) * 1.6

          return (
            <g key={j.userId} transform={`translate(${x}, ${y + bounce})`} style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.12))' }}>
              {/* Borda colorida */}
              <circle cx="0" cy="0" r={RIDER_R + 2} fill={cor} />
              {/* Avatar ou inicial */}
              {dataUrl ? (
                <image
                  href={dataUrl}
                  x={-RIDER_R} y={-RIDER_R}
                  width={RIDER_R * 2} height={RIDER_R * 2}
                  clipPath={`url(#clip-etapa-${j.userId})`}
                />
              ) : (
                <>
                  <circle cx="0" cy="0" r={RIDER_R} fill={cor} />
                  <text x="0" y="5" textAnchor="middle" style={{ font: `700 ${RIDER_R * 0.8}px 'Archivo', sans-serif`, fill: '#fff' }}>
                    {inicial}
                  </text>
                </>
              )}
              {/* Bicicleta mini */}
              <g transform={`translate(-7, ${RIDER_R + 4})`}>
                <circle cx="2" cy="0" r="3" fill="none" stroke={cor} strokeWidth="1.2" />
                <circle cx="12" cy="0" r="3" fill="none" stroke={cor} strokeWidth="1.2" />
                <line x1="2" y1="0" x2="7" y2="-4" stroke={cor} strokeWidth="1.2" strokeLinecap="round" />
                <line x1="7" y1="-4" x2="12" y2="0" stroke={cor} strokeWidth="1.2" strokeLinecap="round" />
                <line x1="7" y1="-4" x2="7" y2="-7" stroke={cor} strokeWidth="1.2" strokeLinecap="round" />
                <line x1="5" y1="-7" x2="9" y2="-7" stroke={cor} strokeWidth="1.5" strokeLinecap="round" />
              </g>
            </g>
          )
        })}
      </svg>

      {/* Modal */}
      {modalAberto && (
        <>
          <div onClick={() => setModalAberto(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(22,20,15,0.35)', zIndex: 100, backdropFilter: 'blur(2px)' }} />
          <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', background: '#fff', borderRadius: 16, padding: 28, width: 'min(480px, 90vw)', zIndex: 101, boxShadow: '0 20px 60px rgba(22,20,15,0.18)', maxHeight: '80vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <div>
                <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, fontWeight: 600, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#A79F8E', marginBottom: 4 }}>Histórico</div>
                <h3 style={{ font: "700 18px 'Archivo', sans-serif", color: '#16140F', margin: 0 }}>Mudanças de liderança</h3>
              </div>
              <button onClick={() => setModalAberto(false)} style={{ width: 34, height: 34, borderRadius: 8, border: '1px solid #E9E4D9', background: 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="#16140F" strokeWidth="2" strokeLinecap="round"><path d="M1 1l12 12M13 1L1 13" /></svg>
              </button>
            </div>
            {mudancas.length === 0 ? (
              <p style={{ font: "500 14px 'Archivo', sans-serif", color: '#A79F8E', textAlign: 'center', padding: '1rem 0' }}>Sem mudanças de liderança.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                {mudancas.map((m, idx) => {
                  const cor = jogadores.find(j => j.nome === m.novoLider)?.cor ?? '#A79F8E'
                  const isUltima = idx === mudancas.length - 1
                  return (
                    <div key={m.etapa.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 14, padding: '14px 0', borderBottom: idx < mudancas.length - 1 ? '1px solid #F1EDE3' : 'none' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0, paddingTop: 3 }}>
                        <div style={{ width: 10, height: 10, borderRadius: '50%', background: cor, border: '2px solid #fff', boxShadow: `0 0 0 2px ${cor}` }} />
                        {!isUltima && <div style={{ width: 2, flex: 1, background: '#E9E4D9', margin: '6px 0 0' }} />}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#A37A0A', background: '#FBF2D9', padding: '3px 7px', borderRadius: 5 }}>Etapa {m.etapa.numero_etapa}</span>
                          {isUltima && <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, fontWeight: 600, color: '#857E6F' }}>última mudança</span>}
                        </div>
                        <p style={{ font: "700 15px 'Archivo', sans-serif", color: '#16140F', margin: '0 0 2px' }}>{m.novoLider}</p>
                        <p style={{ font: "500 13px 'Archivo', sans-serif", color: '#857E6F', margin: 0 }}>assumiu a liderança com <span style={{ fontWeight: 700, color: '#16140F' }}>{m.pontos} pts</span></p>
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
