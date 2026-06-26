'use client'

import { useState } from 'react'
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
    if (h.posicao_grupo) {
      historicasMap.get(key)!.resultados.push({
        userId: h.user_id,
        rank: h.posicao_grupo,
        pontos: h.pontos_total ?? 0,
      })
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

      {/* ── ACCORDION POR COMPETIÇÃO ───────────────────────────── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {GRUPOS.map(grupo => {
          const provasGrupo = provasSummary
            .filter(ps => ps.tipo === grupo.key)
            .sort((a, b) => b.ano - a.ano)
          if (provasGrupo.length === 0) return null

          // Mais vitórias nesta corrida
          const vitoriasNesta: Record<string, number> = {}
          for (const ps of provasGrupo) {
            const vencedor = ps.resultados.find(r => r.rank === 1)
            if (vencedor) vitoriasNesta[vencedor.userId] = (vitoriasNesta[vencedor.userId] ?? 0) + 1
          }
          const topUserId = Object.entries(vitoriasNesta).sort((a, b) => b[1] - a[1])[0]?.[0]
          const topPerfil = perfis.find(p => p.id === topUserId)
          const topVitorias = topUserId ? vitoriasNesta[topUserId] : 0
          const topIdx = jogadoresOrdenados.findIndex(p => p.id === topUserId)
          const topCor = PLAYER_COLORS[topIdx >= 0 ? topIdx : 0] ?? '#A79F8E'

          return (
            <GrupoAccordion
              key={grupo.key}
              grupo={grupo}
              provas={provasGrupo}
              perfis={perfis}
              jogadoresOrdenados={jogadoresOrdenados}
              topPerfil={topPerfil}
              topVitorias={topVitorias}
              topCor={topCor}
            />
          )
        })}
      </div>
    </div>
  )
}

// ── Accordion por grupo ───────────────────────────────────────────────────────
function GrupoAccordion({
  grupo, provas, perfis, jogadoresOrdenados, topPerfil, topVitorias, topCor,
}: {
  grupo: typeof GRUPOS[0]
  provas: ProvaSummary[]
  perfis: Perfil[]
  jogadoresOrdenados: Perfil[]
  topPerfil?: Perfil
  topVitorias: number
  topCor: string
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
          {/* Mais vitórias */}
          {topPerfil && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#A79F8E' }}>
                Mais vitórias
              </span>
              <div style={{
                width: 24, height: 24, borderRadius: '50%', overflow: 'hidden',
                background: topPerfil.avatar_url ? 'transparent' : topCor,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                font: "700 9px 'Archivo', sans-serif", color: '#fff', flexShrink: 0,
              }}>
                {topPerfil.avatar_url
                  ? <img src={topPerfil.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : topPerfil.username[0].toUpperCase()
                }
              </div>
              <span style={{ font: "700 13px 'Archivo', sans-serif", color: '#16140F' }}>
                {topPerfil.full_name || topPerfil.username}
                <span style={{ font: "600 12px 'Archivo', sans-serif", color: '#A79F8E', marginLeft: 4 }}>
                  · {topVitorias} vit.
                </span>
              </span>
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
