import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendNotificationsToAll } from '@/lib/sendNotifications'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    // Verificar sessão de admin — a chave nunca precisa de sair do servidor
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

    const { data: perfil } = await supabase
      .from('perfis').select('is_admin').eq('id', user.id).single()
    if (!perfil?.is_admin) return NextResponse.json({ error: 'Apenas admins.' }, { status: 403 })

    const { title, body, url, user_ids } = await request.json()
    const result = await sendNotificationsToAll(title, body, url, user_ids)
    return NextResponse.json(result)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erro desconhecido'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
