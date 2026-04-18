import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getProva, getLeaderboardProva, getResultadoProva } from '@/lib/queries'
import Link from 'next/link'

interface Props {
  params: Promise<{ provaId: string }>
}

export default async function ProvaPage({ params }: Props) {
  const { provaId } = await params
  let prova
  try { prova = await getProva(provaId) } catch { redirect('/') }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const [leaderboard, resultado] = await Promise.all([
    getLeaderboardProva(provaId),
    getResultadoProva(provaId),
  ])

  const medals = ['🥇', '🥈', '🥉']
  const statusMap: Record<string, { label: string; cls: string }> = {
    aberta: { label: '● Aberta', cls: 'badge-aberta' },
    fechada: { label: '● Fechada', cls: 'badge-fechada' },
    finalizada: { label: '✓ Finalizada', cls: 'badge-finalizada' },
  }
  const st = statusMap[prova.status] ?? statusMap['finalizada']

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="animate-fade-up" style={{ marginBottom: '1.5rem' }}>
        <Link href="/" style={{ fontSize: '0.78rem', color: 'var(--text-dim)', display: 'inline-flex', alignItems: 'center', gap: '0.35rem', marginBottom: '0.75rem', textDecoration: 'none' }}>
          ← Dashboard
        </Link>
        <h1 className="section-title" style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>{prova.nome}</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', flexWrap: 'wrap' }}>
          <span className={`badge ${st.cls}`}>{st.label}</span>
          <span style={{ fontSize: '0.78rem', color: 'var(--text-dim)' }}>
            {new Date(prova.data_inicio).toLocaleDateString('pt-PT', { day: 'numeric', month: 'short', year: 'numeric' })}
            {' → '}
            {new Date(prova.data_fim).toLocaleDateString('pt-PT', { day: 'numeric', month: 'short', year: 'numeric' })}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5" style={{ gap: '1.25rem' }}>
        {/* Leaderboard */}
        <div className="lg:col-span-3">
          <h2 className="section-title animate-fade-up" style={{ fontSize: '1.15rem', marginBottom: '0.85rem' }}>Classificação</h2>

          {leaderboard.length === 0 ? (
            <div className="card animate-fade-up delay-1" style={{ textAlign: 'center', padding: '3rem 1.25rem' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>🏁</div>
              <p style={{ color: 'var(--text-dim)', fontSize: '0.875rem', marginBottom: prova.status === 'aberta' && user ? '1.25rem' : 0 }}>
                {prova.status === 'aberta'
                  ? 'Os resultados aparecem quando a prova for finalizada.'
                  : 'Sem apostas calculadas.'}
              </p>
              {prova.status === 'aberta' && user && (
                <Link href={`/apostas/${provaId}`} className="btn-primary" style={{ display: 'inline-flex' }}>
                  Fazer Aposta →
                </Link>
              )}
            </div>
          ) : (
            <div className="card-flush animate-fade-up delay-1">
              {leaderboard.map(({ rank, perfil, aposta }, idx) => {
                const isMe = perfil.id === user?.id
                return (
                  <div
                    key={perfil.id}
                    className="table-row-alt"
                    style={{
                      display: 'flex', alignItems: 'center', gap: '0.875rem',
                      padding: '0.85rem 1.25rem',
                      borderBottom: idx < leaderboard.length - 1 ? '1px solid var(--border)' : 'none',
                      background: isMe ? 'rgba(200,244,0,0.05)' : undefined,
                    }}
                  >
                    <span style={{
                      fontSize: rank <= 3 ? '1.1rem' : '0.8rem', fontWeight: 800,
                      color: rank <= 3 ? 'var(--lime)' : 'var(--text-dim)',
                      fontFamily: 'Barlow Condensed, sans-serif', width: 28, flexShrink: 0,
                    }}>
                      {medals[idx] ?? rank}
                    </span>
                    <Link
                      href={`/provas/${provaId}/apostas/${perfil.id}`}
                      style={{
                        flex: 1, fontSize: '0.9rem', fontWeight: isMe ? 600 : 500,
                        color: isMe ? 'var(--lime)' : 'var(--text)',
                        textDecoration: 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}
                    >
                      {perfil.username}{isMe && <span style={{ fontSize: '0.68rem', marginLeft: '4px', opacity: 0.6 }}>tu</span>}
                    </Link>
                    <div className="hidden sm:flex items-center gap-3" style={{ color: 'var(--text-dim)', fontSize: '0.75rem' }}>
                      {aposta.pontos_top10 != null && <span>T10: {aposta.pontos_top10}</span>}
                      {aposta.pontos_top20 != null && <span>T20: {aposta.pontos_top20}</span>}
                      {aposta.pontos_camisolas != null && <span>🎽 {aposta.pontos_camisolas}</span>}
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <span style={{
                        fontFamily: 'Barlow Condensed, sans-serif', fontSize: '1.25rem', fontWeight: 800,
                        color: rank <= 3 ? 'var(--lime)' : isMe ? 'var(--lime)' : 'var(--text)',
                      }}>{aposta.pontos_total}</span>
                      <span style={{ fontSize: '0.62rem', color: 'var(--text-sub)', marginLeft: 2 }}>pts</span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Resultado Oficial */}
        <div className="lg:col-span-2">
          <h2 className="section-title animate-fade-up delay-1" style={{ fontSize: '1.15rem', marginBottom: '0.85rem' }}>Resultado Oficial</h2>

          {resultado ? (
            <div className="card-flush animate-fade-up delay-2">
              <div style={{ padding: '0.7rem 1rem', background: 'var(--surface-2)', borderBottom: '1px solid var(--border)' }}>
                <p style={{ fontSize: '0.65rem', color: 'var(--text-sub)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Top 20 oficial</p>
              </div>
              <div>
                {resultado.resultado_top20.map((ciclista, idx) => (
                  <div key={idx} style={{
                    display: 'flex', alignItems: 'center', gap: '0.75rem',
                    padding: '0.55rem 1rem',
                    borderBottom: idx < resultado.resultado_top20.length - 1 ? '1px solid var(--border)' : 'none',
                  }}>
                    <span style={{
                      fontSize: '0.72rem', fontWeight: 800, width: 20, textAlign: 'center', flexShrink: 0,
                      fontFamily: 'Barlow Condensed, sans-serif',
                      color: idx < 10 ? 'var(--lime)' : 'var(--text-sub)',
                    }}>
                      {idx + 1}
                    </span>
                    <span style={{ fontSize: '0.85rem', color: 'var(--text)' }}>{ciclista}</span>
                  </div>
                ))}
              </div>

              {(resultado.camisola_sprint || resultado.camisola_montanha || resultado.camisola_juventude) && (
                <div style={{ borderTop: '1px solid var(--border)', padding: '0.75rem 1rem', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                  <p style={{ fontSize: '0.65rem', color: 'var(--text-sub)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.25rem' }}>Camisolas</p>
                  {resultado.camisola_sprint && <p style={{ fontSize: '0.82rem', color: 'var(--text)' }}>🟢 <span style={{ color: 'var(--text-dim)' }}>Sprint:</span> {resultado.camisola_sprint}</p>}
                  {resultado.camisola_montanha && <p style={{ fontSize: '0.82rem', color: 'var(--text)' }}>🔴 <span style={{ color: 'var(--text-dim)' }}>Montanha:</span> {resultado.camisola_montanha}</p>}
                  {resultado.camisola_juventude && <p style={{ fontSize: '0.82rem', color: 'var(--text)' }}>⚪ <span style={{ color: 'var(--text-dim)' }}>Juventude:</span> {resultado.camisola_juventude}</p>}
                </div>
              )}
            </div>
          ) : (
            <div className="card animate-fade-up delay-2" style={{ textAlign: 'center', padding: '2.5rem 1.25rem' }}>
              <div style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>⏳</div>
              <p style={{ color: 'var(--text-dim)', fontSize: '0.875rem' }}>
                {prova.status === 'finalizada' ? 'Resultado não disponível.' : 'A aguardar o resultado oficial.'}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
