import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getProva, getMinhaAposta } from '@/lib/queries'
import { ApostaForm } from '@/components/forms/ApostaForm'

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
    redirect('/')
  }

  if (prova.status !== 'aberta') {
    redirect(`/provas/${provaId}`)
  }

  const minhaAposta = await getMinhaAposta(provaId, user.id)

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6">
        <div className="flex items-center gap-2 text-zinc-500 text-sm mb-2">
          <span>🏆 Apostas</span>
          <span>›</span>
          <span>{prova.nome}</span>
        </div>
        <h1 className="text-2xl font-bold text-zinc-100">{prova.nome}</h1>
        <p className="text-zinc-400 mt-1">
          {minhaAposta ? 'Atualizar a tua aposta' : 'Submete a tua previsão'}
        </p>
        <div className="flex items-center gap-2 mt-2">
          <span className="badge-aberta">🟢 Aberta até resultados</span>
          {minhaAposta && (
            <span className="badge bg-blue-900/50 text-blue-400 border border-blue-800">
              Aposta existente
            </span>
          )}
        </div>
      </div>

      <ApostaForm prova={prova} apostaExistente={minhaAposta} />
    </div>
  )
}
