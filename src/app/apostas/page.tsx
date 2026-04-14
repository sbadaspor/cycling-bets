import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getProvas } from '@/lib/queries'

export default async function ApostasIndexPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/auth/login')

  const provas = await getProvas()
  const provaAberta = provas.find(p => p.status === 'aberta')

  if (provaAberta) redirect(`/apostas/${provaAberta.id}`)

  redirect('/')
}
