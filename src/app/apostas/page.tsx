import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getProvas, countCiclistas } from '@/lib/queries'
import MinhasApostasList from '@/components/dashboard/MinhasApostasList'

export default async function ApostasPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const provas = await getProvas()

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
    <div className="max-w-2xl mx-auto">
      <div className="animate-fade-up" style={{ marginBottom: '1.5rem' }}>
        <p style={{ fontSize: '0.7rem', color: 'var(--lime)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: '0.3rem' }}>
          📋 Gestão
        </p>
        <h1 style={{
          fontFamily: 'Barlow Condensed, sans-serif',
          fontSize: '2rem', fontWeight: 900, textTransform: 'uppercase',
          letterSpacing: '0.03em', lineHeight: 1, marginBottom: '0.4rem',
        }}>
          Minhas <span style={{ color: 'var(--lime)' }}>Apostas</span>
        </h1>
        <p style={{ fontSize: '0.875rem', color: 'var(--text-dim)' }}>
          Aposta nas provas futuras e acompanha os resultados.
        </p>
      </div>

      <MinhasApostasList dadosPorProva={dadosPorProva} userId={user.id} />
    </div>
  )
}
