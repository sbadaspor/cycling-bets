import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getProva, getMinhaAposta, getCiclistas } from '@/lib/queries'
import { ApostaForm } from '@/components/forms/ApostaForm'
import { podeApostar } from '@/lib/provaStatus'

interface Props {
  params: Promise<{ provaId: string }>
}

export default async function ApostaPage({ params }: Props) {
  const { provaId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  let prova
  try {
    prova = await getProva(provaId)
  } catch {
    redirect('/apostas')
  }

  // Bloqueio: só dá para apostar/editar se a prova ainda for futura
  if (!podeApostar(prova)) {
    redirect(`/apostas`)
  }

  const [minhaAposta, ciclistas] = await Promise.all([
    getMinhaAposta(provaId, user.id),
    getCiclistas(provaId),
  ])

  // Se não houver startlist, também não dá para apostar
  if (ciclistas.length === 0) {
    return (
      <div className="max-w-3xl mx-auto">
        <div className="mb-6">
          <Link href="/apostas" className="text-sm text-zinc-400 hover:text-zinc-100">
            ← Voltar às minhas apostas
          </Link>
          <h1 className="text-2xl font-bold text-zinc-100 mt-2">{prova.nome}</h1>
        </div>

        <div className="card text-center py-12">
          <div className="text-5xl mb-4">📋</div>
          <h2 className="text-xl font-bold text-zinc-100">Startlist em breve</h2>
          <p className="text-zinc-400 mt-2 max-w-md mx-auto">
            A lista de ciclistas desta prova ainda não foi carregada. Volta a tentar mais tarde — só poderás apostar depois da startlist estar disponível.
          </p>
          <Link href="/apostas" className="btn-primary inline-block mt-6">
            ← Voltar
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6">
        <Link href="/apostas" className="text-sm text-zinc-400 hover:text-zinc-100">
          ← Voltar às minhas apostas
        </Link>
        <h1 className="text-2xl font-bold text-zinc-100 mt-2">{prova.nome}</h1>
        <p className="text-zinc-400 mt-1">
          {minhaAposta ? 'Atualizar a tua aposta' : 'Submete a tua previsão'}
        </p>
        <div className="flex items-center gap-2 mt-2 flex-wrap">
          <span className="badge bg-blue-900/50 text-blue-400 border border-blue-800">
            ⏳ Apostas abertas até {prova.data_inicio}
          </span>
          {minhaAposta && (
            <span className="badge bg-amber-900/50 text-amber-400 border border-amber-800">
              ✏️ A editar aposta existente
            </span>
          )}
          <span className="badge bg-zinc-800 text-zinc-400 border border-zinc-700">
            {ciclistas.length} ciclistas na startlist
          </span>
        </div>
      </div>

      <ApostaForm
        prova={prova}
        apostaExistente={minhaAposta}
        ciclistas={ciclistas}
      />
    </div>
  )
}
