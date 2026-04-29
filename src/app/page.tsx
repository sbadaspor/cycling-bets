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

  const provas = await getProvas()
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

  const [dadosADecorrer, stats, feedItems] = await Promise.all([
    Promise.all(
      provasADecorrer.map(async (prova) => {
        const [apostas, ultimaEtapa] = await Promise.all([
          getApostasProvaComPerfil(prova.id),
          getUltimaEtapa(prova.id),
        ])
        return { prova, apostas, ultimaEtapa }
      })
    ),
    getHomepageStats().catch(() => ({ totalApostas: 0, totalJogadores: 0, provasAtivas: 0 })),
    getActivityFeed(6).catch(() => []),
  ])

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

  const provasSemAposta = user
    ? provasFuturas.filter(p => !provasComAposta.has(p.id) && p.diasAteInicio <= 7)
    : []

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

      {/* Hero */}
      <div className="animate-fade-up">
        <p style={{ fontSize: '0.7rem', color: 'var(--lime)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: '0.3rem' }}>
          ⚡ Ciclismo entre amigos
        </p>
        <h1 style={{
          fontFamily: 'Barlow Condensed, sans-serif',
          fontSize: 'clamp(2rem, 6vw, 2.75rem)', fontWeight: 900,
          textTransform: 'uppercase', letterSpacing: '0.03em',
          lineHeight: 1, marginBottom: '0.5rem',
        }}>
          Velo<span style={{ color: 'var(--lime)' }}>Apostas</span>
        </h1>

        {/* Stats bar */}
        <div style={{ display: 'flex', gap: '1.25rem', flexWrap: 'wrap', paddingTop: '0.25rem' }}>
          {[
            { icon: '🏆', value: stats.provasAtivas, label: stats.provasAtivas === 1 ? 'prova ativa' : 'provas ativas' },
            { icon: '🎯', value: stats.totalApostas, label: 'apostas feitas' },
            { icon: '👥', value: stats.totalJogadores, label: 'jogadores' },
          ].map(({ icon, value, label }) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <span style={{ fontSize: '0.8rem' }}>{icon}</span>
              <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '1.05rem', fontWeight: 800, color: 'var(--lime)' }}>{value}</span>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Alerta aposta em falta */}
      {provasSemAposta.length > 0 && (
        <div className="animate-fade-up" style={{
          background: 'rgba(255,140,0,0.08)', border: '1px solid rgba(255,140,0,0.3)',
          borderRadius: '0.875rem', padding: '0.875rem 1.1rem',
          display: 'flex', alignItems: 'center', gap: '0.875rem', flexWrap: 'wrap',
        }}>
          <div style={{ flex: 1, minWidth: 200 }}>
            <p style={{ fontSize: '0.85rem', fontWeight: 700, color: '#ff9500', margin: 0 }}>
              ⏰ Ainda não apostaste!
            </p>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-dim)', margin: '0.2rem 0 0' }}>
              {provasSemAposta.length === 1
                ? `${provasSemAposta[0].nome} começa ${provasSemAposta[0].diasAteInicio === 0 ? 'hoje' : 'em ' + provasSemAposta[0].diasAteInicio + ' dias'}.`
                : `${provasSemAposta.length} provas a começar em breve sem a tua aposta.`}
            </p>
          </div>
          <a
            href={`/apostas/${provasSemAposta[0].id}`}
            style={{
              background: '#ff9500', color: '#000',
              padding: '0.5rem 1rem', borderRadius: '0.6rem',
              fontSize: '0.8rem', fontWeight: 700,
              textDecoration: 'none', whiteSpace: 'nowrap', flexShrink: 0,
            }}
          >
            Apostar agora →
          </a>
        </div>
      )}

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
            <EmptyStateProxima provasFuturas={provasFuturas} userId={user?.id} />
          )}
          <VitoriasJogadores vitorias={vitorias} grandesVoltas={grandesVoltas} />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div>
            <h2 style={{
              fontFamily: 'Barlow Condensed, sans-serif', fontSize: '1.15rem',
              fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em',
              marginBottom: '0.85rem',
            }}>
              Próximas Provas
            </h2>
            <ProvasList provas={provas} userId={user?.id} provasComAposta={provasComAposta} />
          </div>
          {feedItems.length > 0 && <ActivityFeed items={feedItems} />}
        </div>
      </div>
    </div>
  )
}

function EmptyStateProxima({
  provasFuturas,
  userId,
}: {
  provasFuturas: ReturnType<typeof categorizarProva>[]
  userId?: string
}) {
  const proxima = [...provasFuturas].sort((a, b) => a.diasAteInicio - b.diasAteInicio)[0]

  if (!proxima) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: '3.5rem 1.5rem' }}>
        <div style={{ fontSize: '3rem', marginBottom: '0.75rem' }}>🚴</div>
        <p style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text)', marginBottom: '0.4rem' }}>Sem provas agendadas</p>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-dim)' }}>Aguarda novidades em breve.</p>
      </div>
    )
  }

  const dias = proxima.diasAteInicio
  const txtDias = dias === 0 ? 'Hoje' : dias === 1 ? 'Amanhã' : `Em ${dias} dias`

  return (
    <div className="card" style={{
      textAlign: 'center', padding: '2.5rem 1.5rem',
      background: 'linear-gradient(135deg, rgba(200,244,0,0.04) 0%, transparent 60%)',
    }}>
      <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>⏳</div>
      <p style={{ fontSize: '0.75rem', color: 'var(--lime)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.4rem' }}>
        A aguardar resultados
      </p>
      <p style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text)', marginBottom: '0.25rem' }}>{proxima.nome}</p>
      <p style={{ fontSize: '0.85rem', color: 'var(--text-dim)', marginBottom: '1.25rem' }}>
        {txtDias} · {new Date(proxima.data_inicio).toLocaleDateString('pt-PT', { day: 'numeric', month: 'long' })}
      </p>
      {userId && (
        <a
          href={`/apostas/${proxima.id}`}
          style={{
            display: 'inline-block',
            background: 'rgba(200,244,0,0.9)', color: '#0a0a0a',
            padding: '0.6rem 1.5rem', borderRadius: '0.75rem',
            fontSize: '0.875rem', fontWeight: 700, textDecoration: 'none',
          }}
        >
          Fazer aposta →
        </a>
      )}
    </div>
  )
}
