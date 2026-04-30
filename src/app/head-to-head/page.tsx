import { createClient } from '@/lib/supabase/server'
import { getAllLeaderboardsFinalizadas } from '@/lib/queries'
import Link from 'next/link'

function tipoProva(nome: string): 'giro' | 'tour' | 'vuelta' | 'outras' {
  const n = nome.toLowerCase()
  if (n.includes('giro')) return 'giro'
  if (n.includes('tour de france') || n.includes('tour france')) return 'tour'
  if (n.includes('vuelta')) return 'vuelta'
  return 'outras'
}

const GRUPOS = [
  { key: 'giro',   label: 'Giro d\'Italia', flag: '🇮🇹', cor: '#ff6b6b' },
  { key: 'tour',   label: 'Tour de France', flag: '🇫🇷', cor: '#4488ff' },
  { key: 'vuelta', label: 'Vuelta a España', flag: '🇪🇸', cor: '#ff4444' },
  { key: 'outras', label: 'Outras Provas',   flag: '🏁', cor: '#9a9ab5' },
]

export default async function HeadToHeadPage() {
  const supabase = await createClient()

  const [perfis, todosLeaderboards, todasHistoricas] = await Promise.all([
    supabase.from('perfis').select('id, username, avatar_url, full_name').then(r => r.data ?? []),
    getAllLeaderboardsFinalizadas(),
    supabase.from('apostas_historicas').select('*').then(r => r.data ?? []),
  ])

  // Sumário de provas — app + histórico
  type ProvaSummary = {
    provaId: string; nome: string; ano: number
    tipo: 'giro' | 'tour' | 'vuelta' | 'outras'
    resultados: Array<{ userId: string; rank: number; pontos: number }>
  }
  const provasSummary: ProvaSummary[] = []

  for (const { prova, leaderboard } of todosLeaderboards) {
    if (leaderboard.length === 0) continue
    provasSummary.push({
      provaId: prova.id, nome: prova.nome,
      ano: new Date(prova.data_fim).getFullYear(),
      tipo: tipoProva(prova.nome),
      resultados: leaderboard.map(e => ({ userId: e.perfil.id, rank: e.rank, pontos: e.aposta.pontos_total })),
    })
  }

  const historicasMap = new Map<string, ProvaSummary>()
  for (const h of todasHistoricas as any[]) {
    const key = `${h.ano}-${h.nome_prova}`
    if (!historicasMap.has(key)) {
      historicasMap.set(key, { provaId: `hist-${key}`, nome: h.nome_prova, ano: h.ano, tipo: tipoProva(h.nome_prova), resultados: [] })
    }
    if (h.posicao_grupo) {
      historicasMap.get(key)!.resultados.push({ userId: h.user_id, rank: h.posicao_grupo, pontos: h.pontos_total ?? 0 })
    }
  }
  provasSummary.push(...historicasMap.values())
  provasSummary.sort((a, b) => b.ano - a.ano || a.nome.localeCompare(b.nome))

  // Stats globais por jogador
  type GlobalStats = { userId: string; vitorias: number; pontosTotal: number; provas: number }
  const globalStats: Record<string, GlobalStats> = {}
  for (const p of perfis) globalStats[p.id] = { userId: p.id, vitorias: 0, pontosTotal: 0, provas: 0 }

  for (const ps of provasSummary) {
    for (const r of ps.resultados) {
      if (!globalStats[r.userId]) continue
      globalStats[r.userId].provas++
      globalStats[r.userId].pontosTotal += r.pontos
      if (r.rank === 1) globalStats[r.userId].vitorias++
    }
  }

  const medals = ['🥇', '🥈', '🥉']
  const perfisComStats = perfis
    .map(p => ({ ...p, stats: globalStats[p.id] ?? { vitorias: 0, pontosTotal: 0, provas: 0 } }))
    .sort((a, b) => b.stats.vitorias - a.stats.vitorias || b.stats.pontosTotal - a.stats.pontosTotal)

  return (
    <div className="max-w-3xl mx-auto" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>

      {/* Header */}
      <div className="animate-fade-up">
        <Link href="/" style={{ fontSize: '0.78rem', color: 'var(--text-dim)', display: 'inline-flex', gap: '0.35rem', textDecoration: 'none', marginBottom: '0.75rem' }}>← Dashboard</Link>
        <p style={{ fontSize: '0.7rem', color: 'var(--lime)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: '0.3rem' }}>⚔️ Rivalidade</p>
        <h1 style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 'clamp(1.75rem, 5vw, 2.5rem)', fontWeight: 900, textTransform: 'uppercase', lineHeight: 1 }}>
          Head‑to‑<span style={{ color: 'var(--lime)' }}>Head</span>
        </h1>
        <p style={{ fontSize: '0.8rem', color: 'var(--text-dim)', marginTop: '0.35rem' }}>
          {provasSummary.length} {provasSummary.length === 1 ? 'prova' : 'provas'} no histórico total
        </p>
      </div>

      {/* Cards dos jogadores */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.875rem' }}>
        {perfisComStats.map((p, i) => (
          <Link key={p.id} href={`/perfil/${p.id}`} style={{ textDecoration: 'none' }}>
            <div style={{
              background: 'var(--surface)', border: `1px solid ${i === 0 ? 'rgba(200,244,0,0.3)' : 'var(--border)'}`,
              borderRadius: '1rem', padding: '1.25rem', textAlign: 'center',
              transition: 'all 0.18s', cursor: 'pointer',
              background: i === 0 ? 'linear-gradient(135deg, rgba(200,244,0,0.06) 0%, transparent 60%)' : 'var(--surface)',
            }}>
              {/* Avatar */}
              <div style={{
                width: 60, height: 60, borderRadius: '50%', margin: '0 auto 0.75rem',
                background: p.avatar_url ? 'transparent' : 'rgba(200,244,0,0.1)',
                border: `2.5px solid ${i === 0 ? 'var(--lime)' : 'rgba(255,255,255,0.1)'}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '1.4rem', fontWeight: 900, color: 'var(--lime)',
                fontFamily: 'Barlow Condensed, sans-serif', overflow: 'hidden',
              }}>
                {p.avatar_url
                  ? <img src={p.avatar_url} alt={p.username} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : p.username?.[0]?.toUpperCase()
                }
              </div>

              <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '1.1rem', fontWeight: 800, color: i === 0 ? 'var(--lime)' : 'var(--text)', textTransform: 'uppercase', letterSpacing: '0.03em', marginBottom: '0.875rem' }}>
                {medals[i] ?? `${i + 1}º`} {p.username}
              </p>

              <div style={{ display: 'flex', justifyContent: 'space-around', gap: '0.5rem' }}>
                {[
                  { label: 'Vitórias', value: p.stats.vitorias },
                  { label: 'Pontos', value: p.stats.pontosTotal },
                  { label: 'Provas', value: p.stats.provas },
                ].map(stat => (
                  <div key={stat.label}>
                    <div style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '1.4rem', fontWeight: 900, color: i === 0 ? 'var(--lime)' : 'var(--text)', lineHeight: 1 }}>{stat.value}</div>
                    <div style={{ fontSize: '0.6rem', color: 'var(--text-sub)', textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: '0.15rem' }}>{stat.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* H2H agrupado por competição */}
      {GRUPOS.map(grupo => {
        const provasGrupo = provasSummary.filter(ps => ps.tipo === grupo.key)
        if (provasGrupo.length === 0) return null

        return (
          <div key={grupo.key}>
            {/* Cabeçalho do grupo */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.875rem' }}>
              <div style={{ height: 1, flex: 1, background: 'var(--border)' }} />
              <span style={{ fontSize: '1.25rem' }}>{grupo.flag}</span>
              <h2 style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '1.1rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', color: grupo.cor }}>
                {grupo.label}
              </h2>
              <div style={{ height: 1, flex: 1, background: 'var(--border)' }} />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
              {provasGrupo.sort((a, b) => b.ano - a.ano).map(ps => {
                // Ordenar resultados desta prova por rank
                const resultOrdered = [...ps.resultados].sort((a, b) => a.rank - b.rank)

                return (
                  <div key={ps.provaId} className="card-flush" style={{ overflow: 'hidden' }}>
                    {/* Nome da prova */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.625rem 1rem', background: 'var(--surface-2)', borderBottom: '1px solid var(--border)' }}>
                      <p style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text)' }}>{ps.nome}</p>
                      <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '0.8rem', fontWeight: 800, color: 'var(--text-dim)' }}>{ps.ano}</span>
                    </div>

                    {/* Resultados */}
                    {resultOrdered.map((r, i) => {
                      const perfil = perfis.find(p => p.id === r.userId)
                      if (!perfil) return null
                      const inicial = perfil.username?.[0]?.toUpperCase() ?? '?'
                      return (
                        <div key={r.userId} style={{
                          display: 'flex', alignItems: 'center', gap: '0.75rem',
                          padding: '0.5rem 1rem',
                          borderBottom: i < resultOrdered.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none',
                          background: i === 0 ? 'rgba(200,244,0,0.03)' : 'transparent',
                        }}>
                          {/* Rank */}
                          <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '1rem', fontWeight: 900, width: 26, textAlign: 'center', color: i === 0 ? 'var(--lime)' : 'var(--text-sub)', flexShrink: 0 }}>
                            {medals[i] ?? `${r.rank}º`}
                          </span>
                          {/* Avatar */}
                          <div style={{ width: 28, height: 28, borderRadius: '50%', background: perfil.avatar_url ? 'transparent' : 'rgba(200,244,0,0.1)', border: '1.5px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.65rem', fontWeight: 900, color: 'var(--lime)', fontFamily: 'Barlow Condensed, sans-serif', overflow: 'hidden', flexShrink: 0 }}>
                            {perfil.avatar_url ? <img src={perfil.avatar_url} alt={perfil.username} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : inicial}
                          </div>
                          <span style={{ flex: 1, fontSize: '0.85rem', fontWeight: i === 0 ? 600 : 400, color: i === 0 ? 'var(--lime)' : 'var(--text)' }}>{perfil.username}</span>
                          <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '1rem', fontWeight: 800, color: i === 0 ? 'var(--lime)' : 'var(--text-dim)', flexShrink: 0 }}>{r.pontos}pts</span>
                        </div>
                      )
                    })}
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}
