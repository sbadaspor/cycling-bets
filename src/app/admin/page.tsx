import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getProvas } from '@/lib/queries'
import { AdminPanel } from '@/components/forms/AdminPanel'

export default async function AdminPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: perfil } = await supabase
    .from('perfis')
    .select('is_admin')
    .eq('id', user.id)
    .single()

  if (!perfil?.is_admin) redirect('/')

  const provas = await getProvas()

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-zinc-100">⚙️ Painel Admin</h1>
        <p className="text-zinc-400 mt-1">
          Gere provas, startlists e classificações por etapa.
        </p>
      </div>
      <AdminPanel provas={provas} />
    </div>
  )
}
