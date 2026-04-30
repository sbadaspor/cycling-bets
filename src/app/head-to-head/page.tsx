import { createClient } from '@/lib/supabase/server'
import { getAllLeaderboardsFinalizadas } from '@/lib/queries'
import Link from 'next/link'
import DynamicTheme from '@/components/ui/DynamicTheme'

export default async function HeadToHeadPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [perfis, todosLeaderboards] = await Promise.all([
    supabase.from('perfis').select('id, username, avatar_url, full_name').then(r => r.data ?? []),
    getAllLeaderboardsFinalizadas(),
  ])

  if (perfis.length < 2) {
    return <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>Ainda não há jogadores suficientes.</div>
  }

  // Calcular estatísticas head-to-head para cada par
  type Stats = { vitorias: number; pontos: number; provas: number; melhorPos: number }
  type H2H = Record<string, Record<string, Stats>>

  const h2h: H2H = {}
  for (const p of perfis) {
    h2h[p.id] = {}
    for (const q of perfis) {
      if (p.id !== q.id) h2h[p.id][q.id] = { vitorias: 0, pontos: 0, provas: 0, melhorPos: 99 }
    }
  }

  const provasSummary: Array<{
    provaId: string; nome: string; ano: number
    resultados: Array<{ userId: string; rank: number; pontos: number }>
  }> = []

  for (const { prova, leaderboard } of todosLeaderboards) {
    if (leaderboard.length === 0) continue
    const res = leaderboard.map(e => ({ userId: e.perfil.id, rank: e.rank, pontos: e.aposta.pontos_total }))
    provasSummary.push({ provaId: prova.id, nome: prova.nome, ano: new Date(prova.data_fim).getFullYear(), resultados: res })

    for (const a of res) {
      for (const b of res) {
        if (a.userId === b.userId) continue
        if (!h2h[a.userId]?.[b.userId]) continue
        h2h[a.userId][b.userId].provas++
        h2h[a.userId][b.userId].pontos += a.pontos
        if (a.rank < b.rank) h2h[a.userId][b.userId].vitorias++
        if (a.rank < h2h[a.userId][b.userId].melhorPos) h2h[a.userId][b.userId].melhorPos = a.rank
      }
    }
  }

  const medals = ['🥇', '🥈', '🥉']

  return (
    <div className="max-w-2xl mx-auto" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <DynamicTheme />
      <div className="animate-fade-up">
        <Link href="/" style={{ fontSize: '0.78rem', color: 'var(--text-dim)', display: 'inline-flex', gap: '0.35rem', textDecoration: 'none', marginBottom: '0.75rem' }}>← Dashboard</Link>
        <p style={{ fontSize: '0.7rem', color: 'var(--lime)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: '0.3rem' }}>⚔️ Rivalidade</p>
        <h1 style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 'clamp(1.75rem, 5vw, 2.5rem)', fontWeight: 900, textTransform: 'uppercase', lineHeight: 1 }}>
          Head‑to‑<span style={{ color: 'var(--lime)' }}>Head</span>
        </h1>
      </div>

      {/* Pares de rivalidade */}
      {perfis.flatMap((a, ai) =>
        perfis.slice(ai + 1).map(b => {
          const ab = h2h[a.id]?.[b.id]
          const ba = h2h[b.id]?.[a.id]
          if (!ab || !ba || ab.provas === 0) return null

          const vA = ab.vitorias, vB = ba.vitorias
          const total = vA + vB
          const pctA = total > 0 ? Math.round((vA / total) * 100) : 50
          const lider = vA > vB ? a : vB > vA ? b : null

          const inicialA = a.username?.[0]?.toUpperCase() ?? '?'
          const inicialB = b.username?.[0]?.toUpperCase() ?? '?'

          return (
            <div key={`${a.id}-${b.id}`} className="card-flush animate-fade-up" style={{ overflow: 'hidden' }}>
              {/* Header */}
              <div style={{ padding: '0.875rem 1.25rem', borderBottom: '1px solid var(--border)', background: 'linear-gradient(135deg, rgba(200,244,0,0.05) 0%, transparent 60%)' }}>
                <p style={{ fontSize: '0.68rem', color: 'var(--text-dim)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  {lider ? `👑 ${lider.username} lidera` : '🤝 Empate histórico'}
                </p>
              </div>

              <div style={{ padding: '1.25rem' }}>
                {/* Avatares e nomes */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.25rem' }}>
                  {/* Jogador A */}
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                    <div style={{ width: 52, height: 52, borderRadius: '50%', background: a.avatar_url ? 'transparent' : 'rgba(200,244,0,0.12)', border: `2px solid ${lider?.id === a.id ? 'var(--lime)' : 'rgba(255,255,255,0.1)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.25rem', fontWeight: 900, color: 'var(--lime)', overflow: 'hidden', fontFamily: 'Barlow Condensed, sans-serif' }}>
                      {a.avatar_url ? <img src={a.avatar_url} alt={a.username} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : inicialA}
                    </div>
                    <span style={{ fontSize: '0.8rem', fontWeight: 700, color: lider?.id === a.id ? 'var(--lime)' : 'var(--text)' }}>{a.username}</span>
                    <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '2rem', fontWeight: 900, color: lider?.id === a.id ? 'var(--lime)' : 'var(--text)', lineHeight: 1 }}>{vA}</span>
                    <span style={{ fontSize: '0.65rem', color: 'var(--text-sub)', textTransform: 'uppercase' }}>vitórias</span>
                  </div>

                  {/* VS */}
                  <div style={{ textAlign: 'center', flexShrink: 0 }}>
                    <div style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '1.5rem', fontWeight: 900, color: 'var(--text-sub)' }}>VS</div>
                    <div style={{ fontSize: '0.68rem', color: 'var(--text-sub)', marginTop: '0.25rem' }}>{ab.provas} {ab.provas === 1 ? 'prova' : 'provas'}</div>
                  </div>

                  {/* Jogador B */}
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                    <div style={{ width: 52, height: 52, borderRadius: '50%', background: b.avatar_url ? 'transparent' : 'rgba(200,244,0,0.12)', border: `2px solid ${lider?.id === b.id ? 'var(--lime)' : 'rgba(255,255,255,0.1)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.25rem', fontWeight: 900, color: 'var(--lime)', overflow: 'hidden', fontFamily: 'Barlow Condensed, sans-serif' }}>
                      {b.avatar_url ? <img src={b.avatar_url} alt={b.username} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : inicialB}
                    </div>
                    <span style={{ fontSize: '0.8rem', fontWeight: 700, color: lider?.id === b.id ? 'var(--lime)' : 'var(--text)' }}>{b.username}</span>
                    <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '2rem', fontWeight: 900, color: lider?.id === b.id ? 'var(--lime)' : 'var(--text)', lineHeight: 1 }}>{vB}</span>
                    <span style={{ fontSize: '0.65rem', color: 'var(--text-sub)', textTransform: 'uppercase' }}>vitórias</span>
                  </div>
                </div>

                {/* Barra de progresso */}
                <div style={{ height: 6, background: 'var(--surface-2)', borderRadius: '999px', overflow: 'hidden', marginBottom: '1rem' }}>
                  <div style={{ height: '100%', width: `${pctA}%`, background: 'linear-gradient(90deg, var(--lime), rgba(200,244,0,0.5))', borderRadius: '999px', transition: 'width 0.5s ease' }} />
                </div>

                {/* Histórico de provas */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                  {provasSummary.map(ps => {
                    const rA = ps.resultados.find(r => r.userId === a.id)
                    const rB = ps.resultados.find(r => r.userId === b.id)
                    if (!rA || !rB) return null
                    const ganhouA = rA.rank < rB.rank
                    const empate = rA.rank === rB.rank
                    return (
                      <div key={ps.provaId} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.4rem 0.625rem', background: 'var(--surface-2)', borderRadius: '0.5rem' }}>
                        <span style={{ fontSize: '0.7rem', flex: 1, color: 'var(--text-dim)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ps.nome} {ps.ano}</span>
                        <span style={{ fontSize: '0.68rem', fontWeight: 700, color: ganhouA ? 'var(--lime)' : empate ? 'var(--text-sub)' : 'var(--text-sub)', fontFamily: 'Barlow Condensed, sans-serif', minWidth: '2.5rem', textAlign: 'center' }}>
                          {medals[rA.rank - 1] ?? `${rA.rank}º`} {rA.pontos}pt
                        </span>
                        <span style={{ fontSize: '0.65rem', color: 'var(--text-sub)' }}>vs</span>
                        <span style={{ fontSize: '0.68rem', fontWeight: 700, color: !ganhouA && !empate ? 'var(--lime)' : 'var(--text-sub)', fontFamily: 'Barlow Condensed, sans-serif', minWidth: '2.5rem', textAlign: 'center' }}>
                          {medals[rB.rank - 1] ?? `${rB.rank}º`} {rB.pontos}pt
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          )
        })
      ).filter(Boolean)}
    </div>
  )
}
