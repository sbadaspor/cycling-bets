import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getLeaderboardGeral, getVitoriasAgregadas, getLeaderboardProva } from '@/lib/queries'
import type { CategoriaProvaTipo } from '@/types'

interface Props {
  params: Promise<{ userId: string }>
}

// Detecta o tipo de prova (Giro / Tour / Vuelta) pelo nome
function tipoGrandeVolta(nome: string): 'giro' | 'tour' | 'vuelta' | null {
  const n = nome.toLowerCase()
  if (n.includes('giro'))   return 'giro'
  if (n.includes('tour'))   return 'tour'
  if (n.includes('vuelta')) return 'vuelta'
  return null
}

// Ordem de exibição: mais recente = Vuelta > Tour > Giro dentro do mesmo ano
function ordemDentroAno(nome: string): number {
  const tipo = tipoGrandeVolta(nome)
  if (tipo === 'vuelta') return 3
  if (tipo === 'tour')   return 2
  if (tipo === 'giro')   return 1
  return 0
}

function labelCategoria(tipo: CategoriaProvaTipo) {
  const map: Record<CategoriaProvaTipo, { emoji: string; label: string }> = {
    grande_volta: { emoji: '🏔️', label: 'Grande Volta' },
    prova_semana: { emoji: '📅', label: 'Prova de uma semana' },
    monumento:    { emoji: '🗿', label: 'Monumento' },
    prova_dia:    { emoji: '⚡', label: 'Prova de um dia' },
  }
  return map[tipo] ?? { emoji: '🏆', label: tipo }
}

export default async function PerfilPage({ params }: Props) {
  const { userId } = await params

  const supabase = await createClient()

  // Perfil — inclui jogos_historicos se existir
  const { data: perfil, error } = await supabase
    .from('perfis')
    .select('*')
    .eq('id', userId)
    .single()

  if (error || !perfil) redirect('/')

  // Stats gerais (app) + vitórias agregadas
  const [leaderboard, todasVitorias] = await Promise.all([
    getLeaderboardGeral(),
    getVitoriasAgregadas(),
  ])

  const statsGerais   = leaderboard.find(e => e.perfil.id === userId)
  const statsVitorias = todasVitorias.find(v => v.perfil.id === userId)

  // Competições = histórico pré-app + calculadas na app
  const jogosHistoricos  = (perfil as any).jogos_historicos ?? 0
  const jogosApp         = statsGerais?.apostas.calculadas ?? 0
  const competicoes      = jogosHistoricos + jogosApp

  const vitorias   = statsVitorias?.total ?? 0
  const rankGeral  = statsGerais?.rank ?? null
  const pctVitoria = competicoes > 0 ? Math.round((vitorias / competicoes) * 100) : 0

  // ── Palmares ─────────────────────────────────────────
  // 1. Vitórias históricas (pré-app) deste utilizador
  const { data: historicasRaw } = await supabase
    .from('vitorias_historicas')
    .select('*')
    .eq('user_id', userId)

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

  // Combinar + ordenar: ano desc, dentro do mesmo ano Vuelta > Tour > Giro
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
  ].sort((a, b) =>
    b.ano - a.ano || ordemDentroAno(b.nome) - ordemDentroAno(a.nome)
  )

  // ── Giro / Tour / Vuelta counts ───────────────────────
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

      {/* ── Profile card ───────────────────────────────── */}
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
            { label: 'Competições', value: competicoes, color: '#e0e0f0' },
            { label: 'Vitórias',    value: vitorias,    color: vitorias > 0 ? 'var(--lime)' : '#e0e0f0' },
            {
              label: '% Vitória',
              value: `${pctVitoria}%`,
              color: pctVitoria >= 50 ? 'var(--green)' : pctVitoria > 0 ? '#ffc800' : '#9a9ab5',
            },
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

        {/* Giro · Tour · Vuelta wins */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)' }}>
          {[
            { label: 'Giro', wins: giroWins,   emoji: '🇮🇹' },
            { label: 'Tour', wins: tourWins,   emoji: '🇫🇷' },
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

      {/* ── Palmares ───────────────────────────────────── */}
      {palmares.length > 0 && (
        <div className="card-flush animate-fade-up delay-1">
          <div style={{ padding: '1rem 1.25rem 0.875rem', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
            <p style={{
              fontSize: '0.68rem', color: 'var(--lime)', fontWeight: 700,
              textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.15rem',
            }}>
              🏆 Historial
            </p>
            <h2 style={{
              fontFamily: 'Barlow Condensed, sans-serif', fontSize: '1.2rem',
              fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em',
            }}>
              Competições Ganhas
            </h2>
          </div>

          <div>
            {palmares.map((entrada, idx) => {
              const cat = labelCategoria(entrada.categoria)
              const tipo = tipoGrandeVolta(entrada.nome)
              const flagEmoji = tipo === 'giro' ? '🇮🇹' : tipo === 'tour' ? '🇫🇷' : tipo === 'vuelta' ? '🇪🇸' : '🏆'

              const inner = (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: '1rem',
                  padding: '0.875rem 1.25rem',
                  borderBottom: idx < palmares.length - 1 ? '1px solid rgba(255,255,255,0.07)' : 'none',
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
                  <div style={{ width: 1, height: 30, background: 'rgba(255,255,255,0.1)', flexShrink: 0 }} />

                  {/* Race flag + name */}
                  <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontSize: '1rem', flexShrink: 0 }}>{flagEmoji}</span>
                    <div style={{ minWidth: 0 }}>
                      <p style={{
                        fontSize: '0.9rem', fontWeight: 600,
                        color: entrada.provaId ? '#e0e0f0' : '#b0b0c8',
                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                      }}>
                        {entrada.nome}
                      </p>
                      <p style={{ fontSize: '0.7rem', color: '#9a9ab5', marginTop: '0.1rem' }}>
                        {cat.emoji} {cat.label}
                      </p>
                    </div>
                  </div>

                  {/* Badge + indicator */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
                    {entrada.tipo === 'historica' ? (
                      <span style={{
                        fontSize: '0.6rem', fontWeight: 700, color: '#9a9ab5',
                        background: 'rgba(255,255,255,0.06)',
                        border: '1px solid rgba(255,255,255,0.12)',
                        padding: '0.15rem 0.5rem', borderRadius: '999px',
                        textTransform: 'uppercase', letterSpacing: '0.06em',
                      }}>
                        Histórico
                      </span>
                    ) : (
                      <span style={{ fontSize: '0.75rem', color: 'var(--lime)', opacity: 0.7 }}>→</span>
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

      {/* ── Points breakdown ───────────────────────────── */}
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
