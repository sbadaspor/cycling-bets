import { createClient } from '@/lib/supabase/server'
import {
  getProvas,
  getApostasProvaComPerfil,
  getUltimaEtapa,
  getUltimaProvaFinalizada,
  getVitoriasAgregadas,
  getLeaderboardProva,
} from '@/lib/queries'
import { categorizarProva } from '@/lib/provaStatus'
import { ProvasList } from '@/components/dashboard/ProvasList'
import ClassificacaoProvaTable from '@/components/dashboard/ClassificacaoProvaTable'
import VitoriasJogadores from '@/components/dashboard/VitoriasJogadores'

function tipoGrandeVolta(nome: string): 'giro' | 'tour' | 'vuelta' | null {
  const n = nome.toLowerCase()
  if (n.includes('giro'))   return 'giro'
  if (n.includes('tour'))   return 'tour'
  if (n.includes('vuelta')) return 'vuelta'
  return null
}

export default async function HomePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const provas = await getProvas()
  const provasCategorizadas = provas.map(categorizarProva)
  const provasADecorrer = provasCategorizadas.filter(p => p.estado === 'a_decorrer')

  const dadosADecorrer = await Promise.all(
    provasADecorrer.map(async (prova) => {
      const [apostas, ultimaEtapa] = await Promise.all([
        getApostasProvaComPerfil(prova.id),
        getUltimaEtapa(prova.id),
      ])
      return { prova, apostas, ultimaEtapa }
    })
  )

  let dadosUltimaFinalizada: {
    prova: typeof provas[number]
    apostas: Awaited<ReturnType<typeof getApostasProvaComPerfil>>
    ultimaEtapa: Awaited<ReturnType<typeof getUltimaEtapa>>
  } | null = null

  if (dadosADecorrer.length === 0) {
    const ultima = await getUltimaProvaFinalizada()
    if (ultima) {
      const [apostas, ultimaEtapa] = await Promise.all([
        getApostasProvaComPerfil(ultima.id),
        getUltimaEtapa(ultima.id),
      ])
      dadosUltimaFinalizada = { prova: ultima, apostas, ultimaEtapa }
    }
  }

  const vitorias = await getVitoriasAgregadas()

  // ── Grandes Voltas breakdown ──────────────────────────
  // Mapa: perfil.id → { giro, tour, vuelta }
  const gvMap = new Map<string, { giro: number; tour: number; vuelta: number }>()

  const ensureEntry = (uid: string) => {
    if (!gvMap.has(uid)) gvMap.set(uid, { giro: 0, tour: 0, vuelta: 0 })
    return gvMap.get(uid)!
  }

  // 1. Histórico pré-app — join com perfis para obter o mesmo ID que VitoriasJogador usa
  const { data: historicasRaw } = await supabase
    .from('vitorias_historicas')
    .select('nome_prova, perfil:perfis!user_id(id)')

  for (const h of (historicasRaw ?? [])) {
    const perfilId = (h.perfil as any)?.id as string | undefined
    if (!perfilId) continue
    const tipo = tipoGrandeVolta(h.nome_prova)
    if (!tipo) continue
    ensureEntry(perfilId)[tipo]++
  }

  // 2. Provas da app finalizadas — vencedor do leaderboard
  const { data: provasFinalizadas } = await supabase
    .from('provas')
    .select('id, nome, categoria')
    .eq('status', 'finalizada')

  for (const prova of (provasFinalizadas ?? [])) {
    const tipo = tipoGrandeVolta(prova.nome)
    if (!tipo) continue
    const lb = await getLeaderboardProva(prova.id)
    if (lb.length > 0 && lb[0].perfil?.id) {
      ensureEntry(lb[0].perfil.id)[tipo]++
    }
  }

  const grandesVoltas = Array.from(gvMap.entries()).map(([userId, v]) => ({ userId, ...v }))

  return (
    <div>
      {/* ── Hero header ───────────────────────── */}
      <div className="animate-fade-up" style={{ marginBottom: '1.5rem' }}>
        <p style={{ fontSize: '0.7rem', color: 'var(--lime)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: '0.3rem' }}>
          ⚡ Ciclismo entre amigos
        </p>
        <h1 style={{
          fontFamily: 'Barlow Condensed, sans-serif',
          fontSize: 'clamp(2rem, 6vw, 2.75rem)', fontWeight: 900,
          textTransform: 'uppercase', letterSpacing: '0.03em',
          lineHeight: 1, marginBottom: '0.4rem',
        }}>
          Velo<span style={{ color: 'var(--lime)' }}>Apostas</span>
        </h1>
        <p style={{ fontSize: '0.875rem', color: 'var(--text-dim)' }}>
          Previsões Top-20 · Classificações especiais
        </p>
      </div>

      {/* ── Main layout ───────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3" style={{ gap: '1.25rem' }}>

        <div className="lg:col-span-2" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {dadosADecorrer.length > 0 ? (
            dadosADecorrer.map(({ prova, apostas, ultimaEtapa }) => (
              <ClassificacaoProvaTable
                key={prova.id}
                prova={prova}
                apostas={apostas}
                ultimaEtapa={ultimaEtapa}
              />
            ))
          ) : dadosUltimaFinalizada ? (
            <ClassificacaoProvaTable
              prova={dadosUltimaFinalizada.prova}
              apostas={dadosUltimaFinalizada.apostas}
              ultimaEtapa={dadosUltimaFinalizada.ultimaEtapa}
              titulo={`Última prova — ${dadosUltimaFinalizada.prova.nome}`}
            />
          ) : (
            <div className="card" style={{ textAlign: 'center', padding: '3rem 1.25rem', color: 'var(--text-dim)' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>🚴</div>
              <p style={{ fontSize: '0.9rem' }}>Ainda não há provas com classificação para mostrar.</p>
            </div>
          )}

          <VitoriasJogadores vitorias={vitorias} grandesVoltas={grandesVoltas} />
        </div>

        <div>
          <div style={{ marginBottom: '0.85rem' }}>
            <h2 style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '1.15rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Próximas Provas
            </h2>
          </div>
          <ProvasList provas={provas} userId={user?.id} />
        </div>
      </div>
    </div>
  )
}
