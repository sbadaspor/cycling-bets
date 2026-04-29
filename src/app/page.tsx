import { createClient } from '@/lib/supabase/server'
import {
  getProvas,
  getApostasProvaComPerfil,
  getUltimaEtapa,
  getUltimaProvaFinalizada,
  getDadosVitorias,
  getHomepageStats,
  getActivityFeed,
} from '@/lib/queries'
import { categorizarProva } from '@/lib/provaStatus'
import { ProvasList } from '@/components/dashboard/ProvasList'
import ClassificacaoProvaTable from '@/components/dashboard/ClassificacaoProvaTable'
import VitoriasJogadores from '@/components/dashboard/VitoriasJogadores'
import ActivityFeed from '@/components/dashboard/ActivityFeed'

export default async function HomePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [provas, stats, activityFeed] = await Promise.all([
    getProvas(),
    getHomepageStats(),
    getActivityFeed(6),
  ])

  const provasCategorizadas = provas.map(categorizarProva)
  const provasADecorrer = provasCategorizadas.filter(p => p.estado === 'a_decorrer')
  const provasFuturas = provasCategorizadas.filter(p => p.estado === 'futura')

  let provasComAposta = new Set<string>()
  if (user && provasFuturas.length > 0) {
    const { data: apostasExistentes } = await supabase
      .from('apostas')
      .select('prova_id')
      .eq('user_id', user.id)
      .in('prova_id', provasFuturas.map(p => p.id))
    provasComAposta = new Set((apostasExistentes ?? []).map((a: { prova_id: string }) => a.prova_id))
  }

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

  const { vitorias, grandesVoltas } = await getDadosVitorias()

  return (
    <div>
      {/* Hero */}
      <div className="animate-fade-up hero-glow" style={{ marginBottom: '1.25rem', position: 'relative' }}>
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

      {/* Stats bar */}
      <StatsBar
        totalApostas={stats.totalApostas}
        totalJogadores={stats.totalJogadores}
        provasAtivas={stats.provasAtivas}
      />

      {/* Main layout */}
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

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div>
            <h2 style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '1.15rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.85rem' }}>
              Próximas Provas
            </h2>
            <ProvasList provas={provas} userId={user?.id} provasComAposta={provasComAposta} />
          </div>

          <ActivityFeed items={activityFeed} />
        </div>
      </div>
    </div>
  )
}
