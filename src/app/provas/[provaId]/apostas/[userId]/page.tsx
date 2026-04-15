import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getProva, getApostaPorUser, getApostasProvaComPerfil, getUltimaEtapa } from '@/lib/queries'
import { categorizarProva } from '@/lib/provaStatus'
import ApostaDetalhe from '@/components/dashboard/ApostaDetalhe'

interface Props {
  params: Promise<{ provaId: string; userId: string }>
}

export default async function ApostaDetalhePage({ params }: Props) {
  const { provaId, userId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  let prova
  try {
    prova = await getProva(provaId)
  } catch {
    redirect('/apostas')
  }

  const cat = categorizarProva(prova)

  if (userId !== user.id && cat.estado === 'futura') {
    redirect('/apostas')
  }

  const [aposta, todasApostas, ultimaEtapa] = await Promise.all([
    getApostaPorUser(provaId, userId),
    getApostasProvaComPerfil(provaId),
    getUltimaEtapa(provaId),
  ])

  if (!aposta) {
    return (
      <div className="max-w-3xl mx-auto">
        <Link href="/apostas" className="text-sm text-zinc-400 hover:text-zinc-100">
          ← Voltar
        </Link>
        <div className="card text-center py-12 mt-4">
          <div className="text-5xl mb-4">🤷</div>
          <h2 className="text-xl font-bold text-zinc-100">Sem aposta nesta prova</h2>
          <p className="text-zinc-400 mt-2">
            Este utilizador não submeteu aposta para {prova.nome}.
          </p>
        </div>
      </div>
    )
  }

  const ehProvaUser = userId === user.id
  const podeEditar = ehProvaUser && cat.estado === 'futura'

  const apostasOrdenadas = [...todasApostas].sort((a, b) => b.pontos_total - a.pontos_total)
  const ranking = apostasOrdenadas.findIndex(a => a.id === aposta.id) + 1

  const outrasApostas = cat.estado !== 'futura'
    ? todasApostas.filter(a => a.user_id !== userId)
    : []

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <Link href="/apostas" className="text-sm text-zinc-400 hover:text-zinc-100">
          ← Voltar às minhas apostas
        </Link>
        <div className="mt-3 flex items-center gap-3 flex-wrap">
          <h1 className="text-2xl font-bold text-zinc-100">{prova.nome}</h1>
          {cat.estado === 'a_decorrer' && (
            <span className="badge bg-amber-900/50 text-amber-400 border border-amber-800">🟢 A decorrer</span>
          )}
          {cat.estado === 'futura' && (
            <span className="badge bg-blue-900/50 text-blue-400 border border-blue-800">⏳ Futura</span>
          )}
          {cat.estado === 'finalizada' && (
            <span className="badge bg-green-900/50 text-green-400 border border-green-800">✅ Finalizada</span>
          )}
        </div>
        <p className="text-sm text-zinc-500 mt-1">
          Aposta de <strong className="text-zinc-300">{aposta.perfil?.username ?? 'utilizador'}</strong>
          {ranking > 0 && ultimaEtapa && (
            <> · Posição #{ranking} entre {todasApostas.length} apostas</>
          )}
        </p>
        {podeEditar && (
          <Link
            href={`/apostas/${provaId}`}
            className="btn-primary inline-block mt-3"
          >
            ✏️ Editar a minha aposta
          </Link>
        )}
      </div>

      <ApostaDetalhe
        aposta={aposta}
        ultimaEtapa={ultimaEtapa}
        ehProvaUser={ehProvaUser}
      />

      {outrasApostas.length > 0 && (
        <div className="card">
          <h2 className="text-lg font-semibold text-zinc-100 mb-4">
            👥 Outras apostas nesta prova
          </h2>
          <div className="space-y-2">
            {outrasApostas
              .sort((a, b) => b.pontos_total - a.pontos_total)
              .map((a) => {
                const rank = apostasOrdenadas.findIndex(x => x.id === a.id) + 1
                return (
                  <Link
                    key={a.id}
                    href={`/provas/${provaId}/apostas/${a.user_id}`}
                    className="flex items-center justify-between gap-3 rounded-lg border border-zinc-800 bg-zinc-900/50 p-3 hover:bg-zinc-900/80 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <span className="inline-flex items-center justify-center w-8 h-8 rounded-md bg-zinc-800 text-xs font-bold text-zinc-400">
                        #{rank}
                      </span>
                      <span className="text-zinc-100">{a.perfil?.username ?? 'utilizador'}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-amber-400 font-bold">{a.pontos_total} pts</span>
                      <span className="text-zinc-500 text-sm">→</span>
                    </div>
                  </Link>
                )
              })}
          </div>
        </div>
      )}
    </div>
  )
}
