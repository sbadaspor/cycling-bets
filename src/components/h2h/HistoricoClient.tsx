'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'

// ── Types ────────────────────────────────────────────────────────────────────
interface Perfil {
  id: string
  username: string
  full_name?: string
  avatar_url?: string
}

interface ProvaSummary {
  provaId: string
  nome: string
  ano: number
  tipo: 'giro' | 'tour' | 'vuelta' | 'outras'
  resultados: Array<{ userId: string; rank: number; pontos: number }>
}

interface VitoriaJogador {
  perfil: Perfil
  total: number
  porCategoria: Record<string, number>
}

interface GrandeVoltaEntry {
  userId: string
  giro: number
  tour: number
  vuelta: number
}

interface Props {
  perfis: Perfil[]
  todosLeaderboards: Array<{
    prova: { id: string; nome: string; categoria: string; data_fim: string }
    leaderboard: Array<{ rank: number; aposta: { pontos_total: number }; perfil: Perfil }>
  }>
  historicas: Array<{
    id: string; user_id: string; ano: number; nome_prova: string
    categoria: string; posicao_grupo: number; pontos_total: number
  }>
  vitorias: VitoriaJogador[]
  grandesVoltas: GrandeVoltaEntry[]
}

// ── Helpers ──────────────────────────────────────────────────────────────────
function tipoProva(nome: string): 'giro' | 'tour' | 'vuelta' | 'outras' {
  const n = nome.toLowerCase()
  if (n.includes('giro')) return 'giro'
  if (n.includes('tour de france') || n.includes('tour france')) return 'tour'
  if (n.includes('vuelta')) return 'vuelta'
  return 'outras'
}

const GRUPOS = [
  { key: 'giro',   label: 'Giro d\'Italia', flag: '🇮🇹', cor: '#E8488B' },
  { key: 'tour',   label: 'Tour de France', flag: '🇫🇷', cor: '#2563EB' },
  { key: 'vuelta', label: 'La Vuelta a España', flag: '🇪🇸', cor: '#E0451F' },
  { key: 'outras', label: 'Outras Provas', flag: '🏁', cor: '#857E6F' },
]

const PLAYER_COLORS = ['#E0451F', '#2563EB', '#16A34A', '#E8488B', '#EAB308']

