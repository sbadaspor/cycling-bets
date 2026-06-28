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
      return { prova: p, temAposta: !!aposta, pontos: aposta?.pontos_total ?? 0, temStartlist: ciclistasCount > 0 }
    })
  )

  return (
    <div style={{ maxWidth: 720, margin: '0 auto' }}>
      <div style={{ padding: '20px 0 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
          <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#E0451F', display: 'inline-block' }} />
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, fontWeight: 600, letterSpacing: '0.16em', textTransform: 'uppercase', color: '#A79F8E' }}>
            Gestão
          </span>
        </div>
        <h1 style={{ font: "800 36px 'Archivo', sans-serif", letterSpacing: '-0.02em', color: '#16140F', margin: 0 }}>
          As minhas apostas
        </h1>
        <p style={{ font: "500 14px 'Archivo', sans-serif", color: '#857E6F', margin: '6px 0 0' }}>
          Aposta nas provas futuras e acompanha os resultados.
        </p>
      </div>
      <MinhasApostasList dadosPorProva={dadosPorProva} userId={user.id} />
    </div>
  )
}
