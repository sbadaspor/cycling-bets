import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getLeaderboardGeral, getVitoriasAgregadas, getLeaderboardProva } from '@/lib/queries'
import type { CategoriaProvaTipo } from '@/types'
import PerfilSections, { type EntradaPalmar, type ResultadoApp } from '@/components/perfil/PerfilSections'

interface Props {
  params: Promise<{ userId: string }>
}

function tipoGrandeVolta(nome: string): 'giro' | 'tour' | 'vuelta' | null {
  const n = nome.toLowerCase()
  if (n.includes('giro'))   return 'giro'
  if (n.includes('tour'))   return 'tour'
  if (n.includes('vuelta')) return 'vuelta'
  return null
}

function ordemDentroAno(nome: string): number {
  const tipo = tipoGrandeVolta(nome)
  if (tipo === 'vuelta') return 3
  if (tipo === 'tour')   return 2
  if (tipo === 'giro')   return 1
  return 0
}

export default async function PerfilPage({ params }: Props) {
  const { userId } = await params
  const supabase = await createClient()

  const { data: perfil, error } = await supabase
    .from('perfis')
    .select('*')
    .eq('id', userId)
    .single()

  if (error || !perfil) redirect('/')

  const [leaderboard, todasVitorias] = await Promise.all([
    getLeaderboardGeral(),
    getVitoriasAgregadas(),
  ])

  const statsGerais   = leaderboard.find(e => e.perfil.id === userId)
  const statsVitorias = todasVitorias.find(v => v.perfil.id === userId)

  const jogosHistoricos = (perfil as any).jogos_historicos ?? 0
  const jogosApp        = statsGerais?.apostas.calculadas ?? 0
  const competicoes     = jogosHistoricos + jogosApp
  const vitorias        = statsVitorias?.total ?? 0
  const rankGeral       = statsGerais?.rank ?? null
  const pctVitoria      = competicoes > 0 ? Math.round((vitorias / competicoes) * 100) : 0

  // ── Provas finalizadas ──────────────────────────────
  const { data: provasFinalizadas } = await supabase
    .from('provas')
    .select('id, nome, data_fim, categoria')
    .eq('status', 'finalizada')
    .order('data_fim', { ascending: false })

  // ── Palmares ────────────────────────────────────────
  const { data: historicasRaw } = await supabase
    .from('vitorias_historicas')
    .select('*')
    .eq('user_id', userId)

  const historicas = (historicasRaw ?? []) as {
    id: string; ano: number; nome_prova: string; categoria: CategoriaProvaTipo
  }[]

  const provasGanhasApp: {
    nome: string; ano: number; categoria: CategoriaProvaTipo; provaId: string
  }[] = []

  // ── Os meus resultados (app) ────────────────────────
  const resultadosApp: ResultadoApp[] = []

  for (const prova of (provasFinalizadas ?? [])) {
    const lb = await getLeaderboardProva(prova.id)
    if (lb.length === 0) continue

    // Vitória
    if (lb[0].perfil.id === userId) {
      provasGanhasApp.push({
        nome: prova.nome,
        ano: new Date(prova.data_fim).getFullYear(),
        categoria: prova.categoria as CategoriaProvaTipo,
        provaId: prova.id,
      })
    }

    // Resultado deste user
    const meuLugar = lb.find(e => e.perfil.id === userId)
    if (meuLugar) {
      resultadosApp.push({
        provaId: prova.id,
        nome: prova.nome,
        ano: new Date(prova.data_fim).getFullYear(),
        posicao: meuLugar.rank,
        pontosTotal: meuLugar.aposta.pontos_total,
        totalParticipantes: lb.length,
      })
    }
  }

  // Ordenar resultados: mais recente primeiro (Vuelta > Tour > Giro no mesmo ano)
  resultadosApp.sort((a, b) =>
    b.ano - a.ano || ordemDentroAno(b.nome) - ordemDentroAno(a.nome)
  )

  // Palmares combinado e ordenado
  const palmares: EntradaPalmar[] = [
    ...historicas.map(h => ({
      key: h.id, nome: h.nome_prova, ano: h.ano,
      categoria: h.categoria, tipo: 'historica' as const,
    })),
    ...provasGanhasApp.map(p => ({
      key: `app-${p.provaId}`, nome: p.nome, ano: p.ano,
      categoria: p.categoria, provaId: p.provaId, tipo: 'app' as const,
    })),
  ].sort((a, b) =>
    b.ano - a.ano || ordemDentroAno(b.nome) - ordemDentroAno(a.nome)
  )

  // Giro / Tour / Vuelta wins
  const giroWins   = palmares.filter(e => tipoGrandeVolta(e.nome) === 'giro').length
  const tourWins   = palmares.filter(e => tipoGrandeVolta(e.nome) === 'tour').length
  const vueltaWins = palmares.filter(e => tipoGrandeVolta(e.nome) === 'vuelta').length

  const initial = perfil.username?.[0]?.toUpperCase() ?? '?'

  return (
    <div className="max-w-xl mx-auto" style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>

      <div className="animate-fade-up">
        <Link href="/" style={{
          fontSize: '0.78rem', color: '#9a9ab5',
          display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
          textDecoration: 'none', marginBottom: '0.75rem',
        }}>
          ← Dashboard
        </Link>
      </div>

      {/* ── Profile card ───────────────────────────── */}
      <div className="card-flush animate-fade-up">
        {/* Header */}
        <div style={{
          padding: '1.75rem 1.5rem',
          background: 'linear-gradient(135deg, rgba(200,244,0,0.08) 0%, rgba(200,244,0,0.02) 50%, transparent 100%)',
          borderBottom: '1px solid rgba(255,255,255,0.1)',
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
              fontSize: '2.25rem', fontWeight: 900, textTransform: 'uppercase',
              letterSpacing: '0.04em', color: 'var(--text)', lineHeight: 1,
            }}>
              {perfil.username}
            </h1>
            {perfil.full_name && (
              <p style={{ fontSize: '0.82rem', color: '#9a9ab5', marginTop: '0.25rem' }}>
                {perfil.full_name}
              </p>
            )}
          </div>
        </div>

        {/* Stats: Competições · Vitórias · % Vitória */}
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)',
          borderBottom: '1px solid rgba(255,255,255,0.1)',
        }}>
          {[
            { label: 'Competições', value: competicoes,      color: '#e0e0f0' },
            { label: 'Vitórias',    value: vitorias,         color: vitorias > 0 ? 'var(--lime)' : '#e0e0f0' },
            { label: '% Vitória',   value: `${pctVitoria}%`, color: pctVitoria >= 50 ? 'var(--green)' : pctVitoria > 0 ? '#ffc800' : '#9a9ab5' },
          ].map((stat, i) => (
            <div key={stat.label} style={{
              padding: '1.5rem 1rem', textAlign: 'center',
              borderRight: i < 2 ? '1px solid rgba(255,255,255,0.1)' : 'none',
            }}>
              <div style={{
                fontFamily: 'Barlow Condensed, sans-serif',
                fontSize: '2.5rem', fontWeight: 900,
                color: stat.color, lineHeight: 1, marginBottom: '0.4rem',
              }}>
                {stat.value}
              </div>
              <div style={{
                fontSize: '0.65rem', fontWeight: 700, color: '#9a9ab5',
                textTransform: 'uppercase', letterSpacing: '0.1em',
              }}>
                {stat.label}
              </div>
            </div>
          ))}
        </div>

        {/* Giro · Tour · Vuelta */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)' }}>
          {[
            { label: 'Giro',   wins: giroWins,   emoji: '🇮🇹' },
            { label: 'Tour',   wins: tourWins,   emoji: '🇫🇷' },
            { label: 'Vuelta', wins: vueltaWins, emoji: '🇪🇸' },
          ].map((item, i) => (
            <div key={item.label} style={{
              padding: '1.1rem 1rem', textAlign: 'center',
              borderRight: i < 2 ? '1px solid rgba(255,255,255,0.1)' : 'none',
              background: item.wins > 0 ? 'rgba(200,244,0,0.04)' : 'transparent',
            }}>
              <div style={{ fontSize: '1rem', marginBottom: '0.3rem' }}>{item.emoji}</div>
              <div style={{
                fontFamily: 'Barlow Condensed, sans-serif',
                fontSize: '1.75rem', fontWeight: 900,
                color: item.wins > 0 ? 'var(--lime)' : '#6a6a86',
                lineHeight: 1, marginBottom: '0.3rem',
              }}>
                {item.wins}
              </div>
              <div style={{
                fontSize: '0.62rem', fontWeight: 700, color: '#9a9ab5',
                textTransform: 'uppercase', letterSpacing: '0.1em',
              }}>
                {item.label}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Accordion sections (client) ────────────── */}
      <div className="animate-fade-up delay-1">
        <PerfilSections resultados={resultadosApp} palmares={palmares} />
      </div>

      {/* ── Points breakdown ───────────────────────── */}
      {statsGerais && (
        <div className="card-flush animate-fade-up delay-2">
          <div style={{ padding: '1rem 1.25rem 0.875rem', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
            <p style={{
              fontSize: '0.68rem', color: 'var(--lime)', fontWeight: 700,
              textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.15rem',
            }}>
              📊 Detalhe
            </p>
            <h2 style={{
              fontFamily: 'Barlow Condensed, sans-serif', fontSize: '1.2rem',
              fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em',
            }}>
              Pontuação na App
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
                borderBottom: idx < arr.length - 1 ? '1px solid rgba(255,255,255,0.07)' : 'none',
              }}>
                <span style={{ fontSize: '0.85rem', color: '#b0b0c8' }}>{item.label}</span>
                <span style={{
                  fontFamily: 'Barlow Condensed, sans-serif',
                  fontSize: '1.1rem', fontWeight: 800, color: '#e0e0f0',
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