function Avatar({ perfil, size = 40, cor }: { perfil: Perfil; size?: number; cor: string }) {
  const inicial = (perfil.full_name || perfil.username)?.[0]?.toUpperCase() ?? '?'
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0, overflow: 'hidden',
      background: perfil.avatar_url ? 'transparent' : cor,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      font: `700 ${Math.round(size * 0.35)}px 'Archivo', sans-serif`, color: '#fff',
    }}>
      {perfil.avatar_url
        ? <img src={perfil.avatar_url} alt={perfil.username} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        : inicial
      }
    </div>
  )
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function HistoricoClient({ perfis, todosLeaderboards, historicas, vitorias, grandesVoltas }: Props) {

  // 1. Construir provasSummary (app + históricas)
  const provasSummary: ProvaSummary[] = []

  for (const { prova, leaderboard } of todosLeaderboards) {
    if (leaderboard.length === 0) continue
    provasSummary.push({
      provaId: prova.id,
      nome: prova.nome,
      ano: new Date(prova.data_fim).getFullYear(),
      tipo: tipoProva(prova.nome),
      resultados: leaderboard.map(e => ({ userId: e.perfil.id, rank: e.rank, pontos: e.aposta.pontos_total })),
    })
  }

  // Históricas — agrupar por ano+nome
  const historicasMap = new Map<string, ProvaSummary>()
  for (const h of historicas) {
    const key = `${h.ano}-${h.nome_prova}`
    if (!historicasMap.has(key)) {
      historicasMap.set(key, {
        provaId: `hist-${key}`,
        nome: h.nome_prova,
        ano: h.ano,
        tipo: tipoProva(h.nome_prova),
        resultados: [],
      })
    }
    // Adicionar sempre, mesmo sem posicao_grupo — calcular rank a seguir
    historicasMap.get(key)!.resultados.push({
      userId: h.user_id,
      rank: h.posicao_grupo ?? 999,
      pontos: h.pontos_total ?? 0,
    })
  }
  // Se posicao_grupo era null (rank=999), calcular rank por pontos
  for (const ps of historicasMap.values()) {
    const hasNullRank = ps.resultados.some(r => r.rank === 999)
    if (hasNullRank) {
      const sorted = [...ps.resultados].sort((a, b) => b.pontos - a.pontos)
      sorted.forEach((r, i) => { r.rank = i + 1 })
    }
  }
  provasSummary.push(...historicasMap.values())
  provasSummary.sort((a, b) => b.ano - a.ano || a.nome.localeCompare(b.nome))

  // 2. Ano mais antigo
  const anoMinimo = Math.min(
    ...historicas.map(h => h.ano),
    ...todosLeaderboards.map(l => new Date(l.prova.data_fim).getFullYear())
  )

  // 3. Contagem de provas por tipo
  const contagemTipo = { giro: 0, tour: 0, vuelta: 0, outras: 0 }
  for (const ps of provasSummary) contagemTipo[ps.tipo]++

  // 4. Stats globais — usar dados já calculados pelo getDadosVitorias (fonte de verdade)
  const statsMap: Record<string, { vitorias: number; pontos: number; provas: number; porTipo: Record<string, number> }> = {}
  for (const p of perfis) statsMap[p.id] = { vitorias: 0, pontos: 0, provas: 0, porTipo: { giro: 0, tour: 0, vuelta: 0 } }

  // Preencher vitórias a partir dos dados correctos
  for (const v of vitorias) {
    const id = v.perfil.id
    if (!statsMap[id]) continue
    statsMap[id].vitorias = v.total
  }
  for (const gv of grandesVoltas) {
    if (!statsMap[gv.userId]) continue
    statsMap[gv.userId].porTipo = { giro: gv.giro, tour: gv.tour, vuelta: gv.vuelta }
  }
  // Pontos e provas continuam a ser calculados do provasSummary
  for (const ps of provasSummary) {
    for (const r of ps.resultados) {
      if (!statsMap[r.userId]) continue
      statsMap[r.userId].provas++
      statsMap[r.userId].pontos += r.pontos
    }
  }

  // Ordenar jogadores pela ordem do vitorias (que já vem ordenado correctamente)
  const jogadoresOrdenados = vitorias
    .map(v => perfis.find(p => p.id === v.perfil.id))
    .filter((p): p is Perfil => !!p)

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 28 }}>

      {/* ── HEADER ─────────────────────────────────────────────── */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
          <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#E0451F', display: 'inline-block' }} />
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, fontWeight: 600, letterSpacing: '0.16em', textTransform: 'uppercase', color: '#A79F8E' }}>
            Rivalidade
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <h1 style={{ font: "800 38px 'Archivo', sans-serif", letterSpacing: '-0.025em', color: '#16140F', margin: 0, lineHeight: 1.05 }}>
              Histórico
            </h1>
            <p style={{ font: "500 14px 'Archivo', sans-serif", color: '#857E6F', margin: '6px 0 0' }}>
              Todas as Grandes Voltas disputadas — desde {anoMinimo}.
            </p>
          </div>
          {/* Stats por tipo */}
          <div style={{ display: 'flex', gap: 0, alignItems: 'stretch' }}>
            {[
              { tipo: 'giro', label: 'Giros', flag: '🇮🇹' },
              { tipo: 'tour', label: 'Tours', flag: '🇫🇷' },
              { tipo: 'vuelta', label: 'Vueltas', flag: '🇪🇸' },
            ].map((s, i) => (
              <div key={s.tipo} style={{ display: 'flex', alignItems: 'stretch' }}>
                {i > 0 && <div style={{ width: 1, background: '#E2DCCF' }} />}
                <div style={{ padding: i === 0 ? '0 20px 0 0' : i === 2 ? '0 0 0 20px' : '0 20px', textAlign: 'center' }}>
                  <div style={{ font: "800 24px 'Archivo', sans-serif", color: '#16140F' }}>{contagemTipo[s.tipo as keyof typeof contagemTipo]}</div>
                  <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#A79F8E', marginTop: 2 }}>
                    {s.flag} {s.label}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── CONFRONTO GERAL ────────────────────────────────────── */}
      <section style={{ background: '#fff', border: '1px solid #E9E4D9', borderRadius: 16, overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid #F1EDE3' }}>
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, fontWeight: 600, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#A79F8E' }}>
            Confronto Geral
          </span>
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#A79F8E' }}>
            Classificação por vitórias
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${jogadoresOrdenados.length}, 1fr)`, gap: 0 }}>
          {jogadoresOrdenados.map((p, idx) => {
            const stats = statsMap[p.id]
            const cor = PLAYER_COLORS[idx] ?? '#A79F8E'
            const isLider = idx === 0
            return (
              <div
                key={p.id}
                style={{
                  padding: '20px 16px',
                  borderRight: idx < jogadoresOrdenados.length - 1 ? '1px solid #F1EDE3' : 'none',
                  borderTop: `3px solid ${cor}`,
                  background: isLider ? '#FDFCF9' : '#fff',
                  textAlign: 'center',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
                }}
              >
                <Link href={`/perfil/${p.id}`} style={{ textDecoration: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                  <Avatar perfil={p} size={52} cor={cor} />
                  <div>
                    <div style={{ font: "700 15px 'Archivo', sans-serif", color: '#16140F' }}>
                      {p.full_name || p.username}
                    </div>
                    <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#A79F8E', marginTop: 2 }}>
                      {idx === 0 ? 'Líder' : idx === 1 ? '2.º lugar' : `${idx + 1}.º lugar`}
                    </div>
                  </div>
                </Link>

                <div style={{ font: "800 32px 'Archivo', sans-serif", color: '#16140F', letterSpacing: '-0.02em', lineHeight: 1 }}>
                  {stats.vitorias}
                  <span style={{ font: "500 13px 'Archivo', sans-serif", color: '#A79F8E', marginLeft: 4 }}>vitórias</span>
                </div>

                {/* Breakdown por tipo */}
                <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
                  {[
                    { label: 'Giro', flag: '🇮🇹', key: 'giro' },
                    { label: 'Tour', flag: '🇫🇷', key: 'tour' },
                    { label: 'Vuelta', flag: '🇪🇸', key: 'vuelta' },
                  ].map(t => (
                    <div key={t.key} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                      <span style={{ fontSize: 14 }}>{t.flag}</span>
                      <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, fontWeight: 700, color: stats.porTipo[t.key] > 0 ? '#16140F' : '#D0CCC2' }}>
                        {stats.porTipo[t.key]}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </section>

      {/* ── GRÁFICO VITÓRIAS ACUMULADAS ────────────────────────── */}
      <GraficoVitoriasAcumuladas
        provasSummary={provasSummary}
        jogadoresOrdenados={jogadoresOrdenados}
      />

      {/* ── ACCORDION POR COMPETIÇÃO ───────────────────────────── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {GRUPOS.map(grupo => {
          const provasGrupo = provasSummary
            .filter(ps => ps.tipo === grupo.key)
            .sort((a, b) => b.ano - a.ano)
          if (provasGrupo.length === 0) return null

          // Mais vitórias nesta corrida — pode haver empate
          const vitoriasNesta: Record<string, number> = {}
          for (const ps of provasGrupo) {
            const vencedor = ps.resultados.find(r => r.rank === 1)
            if (vencedor) vitoriasNesta[vencedor.userId] = (vitoriasNesta[vencedor.userId] ?? 0) + 1
          }
          const maxVitorias = Math.max(0, ...Object.values(vitoriasNesta))
          const topVitorias = maxVitorias
          const topPerfis = Object.entries(vitoriasNesta)
            .filter(([, v]) => v === maxVitorias)
            .map(([userId]) => {
              const perfil = perfis.find(p => p.id === userId)
              const idx = jogadoresOrdenados.findIndex(p => p.id === userId)
              const cor = PLAYER_COLORS[idx >= 0 ? idx : 0] ?? '#A79F8E'
              return perfil ? { perfil, cor } : null
            })
            .filter((x): x is { perfil: Perfil; cor: string } => !!x)

          return (
            <GrupoAccordion
              key={grupo.key}
              grupo={grupo}
              provas={provasGrupo}
              perfis={perfis}
              jogadoresOrdenados={jogadoresOrdenados}
              topPerfis={topPerfis}
              topVitorias={topVitorias}
            />
          )
        })}
      </div>
    </div>
  )
}

// ── Gráfico vitórias acumuladas ───────────────────────────────────────────────
function GraficoVitoriasAcumuladas({
  provasSummary,
  jogadoresOrdenados,
}: {
  provasSummary: ProvaSummary[]
  jogadoresOrdenados: Perfil[]
}) {
  // Ordenar provas cronologicamente: por ano, depois por tipo (giro→tour→vuelta)
  const ordemTipo = { giro: 0, tour: 1, vuelta: 2, outras: 3 }
  const provasOrdem = [...provasSummary]
    .filter(ps => ps.tipo !== 'outras')
    .sort((a, b) => a.ano - b.ano || ordemTipo[a.tipo] - ordemTipo[b.tipo])

  if (provasOrdem.length < 2) return null

  // Calcular vitórias acumuladas por jogador ao longo das provas
  const acum: Record<string, number[]> = {}
  jogadoresOrdenados.forEach(j => { acum[j.id] = [] })

  const contagem: Record<string, number> = {}
  jogadoresOrdenados.forEach(j => { contagem[j.id] = 0 })

  for (const ps of provasOrdem) {
    const vencedor = ps.resultados.find(r => r.rank === 1)
    if (vencedor && contagem[vencedor.userId] !== undefined) {
      contagem[vencedor.userId]++
    }
    jogadoresOrdenados.forEach(j => {
      acum[j.id].push(contagem[j.id])
    })
  }

  // SVG dimensions
  const W = 900, H = 260
  const padL = 36, padR = 20, padT = 20, padB = 40
  const chartW = W - padL - padR
  const chartH = H - padT - padB
  const n = provasOrdem.length
  const maxV = Math.max(...Object.values(acum).flat(), 1)

  function toX(i: number) { return padL + (i / Math.max(n - 1, 1)) * chartW }
  function toY(v: number) { return padT + chartH - (v / maxV) * chartH }

  function polylinePoints(userId: string) {
    return (acum[userId] ?? []).map((v, i) => `${toX(i)},${toY(v)}`).join(' ')
  }

  // Grid Y
  const gridLines = Array.from({ length: maxV + 1 }, (_, i) => ({
    y: toY(i), label: i,
  })).filter((_, i) => i <= maxV)

  // X labels: "Giro 22", "Tour 22", etc.
  const FLAG: Record<string, string> = { giro: '🇮🇹', tour: '🇫🇷', vuelta: '🇪🇸' }
  const SHORT: Record<string, string> = { giro: 'Giro', tour: 'Tour', vuelta: 'Vuelta' }
  const xLabels = provasOrdem.map((ps, i) => ({
    x: toX(i),
    line1: FLAG[ps.tipo] ?? '',
    line2: `${SHORT[ps.tipo] ?? ''} \'${String(ps.ano).slice(2)}`,
  }))

  // Ref para animação
  const svgRef = useRef<SVGSVGElement>(null)
  const [progress, setProgress] = useState(0)
  const animRef = useRef<number | null>(null)
  const startRef = useRef<number | null>(null)
  const DURATION = 1400

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        observer.disconnect()
        startRef.current = null
        const animate = (ts: number) => {
          if (!startRef.current) startRef.current = ts
          const p = Math.min((ts - startRef.current) / DURATION, 1)
          setProgress(1 - Math.pow(1 - p, 3))
          if (p < 1) animRef.current = requestAnimationFrame(animate)
        }
        animRef.current = requestAnimationFrame(animate)
      }
    }, { threshold: 0.2 })
    if (svgRef.current) observer.observe(svgRef.current)
    return () => { observer.disconnect(); if (animRef.current) cancelAnimationFrame(animRef.current) }
  }, [])

  function animatedPoints(userId: string) {
    const series = acum[userId] ?? []
    const visible = progress * (n - 1)
    return series
      .map((v, i) => {
        if (i > Math.ceil(visible)) return null
        const y = i <= visible ? toY(v) : toY(series[Math.floor(visible)] ?? 0)
        return `${toX(i)},${y}`
      })
      .filter(Boolean).join(' ')
  }

  return (
    <section style={{ background: '#fff', border: '1px solid #E9E4D9', borderRadius: 16, padding: 22 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, fontWeight: 600, letterSpacing: '0.16em', textTransform: 'uppercase', color: '#A79F8E' }}>
            Análise
          </div>
          <h2 style={{ font: "700 18px 'Archivo', sans-serif", color: '#16140F', margin: '6px 0 0' }}>
            Corrida pelo topo — vitórias acumuladas
          </h2>
        </div>
        {/* Legenda */}
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center' }}>
          {jogadoresOrdenados.map((j, idx) => (
            <div key={j.id} style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              <span style={{ width: 10, height: 10, borderRadius: '50%', background: PLAYER_COLORS[idx] ?? '#A79F8E', display: 'inline-block', flexShrink: 0 }} />
              <span style={{ font: "600 12px 'Archivo', sans-serif", color: '#4A463D' }}>{j.full_name || j.username}</span>
            </div>
          ))}
        </div>
      </div>

      {/* SVG */}
      <svg ref={svgRef} viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: 'block', overflow: 'visible' }}>
        {/* Grid horizontal */}
        {gridLines.map((g, i) => (
          <g key={i}>
            <line x1={padL} x2={W - padR} y1={g.y} y2={g.y} stroke="#EDE8DC" strokeWidth="1" />
            <text x={padL - 8} y={g.y + 4} textAnchor="end" style={{ font: "500 10px 'JetBrains Mono', monospace", fill: '#B3AC9B' }}>
              {g.label}
            </text>
          </g>
        ))}

        {/* Grid vertical por prova */}
        {xLabels.map((t, i) => (
          <line key={i} x1={t.x} x2={t.x} y1={padT} y2={padT + chartH} stroke="#F4F0E6" strokeWidth="1" />
        ))}

        {/* Linhas animadas */}
        {[...jogadoresOrdenados].reverse().map((j, revIdx) => {
          const rank = jogadoresOrdenados.length - 1 - revIdx
          const pts = animatedPoints(j.id)
          if (!pts) return null
          return (
            <polyline
              key={j.id}
              points={pts}
              fill="none"
              stroke={PLAYER_COLORS[rank] ?? '#A79F8E'}
              strokeWidth={rank === 0 ? 2.8 : 2.2}
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          )
        })}

        {/* Pontos em cada prova (aparecem progressivamente) */}
        {jogadoresOrdenados.map((j, rank) => {
          const series = acum[j.id] ?? []
          const visibleCount = Math.floor(progress * (n - 1)) + 1
          return series.slice(0, visibleCount).map((v, i) => (
            <circle
              key={`${j.id}-${i}`}
              cx={toX(i)}
              cy={toY(v)}
              r={i === visibleCount - 1 && progress < 0.99 ? 3 : 4}
              fill={PLAYER_COLORS[rank] ?? '#A79F8E'}
              stroke="#fff"
              strokeWidth="2"
              opacity={i === visibleCount - 1 && progress < 0.99 ? 0.6 : 1}
            />
          ))
        })}

        {/* X labels */}
        {xLabels.map((t, i) => (
          <g key={i}>
            <text x={t.x} y={H - 18} textAnchor="middle" style={{ font: "600 11px 'Archivo', sans-serif", fill: '#A79F8E' }}>
              {t.line1}
            </text>
            <text x={t.x} y={H - 4} textAnchor="middle" style={{ font: "500 9px 'JetBrains Mono', monospace", fill: '#B3AC9B' }}>
              {t.line2}
            </text>
          </g>
        ))}
      </svg>
    </section>
  )
}


