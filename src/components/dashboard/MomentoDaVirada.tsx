'use client'

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

  // 1. Calcular pontos acumulados por jogador em cada etapa
  //    acumulados[userId] vai crescendo etapa a etapa
  const acumulados: Record<string, number> = {}
  apostas.forEach(a => { acumulados[a.user_id] = 0 })

  type Snapshot = { userId: string; nome: string; pontosAcum: number; lider: boolean }
  const timeline: Array<{ etapa: EtapaResultado; snapshots: Snapshot[] }> = []

  for (const etapa of etapas) {
    for (const aposta of apostas) {
      const r = calcularPontos(
        aposta.apostas_top20 ?? [],
        etapa.classificacao_geral_top20 ?? [],
        { sprint: aposta.camisola_sprint ?? '', montanha: aposta.camisola_montanha ?? '', juventude: aposta.camisola_juventude ?? '' },
        { sprint: etapa.camisola_sprint ?? '', montanha: etapa.camisola_montanha ?? '', juventude: etapa.camisola_juventude ?? '' },
        categoria
      )
      acumulados[aposta.user_id] = (acumulados[aposta.user_id] ?? 0) + r.pontos_total
    }

    // Snapshot desta etapa: ordenado por pontos decrescentes
    const snapshots: Snapshot[] = apostas
      .map(a => ({
        userId: a.user_id,
        nome: nomeExibir(a.perfil, '?'),
        pontosAcum: acumulados[a.user_id] ?? 0,
        lider: false,
      }))
      .sort((a, b) => b.pontosAcum - a.pontosAcum)

    snapshots.forEach((s, i) => { s.lider = i === 0 })
    timeline.push({ etapa, snapshots })
  }

  // 2. Ranking final — define a cor de cada jogador
  //    O 1º classificado fica com a cor 0 (vermelho), 2º com azul, etc.
  const rankingFinal = timeline[timeline.length - 1].snapshots

  // jogadores ORDENADOS pelo ranking final — cor[0] vai para o líder
  const jogadores = rankingFinal.map((s, rank) => ({
    userId: s.userId,
    nome: s.nome,
    cor: PLAYER_COLORS[rank] ?? '#A79F8E',
  }))

  // 3. Detectar mudança de liderança
  let etapaDaVirada: typeof timeline[0] | null = null
  for (let i = 1; i < timeline.length; i++) {
    if (timeline[i - 1].snapshots[0]?.userId !== timeline[i].snapshots[0]?.userId) {
      etapaDaVirada = timeline[i]
      break
    }
  }

  // 4. Construir séries para o gráfico
  //    seriesMap[userId] = array de pontosAcum por etapa, na ordem do timeline
  const seriesMap: Record<string, number[]> = {}
  jogadores.forEach(j => { seriesMap[j.userId] = [] })
  timeline.forEach(t => {
    jogadores.forEach(j => {
      const snap = t.snapshots.find(s => s.userId === j.userId)
      seriesMap[j.userId].push(snap?.pontosAcum ?? 0)
    })
  })

  // 5. Dimensões SVG
  const W = 720, H = 272
  const padL = 48, padR = 20, padT = 20, padB = 36
  const chartW = W - padL - padR
  const chartH = H - padT - padB
  const numEtapas = timeline.length
  const maxPts = Math.max(...Object.values(seriesMap).flat(), 1)

  function toX(i: number) {
    return padL + (i / Math.max(numEtapas - 1, 1)) * chartW
  }
  function toY(pts: number) {
    return padT + chartH - (pts / maxPts) * chartH
  }
  function polylinePoints(userId: string): string {
    return (seriesMap[userId] ?? [])
      .map((pts, i) => `${toX(i)},${toY(pts)}`)
      .join(' ')
  }

  // Grid horizontal (5 níveis)
  const gridLines = Array.from({ length: 5 }, (_, i) => {
    const pts = Math.round((maxPts / 4) * (4 - i))
    const y = toY(pts)
    return { y, ty: y + 4, label: pts }
  })

  // X ticks
  const step = Math.max(1, Math.floor(numEtapas / 8))
  const xticks = timeline
    .filter((_, i) => i % step === 0 || i === numEtapas - 1)
    .map(t => ({
      x: toX(timeline.indexOf(t)),
      label: t.etapa.is_final ? 'FIM' : `E${t.etapa.numero_etapa}`,
    }))

  // Linha vertical da virada
  const annIdx = etapaDaVirada ? timeline.indexOf(etapaDaVirada) : -1
  const annX = annIdx >= 0 ? toX(annIdx) : null

  return (
    <section style={{ background: '#fff', border: '1px solid #E9E4D9', borderRadius: 16, padding: 22 }}>
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

        {/* Legenda — mesma ordem e cor que as linhas */}
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center' }}>
          {jogadores.map(j => (
            <div key={j.userId} style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              <span style={{ width: 10, height: 10, borderRadius: '50%', background: j.cor, display: 'inline-block', flexShrink: 0 }} />
              <span style={{ font: "600 12px 'Archivo', sans-serif", color: '#4A463D' }}>{j.nome}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Badge mudança de liderança */}
      {etapaDaVirada && (
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          margin: '4px 0 14px', padding: '7px 12px',
          borderRadius: 8, background: '#FBF2D9', border: '1px solid #F0E2B0',
        }}>
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#A37A0A' }}>
            Etapa {etapaDaVirada.etapa.numero_etapa} · Mudança de liderança
          </span>
          <span style={{ font: "500 12px 'Archivo', sans-serif", color: '#6B5E2E' }}>
            {etapaDaVirada.snapshots[0].nome} assumiu a frente com {etapaDaVirada.snapshots[0].pontosAcum} pts
          </span>
        </div>
      )}

      {/* Gráfico SVG */}
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: 'block', overflow: 'visible' }}>
        {/* Grid horizontal */}
        {gridLines.map((g, i) => (
          <g key={i}>
            <line x1={padL} x2={W - padR} y1={g.y} y2={g.y} stroke="#EDE8DC" strokeWidth="1" />
            <text x={padL - 10} y={g.ty} textAnchor="end" style={{ font: "500 10px 'JetBrains Mono', monospace", fill: '#B3AC9B' }}>
              {g.label}
            </text>
          </g>
        ))}

        {/* Linha vertical da virada */}
        {annX !== null && (
          <line x1={annX} x2={annX} y1={padT} y2={padT + chartH} stroke="#16140F" strokeWidth="1" strokeDasharray="3 4" opacity="0.28" />
        )}

        {/* X ticks */}
        {xticks.map((t, i) => (
          <text key={i} x={t.x} y={H - 4} textAnchor="middle" style={{ font: "500 10px 'JetBrains Mono', monospace", fill: '#B3AC9B' }}>
            {t.label}
          </text>
        ))}

        {/* Linhas — desenhadas do último para o primeiro para o líder ficar por cima */}
        {[...jogadores].reverse().map((j, revIdx) => {
          const rank = jogadores.length - 1 - revIdx
          return (
            <polyline
              key={j.userId}
              points={polylinePoints(j.userId)}
              fill="none"
              stroke={j.cor}
              strokeWidth={rank === 0 ? 2.8 : 2.2}
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          )
        })}

        {/* Pontos finais */}
        {jogadores.map((j, rank) => {
          const pts = seriesMap[j.userId]?.[numEtapas - 1] ?? 0
          return (
            <circle
              key={j.userId}
              cx={toX(numEtapas - 1)}
              cy={toY(pts)}
              r={rank === 0 ? 4.5 : 4}
              fill={j.cor}
              stroke="#fff"
              strokeWidth="2"
            />
          )
        })}
      </svg>
    </section>
  )
}
