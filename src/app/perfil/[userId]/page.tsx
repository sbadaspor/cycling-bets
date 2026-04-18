import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getLeaderboardGeral, getVitoriasAgregadas, getLeaderboardProva } from '@/lib/queries'
import type { CategoriaProvaTipo } from '@/types'

interface Props {
  params: Promise<{ userId: string }>
}

const CATEGORIAS: { tipo: CategoriaProvaTipo; label: string; emoji: string }[] = [
  { tipo: 'grande_volta',  label: 'Grande Volta',        emoji: '🏔️' },
  { tipo: 'prova_semana',  label: 'Prova de uma semana', emoji: '📅' },
  { tipo: 'monumento',     label: 'Monumento',           emoji: '🗿' },
  { tipo: 'prova_dia',     label: 'Prova de um dia',     emoji: '⚡' },
]

function labelCategoria(tipo: CategoriaProvaTipo) {
  return CATEGORIAS.find(c => c.tipo === tipo) ?? { emoji: '🏆', label: tipo }
}

export default async function PerfilPage({ params }: Props) {
  const { userId } = await params

  const supabase = await createClient()

  // Perfil
  const { data: perfil, error } = await supabase
    .from('perfis')
    .select('*')
    .eq('id', userId)
    .single()

  if (error || !perfil) redirect('/')

  // Stats gerais + vitórias agregadas
  const [leaderboard, todasVitorias] = await Promise.all([
    getLeaderboardGeral(),
    getVitoriasAgregadas(),
  ])

  const statsGerais   = leaderboard.find(e => e.perfil.id === userId)
  const statsVitorias = todasVitorias.find(v => v.perfil.id === userId)

  const competicoes = statsGerais?.apostas.calculadas ?? 0
  const vitorias    = statsVitorias?.total ?? 0
  const pontosTotal = statsGerais?.pontos_total ?? 0
  const pctVitoria  = competicoes > 0 ? Math.round((vitorias / competicoes) * 100) : 0
  const rankGeral   = statsGerais?.rank ?? null

  // ── Palmares ─────────────────────────────────────────
  // 1. Vitórias históricas (pré-app)
  const { data: historicasRaw } = await supabase
    .from('vitorias_historicas')
    .select('*')
    .eq('user_id', userId)
    .order('ano', { ascending: false })

  const historicas = (historicasRaw ?? []) as {
    id: string; ano: number; nome_prova: string; categoria: CategoriaProvaTipo
  }[]

  // 2. Provas da app ganhas por este utilizador
  const { data: provasFinalizadas } = await supabase
    .from('provas')
    .select('id, nome, data_fim, categoria')
    .eq('status', 'finalizada')

  const provasGanhasApp: {
    nome: string; ano: number; categoria: CategoriaProvaTipo; provaId: string
  }[] = []

  for (const prova of (provasFinalizadas ?? [])) {
    const lb = await getLeaderboardProva(prova.id)
    if (lb.length > 0 && lb[0].perfil.id === userId) {
      provasGanhasApp.push({
        nome: prova.nome,
        ano: new Date(prova.data_fim).getFullYear(),
        categoria: prova.categoria as CategoriaProvaTipo,
        provaId: prova.id,
      })
    }
  }

  // Combinar e ordenar por ano desc
  type EntradaPalmar = {
    key: string; nome: string; ano: number
    categoria: CategoriaProvaTipo; provaId?: string; tipo: 'historica' | 'app'
  }

  const palmares: EntradaPalmar[] = [
    ...historicas.map(h => ({
      key: h.id, nome: h.nome_prova, ano: h.ano,
      categoria: h.categoria, tipo: 'historica' as const,
    })),
    ...provasGanhasApp.map(p => ({
      key: `app-${p.provaId}`, nome: p.nome, ano: p.ano,
      categoria: p.categoria, provaId: p.provaId, tipo: 'app' as const,
    })),
  ].sort((a, b) => b.ano - a.ano || a.nome.localeCompare(b.nome))

  const initial = perfil.username?.[0]?.toUpperCase() ?? '?'

  return (
    <div className="max-w-xl mx-auto" style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>

      <div className="animate-fade-up">
        <Link href="/" style={{
          fontSize: '0.78rem', color: 'var(--text-dim)',
          display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
          textDecoration: 'none', marginBottom: '0.75rem',
        }}>
          ← Dashboard
        </Link>
      </div>

      {/* Profile card */}
      <div className="card-flush animate-fade-up">
        <div style={{
          padding: '1.75rem 1.5rem',
          background: 'linear-gradient(135deg, rgba(200,244,0,0.08) 0%, rgba(200,244,0,0.02) 50%, transparent 100%)',
          borderBottom: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', gap: '1.25rem',
        }}>
          <div style={{
            width: 72, height: 72, borderRadius: '50%', flexShrink: 0,
            background: 'rgba(200,244,0,0.12)', border: '2px solid rgba(200,244,0,0.3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: 'Barlow Condensed, sans-serif',
            fontSize: '2rem', fontWeight: 900, color: 'var(--lime)',
          }}>
            {initial}
          </div>
          <div>
            {rankGeral && (
              <p style={{
                fontSize: '0.65rem', fontWeight: 700, color: 'var(--lime)',
                textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: '0.2rem',
              }}>
                {rankGeral === 1 ? '🥇' : rankGeral === 2 ? '🥈' : rankGeral === 3 ? '🥉' : `#${rankGeral}`} Rank geral
              </p>
            )}
            <h1 style={{
              fontFamily: 'Barlow Condensed, sans-serif',
              fontSize: '2.25rem', fontWeight: 900,
              textTransform: 'uppercase', letterSpacing: '0.04em',
              color: 'var(--text)', lineHeight: 1,
            }}>
              {perfil.username}
            </h1>
            {perfil.full_name && (
              <p style={{ fontSize: '0.82rem', color: 'var(--text-dim)', marginTop: '0.25rem' }}>
                {perfil.full_name}
              </p>
            )}
          </div>
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', borderBottom: '1px solid var(--border)' }}>
          {[
            { label: 'Competições', value: competicoes, color: 'var(--text)' },
            { label: 'Vitórias',    value: vitorias,    color: vitorias > 0 ? 'var(--lime)' : 'var(--text)' },
            { label: '% Vitória',   value: `${pctVitoria}%`, color: pctVitoria >= 50 ? 'var(--green)' : pctVitoria > 0 ? '#ffc800' : 'var(--text-dim)' },
          ].map((stat, i) => (
            <div key={stat.label} style={{
              padding: '1.5rem 1rem', textAlign: 'center',
              borderRight: i < 2 ? '1px solid var(--border)' : 'none',
            }}>
              <div style={{
                fontFamily: 'Barlow Condensed, sans-serif',
                fontSize: '2.5rem', fontWeight: 900,
                color: stat.color, lineHeight: 1, marginBottom: '0.4rem',
              }}>
                {stat.value}
              </div>
              <div style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-sub)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                {stat.label}
              </div>
            </div>
          ))}
        </div>

        <div style={{
          padding: '1rem 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: 'var(--surface-2)',
        }}>
          <span style={{ fontSize: '0.78rem', color: 'var(--text-dim)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Pontos totais acumulados
          </span>
          <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '1.5rem', fontWeight: 900, color: 'var(--lime)' }}>
            {pontosTotal} <span style={{ fontSize: '0.7rem', color: 'var(--text-sub)', fontWeight: 400 }}>pts</span>
          </span>
        </div>
      </div>

      {/* Palmares */}
      {palmares.length > 0 && (
        <div className="card-flush animate-fade-up delay-1">
          <div style={{ padding: '1rem 1.25rem 0.875rem', borderBottom: '1px solid var(--border)' }}>
            <p style={{ fontSize: '0.68rem', color: 'var(--lime)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.15rem' }}>
              🏆 Historial
            </p>
            <h2 style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '1.2rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Competições Ganhas
            </h2>
          </div>

          <div>
            {palmares.map((entrada, idx) => {
              const cat = labelCategoria(entrada.categoria)

              const inner = (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: '1rem',
                  padding: '0.875rem 1.25rem',
                  borderBottom: idx < palmares.length - 1 ? '1px solid var(--border)' : 'none',
                }}>
                  {/* Year */}
                  <span style={{
                    fontFamily: 'Barlow Condensed, sans-serif',
                    fontSize: '1.05rem', fontWeight: 900, color: 'var(--lime)',
                    width: 40, flexShrink: 0, textAlign: 'center',
                  }}>
                    {entrada.ano}
                  </span>

                  {/* Separator */}
                  <div style={{ width: 1, height: 30, background: 'var(--border)', flexShrink: 0 }} />

                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{
                      fontSize: '0.9rem', fontWeight: 600,
                      color: entrada.provaId ? 'var(--text)' : 'var(--text-dim)',
                      whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                    }}>
                      {entrada.nome}
                    </p>
                    <p style={{ fontSize: '0.7rem', color: 'var(--text-sub)', marginTop: '0.1rem' }}>
                      {cat.emoji} {cat.label}
                    </p>
                  </div>

                  {/* Badge + trophy */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
                    {entrada.tipo === 'historica' && (
                      <span style={{
                        fontSize: '0.6rem', fontWeight: 700, color: 'var(--text-sub)',
                        background: 'var(--surface-2)', border: '1px solid var(--border)',
                        padding: '0.15rem 0.45rem', borderRadius: '999px',
                        textTransform: 'uppercase', letterSpacing: '0.06em',
                      }}>
                        Histórico
                      </span>
                    )}
                    {entrada.provaId && (
                      <span style={{ fontSize: '0.6rem', color: 'var(--lime)', opacity: 0.7 }}>→</span>
                    )}
                    <span style={{ fontSize: '1rem' }}>🏆</span>
                  </div>
                </div>
              )

              return entrada.provaId ? (
                <Link
                  key={entrada.key}
                  href={`/provas/${entrada.provaId}`}
                  style={{ display: 'block', textDecoration: 'none', transition: 'background 0.12s' }}
                >
                  {inner}
                </Link>
              ) : (
                <div key={entrada.key}>{inner}</div>
              )
            })}
          </div>
        </div>
      )}

      {/* Points breakdown */}
      {statsGerais && (
        <div className="card-flush animate-fade-up delay-2">
          <div style={{ padding: '1rem 1.25rem 0.875rem', borderBottom: '1px solid var(--border)' }}>
            <p style={{ fontSize: '0.68rem', color: 'var(--lime)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.15rem' }}>
              📊 Detalhe
            </p>
            <h2 style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '1.2rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Pontuação
            </h2>
          </div>
          <div style={{ padding: '0.25rem 1.25rem' }}>
            {[
              { label: 'Pontos Top-10',    value: statsGerais.pontos_top10 },
              { label: 'Pontos Top-20',    value: statsGerais.pontos_top20 },
              { label: 'Pontos Camisolas', value: statsGerais.pontos_camisolas },
              { label: 'Acertos exatos',   value: statsGerais.acertos_exatos },
            ].map((item, idx, arr) => (
              <div key={item.label} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '0.75rem 0',
                borderBottom: idx < arr.length - 1 ? '1px solid var(--border)' : 'none',
              }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-dim)' }}>{item.label}</span>
                <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '1.1rem', fontWeight: 800, color: 'var(--text)' }}>
                  {item.value}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  )
}
