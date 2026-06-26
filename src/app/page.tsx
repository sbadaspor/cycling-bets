import { createClient } from '@/lib/supabase/server'
import {
  getProvas,
  getApostasProvaComPerfil,
  getUltimaEtapa,
  getUltimaProvaFinalizada,
  getDadosVitorias,
  getHomepageStats,
  getActivityFeed,
  getTodasEtapas,
} from '@/lib/queries'
import { categorizarProva } from '@/lib/provaStatus'
import { ProvasList } from '@/components/dashboard/ProvasList'
import ClassificacaoProvaTable from '@/components/dashboard/ClassificacaoProvaTable'
import VitoriasJogadores from '@/components/dashboard/VitoriasJogadores'
import ActivityFeed from '@/components/dashboard/ActivityFeed'
import MomentoDaVirada from '@/components/dashboard/MomentoDaVirada'
import AuthHashHandler from '@/components/auth/AuthHashHandler'
import type { CategoriaProvaTipo } from '@/types'

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
        const [apostas, ultimaEtapa, todasEtapas] = await Promise.all([
          getApostasProvaComPerfil(prova.id),
          getUltimaEtapa(prova.id),
          getTodasEtapas(prova.id).catch(() => []),
        ])
        return { prova, apostas, ultimaEtapa, todasEtapas }
      })
    ),
    getHomepageStats().catch(() => ({ totalApostas: 0, totalJogadores: 0, provasAtivas: 0 })),
    getActivityFeed(5).catch(() => []),
  ])

  let dadosUltimaFinalizada: {
    prova: typeof provas[number]
    apostas: Awaited<ReturnType<typeof getApostasProvaComPerfil>>
    ultimaEtapa: Awaited<ReturnType<typeof getUltimaEtapa>>
    todasEtapas: Awaited<ReturnType<typeof getTodasEtapas>>
  } | null = null

  if (dadosADecorrer.length === 0) {
    const ultima = await getUltimaProvaFinalizada()
    if (ultima) {
      const [apostas, ultimaEtapa, todasEtapas] = await Promise.all([
        getApostasProvaComPerfil(ultima.id),
        getUltimaEtapa(ultima.id),
        getTodasEtapas(ultima.id).catch(() => []),
      ])
      dadosUltimaFinalizada = { prova: ultima, apostas, ultimaEtapa, todasEtapas }
    }
  }

  const { vitorias, grandesVoltas } = await getDadosVitorias()

  const provasSemAposta = user
    ? provasFuturas.filter(p => !provasComAposta.has(p.id) && p.diasAteInicio <= 7)
    : []

  return (
    <div style={{ minHeight: '100vh', background: '#F6F4EF', fontFamily: "'Archivo', sans-serif" }}>
      <AuthHashHandler />

      <div style={{ maxWidth: 1216, margin: '0 auto', padding: '0 32px' }}>

        {/* Hero */}
        <div style={{ padding: '30px 0 22px', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontFamily: "'JetBrains Mono', monospace", fontSize: 11, fontWeight: 600, letterSpacing: '0.16em', textTransform: 'uppercase', color: '#A79F8E' }}>
              <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#E0451F', display: 'inline-block' }} />
              Ciclismo entre amigos
            </div>
            <h1 style={{ font: "800 40px 'Archivo', sans-serif", letterSpacing: '-0.025em', color: '#16140F', margin: '10px 0 0', lineHeight: 1.05 }}>
              Grandes Voltas
            </h1>
            <p style={{ font: "500 15px 'Archivo', sans-serif", color: '#857E6F', margin: '8px 0 0' }}>
              Giro, Tour e Vuelta entre amigos.
            </p>
          </div>

          {/* Stats */}
          <div style={{ display: 'flex', alignItems: 'stretch', gap: 0 }}>
            {[
              { value: stats.provasAtivas,    label: stats.provasAtivas === 1 ? 'Prova ativa' : 'Provas ativas' },
              { value: stats.totalApostas,    label: 'Apostas feitas' },
              { value: stats.totalJogadores,  label: 'Jogadores' },
            ].map((s, i) => (
              <div key={s.label} style={{ display: 'flex', alignItems: 'stretch' }}>
                {i > 0 && <div style={{ width: 1, background: '#E2DCCF', margin: '0' }} />}
                <div style={{ padding: i === 0 ? '0 22px 0 0' : i === 2 ? '0 0 0 22px' : '0 22px', textAlign: i === 2 ? 'left' : 'left' }}>
                  <div style={{ font: "800 26px 'Archivo', sans-serif", color: '#16140F' }}>{s.value}</div>
                  <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#A79F8E', marginTop: 2 }}>
                    {s.label}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Alerta aposta em falta */}
        {provasSemAposta.length > 0 && (
          <div style={{
            background: 'rgba(224,69,31,0.06)', border: '1px solid rgba(224,69,31,0.2)',
            borderRadius: 13, padding: '14px 18px',
            display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap',
            marginBottom: 20,
          }}>
            <div style={{ flex: 1, minWidth: 200 }}>
              <p style={{ font: "700 14px 'Archivo', sans-serif", color: '#E0451F', margin: 0 }}>
                ⏰ Ainda não apostaste!
              </p>
              <p style={{ font: "500 13px 'Archivo', sans-serif", color: '#857E6F', margin: '3px 0 0' }}>
                {provasSemAposta.length === 1
                  ? `${provasSemAposta[0].nome} começa ${provasSemAposta[0].diasAteInicio === 0 ? 'hoje' : 'em ' + provasSemAposta[0].diasAteInicio + ' dias'}.`
                  : `${provasSemAposta.length} provas a começar em breve sem a tua aposta.`}
              </p>
            </div>
            <a href={`/apostas/${provasSemAposta[0].id}`} style={{
              background: '#16140F', color: '#fff',
              padding: '10px 16px', borderRadius: 10,
              font: "700 13px 'Archivo', sans-serif",
              textDecoration: 'none', whiteSpace: 'nowrap',
            }}>
              Apostar agora →
            </a>
          </div>
        )}

        {/* Main grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: 20, paddingBottom: 40 }}>

          {/* LEFT */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {dadosADecorrer.length > 0 ? (
              dadosADecorrer.map(({ prova, apostas, ultimaEtapa, todasEtapas }) => (
                <div key={prova.id} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                  <ClassificacaoProvaTable prova={prova} apostas={apostas} ultimaEtapa={ultimaEtapa} />
                  {todasEtapas.length > 1 && apostas.length > 1 && (
                    <MomentoDaVirada
                      etapas={todasEtapas}
                      apostas={apostas}
                      categoria={prova.categoria as CategoriaProvaTipo}
                    />
                  )}
                </div>
              ))
            ) : dadosUltimaFinalizada ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                <ClassificacaoProvaTable
                  prova={dadosUltimaFinalizada.prova}
                  apostas={dadosUltimaFinalizada.apostas}
                  ultimaEtapa={dadosUltimaFinalizada.ultimaEtapa}
                  titulo={`Última prova — ${dadosUltimaFinalizada.prova.nome}`}
                />
                {dadosUltimaFinalizada.todasEtapas.length > 1 && dadosUltimaFinalizada.apostas.length > 1 && (
                  <MomentoDaVirada
                    etapas={dadosUltimaFinalizada.todasEtapas}
                    apostas={dadosUltimaFinalizada.apostas}
                    categoria={dadosUltimaFinalizada.prova.categoria as CategoriaProvaTipo}
                  />
                )}
              </div>
            ) : (
              <EmptyState provasFuturas={provasFuturas} userId={user?.id} />
            )}

            <VitoriasJogadores vitorias={vitorias} grandesVoltas={grandesVoltas} />
          </div>

          {/* RIGHT */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <ProvasList provas={provas} userId={user?.id} provasComAposta={provasComAposta} />
            {feedItems.length > 0 && <ActivityFeed items={feedItems} />}
          </div>
        </div>
      </div>
    </div>
  )
}

function EmptyState({
  provasFuturas,
  userId,
}: {
  provasFuturas: ReturnType<typeof categorizarProva>[]
  userId?: string
}) {
  const proxima = [...provasFuturas].sort((a, b) => a.diasAteInicio - b.diasAteInicio)[0]

  if (!proxima) {
    return (
      <section style={{ background: '#fff', border: '1px solid #E9E4D9', borderRadius: 16, padding: '3rem 1.5rem', textAlign: 'center' }}>
        <div style={{ fontSize: 32, marginBottom: 12 }}>🚴</div>
        <p style={{ font: "600 16px 'Archivo', sans-serif", color: '#16140F', margin: 0 }}>Sem provas agendadas</p>
        <p style={{ font: "500 14px 'Archivo', sans-serif", color: '#A79F8E', margin: '6px 0 0' }}>Aguarda novidades em breve.</p>
      </section>
    )
  }

  const dias = proxima.diasAteInicio

  return (
    <section style={{ background: '#fff', border: '1px solid #E9E4D9', borderRadius: 16, padding: '2.5rem 1.5rem', textAlign: 'center' }}>
      <div style={{ fontSize: 28, marginBottom: 12 }}>⏳</div>
      <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#A79F8E', marginBottom: 6 }}>
        A aguardar resultados
      </div>
      <p style={{ font: "700 18px 'Archivo', sans-serif", color: '#16140F', margin: 0 }}>{proxima.nome}</p>
      <p style={{ font: "500 13px 'Archivo', sans-serif", color: '#A79F8E', margin: '6px 0 20px' }}>
        {dias === 0 ? 'Hoje' : `Em ${dias} dias`} · {new Date(proxima.data_inicio).toLocaleDateString('pt-PT', { day: 'numeric', month: 'long' })}
      </p>
      {userId && (
        <a href={`/apostas/${proxima.id}`} style={{
          display: 'inline-block', background: '#16140F', color: '#fff',
          padding: '10px 24px', borderRadius: 10,
          font: "700 14px 'Archivo', sans-serif", textDecoration: 'none',
        }}>
          Fazer aposta →
        </a>
      )}
    </section>
  )
}
