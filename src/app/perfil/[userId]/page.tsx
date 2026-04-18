import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getLeaderboardGeral, getVitoriasAgregadas } from '@/lib/queries'
import type { CategoriaProvaTipo } from '@/types'

interface Props {
  params: Promise<{ userId: string }>
}

const CATEGORIAS: { tipo: CategoriaProvaTipo; label: string; emoji: string }[] = [
  { tipo: 'grande_volta',  label: 'Grandes Voltas',       emoji: '🏔️' },
  { tipo: 'prova_semana',  label: 'Provas de uma semana',  emoji: '📅' },
  { tipo: 'monumento',     label: 'Monumentos',            emoji: '🗿' },
  { tipo: 'prova_dia',     label: 'Provas de um dia',      emoji: '⚡' },
]

export default async function PerfilPage({ params }: Props) {
  const { userId } = await params

  const supabase = await createClient()

  // Buscar perfil
  const { data: perfil, error } = await supabase
    .from('perfis')
    .select('*')
    .eq('id', userId)
    .single()

  if (error || !perfil) redirect('/')

  // Buscar stats do leaderboard geral e vitórias
  const [leaderboard, todasVitorias] = await Promise.all([
    getLeaderboardGeral(),
    getVitoriasAgregadas(),
  ])

  const statsGerais = leaderboard.find(e => e.perfil.id === userId)
  const statsVitorias = todasVitorias.find(v => v.perfil.id === userId)

  const competicoes = statsGerais?.apostas.calculadas ?? 0
  const vitorias = statsVitorias?.total ?? 0
  const pontosTotal = statsGerais?.pontos_total ?? 0
  const pctVitoria = competicoes > 0 ? Math.round((vitorias / competicoes) * 100) : 0
  const rankGeral = statsGerais?.rank ?? null

  const initial = perfil.username?.[0]?.toUpperCase() ?? '?'

  const categoriasComVitorias = CATEGORIAS.filter(
    c => (statsVitorias?.porCategoria[c.tipo] ?? 0) > 0
  )

  return (
    <div className="max-w-xl mx-auto" style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>

      {/* Back */}
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
      <div className="card-flush animate-fade-up" style={{ overflow: 'hidden' }}>
        {/* Header with gradient */}
        <div style={{
          padding: '1.75rem 1.5rem',
          background: 'linear-gradient(135deg, rgba(200,244,0,0.08) 0%, rgba(200,244,0,0.02) 50%, transparent 100%)',
          borderBottom: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', gap: '1.25rem',
        }}>
          {/* Avatar */}
          <div style={{
            width: 72, height: 72, borderRadius: '50%', flexShrink: 0,
            background: 'rgba(200,244,0,0.12)',
            border: '2px solid rgba(200,244,0,0.3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: 'Barlow Condensed, sans-serif',
            fontSize: '2rem', fontWeight: 900, color: 'var(--lime)',
          }}>
            {initial}
          </div>

          {/* Name + rank */}
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

        {/* Stats grid */}
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)',
          borderBottom: '1px solid var(--border)',
        }}>
          {[
            { label: 'Competições', value: competicoes, color: 'var(--text)' },
            { label: 'Vitórias', value: vitorias, color: vitorias > 0 ? 'var(--lime)' : 'var(--text)' },
            { label: '% Vitória', value: `${pctVitoria}%`, color: pctVitoria >= 50 ? 'var(--green)' : pctVitoria > 0 ? '#ffc800' : 'var(--text-dim)' },
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
              <div style={{
                fontSize: '0.65rem', fontWeight: 700,
                color: 'var(--text-sub)',
                textTransform: 'uppercase', letterSpacing: '0.1em',
              }}>
                {stat.label}
              </div>
            </div>
          ))}
        </div>

        {/* Points total */}
        <div style={{
          padding: '1rem 1.5rem',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: 'var(--surface-2)',
        }}>
          <span style={{ fontSize: '0.78rem', color: 'var(--text-dim)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Pontos totais acumulados
          </span>
          <span style={{
            fontFamily: 'Barlow Condensed, sans-serif',
            fontSize: '1.5rem', fontWeight: 900, color: 'var(--lime)',
          }}>
            {pontosTotal} <span style={{ fontSize: '0.7rem', color: 'var(--text-sub)', fontWeight: 400 }}>pts</span>
          </span>
        </div>
      </div>

      {/* Victories by category */}
      {categoriasComVitorias.length > 0 && (
        <div className="card-flush animate-fade-up delay-1">
          <div style={{ padding: '1rem 1.25rem 0.875rem', borderBottom: '1px solid var(--border)' }}>
            <p style={{ fontSize: '0.68rem', color: 'var(--lime)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.15rem' }}>
              🏆 Palmarés
            </p>
            <h2 style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '1.2rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Vitórias por Categoria
            </h2>
          </div>
          <div style={{ padding: '0.875rem 1.25rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {categoriasComVitorias.map(c => {
              const n = statsVitorias?.porCategoria[c.tipo] ?? 0
              return (
                <div key={c.tipo} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '0.75rem 1rem', borderRadius: '0.75rem',
                  background: 'var(--surface-2)', border: '1px solid var(--border)',
                }}>
                  <span style={{ fontSize: '0.9rem', color: 'var(--text)' }}>
                    {c.emoji} {c.label}
                  </span>
                  <span style={{
                    fontFamily: 'Barlow Condensed, sans-serif',
                    fontSize: '1.25rem', fontWeight: 900, color: 'var(--lime)',
                  }}>
                    {n}×
                  </span>
                </div>
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
          <div style={{ padding: '0.875rem 1.25rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {[
              { label: 'Pontos Top-10', value: statsGerais.pontos_top10 },
              { label: 'Pontos Top-20', value: statsGerais.pontos_top20 },
              { label: 'Pontos Camisolas', value: statsGerais.pontos_camisolas },
              { label: 'Acertos exatos', value: statsGerais.acertos_exatos },
            ].map(item => (
              <div key={item.label} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '0.6rem 0',
                borderBottom: '1px solid var(--border)',
              }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-dim)' }}>{item.label}</span>
                <span style={{
                  fontFamily: 'Barlow Condensed, sans-serif',
                  fontSize: '1.1rem', fontWeight: 800, color: 'var(--text)',
                }}>
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
