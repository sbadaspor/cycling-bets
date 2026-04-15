import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getProvas, countCiclistas } from '@/lib/queries'
import MinhasApostasList from '@/components/dashboard/MinhasApostasList'

export default async function ApostasPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const provas = await getProvas()

  // Para cada prova, buscar:
  // - Se o user tem aposta
  // - Quantos ciclistas tem na startlist
  const dadosPorProva = await Promise.all(
    provas.map(async (p) => {
      const { data: aposta } = await supabase
        .from('apostas')
        .select('id, pontos_total')
        .eq('prova_id', p.id)
        .eq('user_id', user.id)
        .maybeSingle()

      const ciclistasCount = await countCiclistas(p.id)

      return {
        prova: p,
        temAposta: !!aposta,
        pontos: aposta?.pontos_total ?? 0,
        temStartlist: ciclistasCount > 0,
      }
    })
  )

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-zinc-100">📋 Minhas Apostas</h1>
        <p className="text-zinc-400 mt-1">
          Aposta nas provas futuras e consulta as tuas apostas nas provas a decorrer e finalizadas.
        </p>
      </div>

      <MinhasApostasList dadosPorProva={dadosPorProva} userId={user.id} />
    </div>
  )
}