// ── Accordion por grupo ───────────────────────────────────────────────────────
function GrupoAccordion({
  grupo, provas, perfis, jogadoresOrdenados, topPerfis, topVitorias,
}: {
  grupo: typeof GRUPOS[0]
  provas: ProvaSummary[]
  perfis: Perfil[]
  jogadoresOrdenados: Perfil[]
  topPerfis: Array<{ perfil: Perfil; cor: string }>
  topVitorias: number
}) {
  const [aberto, setAberto] = useState(true)

  return (
    <div style={{ background: '#fff', border: '1px solid #E9E4D9', borderRadius: 16, overflow: 'hidden' }}>
      {/* Header accordion */}
      <button
        onClick={() => setAberto(o => !o)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '16px 20px', background: 'transparent', border: 'none', cursor: 'pointer',
          borderBottom: aberto ? '1px solid #F1EDE3' : 'none',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 20 }}>{grupo.flag}</span>
          <span style={{ font: "700 17px 'Archivo', sans-serif", color: '#16140F' }}>{grupo.label}</span>
          <span style={{
            fontFamily: "'JetBrains Mono', monospace", fontSize: 10, fontWeight: 600,
            letterSpacing: '0.08em', color: '#857E6F',
            background: '#F4F0E6', border: '1px solid #E9E4D9',
            padding: '3px 8px', borderRadius: 6,
          }}>
            {provas.length} {provas.length === 1 ? 'edição' : 'edições'}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          {/* Mais vitórias — mostra todos os empatados */}
          {topPerfis.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#A79F8E' }}>
                Mais vitórias
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                {topPerfis.map(({ perfil, cor }) => (
                  <div key={perfil.id} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <div style={{
                      width: 24, height: 24, borderRadius: '50%', overflow: 'hidden',
                      background: perfil.avatar_url ? 'transparent' : cor,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      font: "700 9px 'Archivo', sans-serif", color: '#fff', flexShrink: 0,
                    }}>
                      {perfil.avatar_url
                        ? <img src={perfil.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        : perfil.username[0].toUpperCase()
                      }
                    </div>
                    <span style={{ font: "700 13px 'Archivo', sans-serif", color: '#16140F' }}>
                      {perfil.full_name || perfil.username}
                    </span>
                  </div>
                ))}
                <span style={{ font: "600 12px 'Archivo', sans-serif", color: '#A79F8E' }}>
                  · {topVitorias} vit.
                </span>
              </div>
            </div>
          )}
          <svg
            width="16" height="16" viewBox="0 0 16 16" fill="none"
            stroke="#A79F8E" strokeWidth="2" strokeLinecap="round"
            style={{ transform: aberto ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.2s', flexShrink: 0 }}
          >
            <path d="M3 6l5 5 5-5" />
          </svg>
        </div>
      </button>

      {/* Conteúdo */}
      {aberto && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
          {provas.map((ps, psIdx) => {
            const resultados = [...ps.resultados].sort((a, b) => a.rank - b.rank)
            return (
              <div
                key={ps.provaId}
                style={{ borderBottom: psIdx < provas.length - 1 ? '1px solid #F1EDE3' : 'none' }}
              >
                {/* Cabeçalho da edição */}
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '10px 20px', background: '#FCFBF7',
                }}>
                  <span style={{ font: "600 14px 'Archivo', sans-serif", color: '#4A463D' }}>{ps.nome}</span>
                  <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, fontWeight: 700, color: '#A79F8E' }}>{ps.ano}</span>
                </div>

                {/* Resultados */}
                {resultados.map((r, rIdx) => {
                  const perfil = perfis.find(p => p.id === r.userId)
                  if (!perfil) return null
                  const jIdx = jogadoresOrdenados.findIndex(p => p.id === r.userId)
                  const cor = PLAYER_COLORS[jIdx >= 0 ? jIdx : rIdx] ?? '#A79F8E'
                  const isFirst = rIdx === 0

                  return (
                    <div
                      key={r.userId}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 12,
                        padding: '11px 20px',
                        background: isFirst ? 'rgba(224,69,31,0.03)' : 'transparent',
                        borderBottom: rIdx < resultados.length - 1 ? '1px solid #F8F5EF' : 'none',
                      }}
                    >
                      {/* Barra lateral */}
                      <div style={{ width: 3, height: 32, borderRadius: 2, background: cor, flexShrink: 0 }} />

                      {/* Rank */}
                      <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 13, fontWeight: 700, color: '#B3AC9B', width: 16, flexShrink: 0 }}>
                        {r.rank}
                      </div>

                      {/* Avatar */}
                      <div style={{
                        width: 32, height: 32, borderRadius: '50%', flexShrink: 0, overflow: 'hidden',
                        background: perfil.avatar_url ? 'transparent' : cor,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        font: "700 11px 'Archivo', sans-serif", color: '#fff',
                      }}>
                        {perfil.avatar_url
                          ? <img src={perfil.avatar_url} alt={perfil.username} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          : (perfil.full_name || perfil.username)[0].toUpperCase()
                        }
                      </div>

                      {/* Nome */}
                      <span style={{ flex: 1, font: `${isFirst ? 700 : 500} 14px 'Archivo', sans-serif`, color: '#16140F' }}>
                        {perfil.full_name || perfil.username}
                      </span>

                      {/* Pontos */}
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <span style={{ font: "800 20px 'Archivo', sans-serif", color: '#16140F', letterSpacing: '-0.02em' }}>
                          {r.pontos}
                        </span>
                        <span style={{ font: "500 11px 'Archivo', sans-serif", color: '#A79F8E', marginLeft: 3 }}>
                          pts
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
