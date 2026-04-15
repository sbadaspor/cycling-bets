import { createClient } from '@/lib/supabase/server'
import {
  getProvas,
  getApostasProvaComPerfil,
  getUltimaEtapa,
  getUltimaProvaFinalizada,
  getVitoriasAgregadas,
} from '@/lib/queries'
import { categorizarProva } from '@/lib/provaStatus'
import { ProvasList } from '@/components/dashboard/ProvasList'
import ClassificacaoProvaTable from '@/components/dashboard/ClassificacaoProvaTable'
import VitoriasJogadores from '@/components/dashboard/VitoriasJogadores'

export default async function HomePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const provas = await getProvas()
  const provasCategorizadas = provas.map(categorizarProva)
  const provasADecorrer = provasCategorizadas.filter(p => p.categoria === 'a_decorrer')

  // Buscar dados das provas a decorrer (apostas + última etapa de cada)
  const dadosADecorrer = await Promise.all(
    provasADecorrer.map(async (prova) => {
      const [apostas, ultimaEtapa] = await Promise.all([
        getApostasProvaComPerfil(prova.id),
        getUltimaEtapa(prova.id),
      ])
      return { prova, apostas, ultimaEtapa }
    })
  )

  // Se não há provas a decorrer, buscar a última finalizada
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

  // Vitórias agregadas (históricas + provas finalizadas no sistema)
  const vitorias = await getVitoriasAgregadas()

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-zinc-100">🚴 VeloApostas</h1>
        <p className="text-zinc-400 mt-1">
          Sistema de apostas de ciclismo entre amigos
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Coluna principal: classificação + vitórias */}
        <div className="lg:col-span-2 space-y-6">
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
              titulo={`🏆 Classificação da última prova decorrida — ${dadosUltimaFinalizada.prova.nome}`}
            />
          ) : (
            <div className="card text-center py-12 text-zinc-500">
              <p>Ainda não há provas com classificação para mostrar.</p>
            </div>
          )}

          {/* Vitórias por jogador */}
          <VitoriasJogadores vitorias={vitorias} />
        </div>

        {/* Coluna lateral: próximas provas */}
        <div>
          <h2 className="text-xl font-semibold text-zinc-100 mb-4">
            Próximas provas
          </h2>
          <ProvasList provas={provas} userId={user?.id} />
        </div>
      </div>
    </div>
  )
}
