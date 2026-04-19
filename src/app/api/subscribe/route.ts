import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  const supabase = await createClient()

  try {
    // Obter o utilizador autenticado da sessão
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    const body = await request.json()
    // Extrair user_id do body (enviado pelo cliente) ou usar o da sessão
    // Usamos sempre o da sessão para segurança
    const { user_id: _ignored, ...subscription } = body

    // Usar o service role para contornar RLS
    const { createClient: createServiceClient } = await import('@supabase/supabase-js')
    const serviceSupabase = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    await serviceSupabase
      .from('push_subscriptions')
      .upsert(
        {
          endpoint: subscription.endpoint,
          subscription,
          user_id: user.id,
        },
        { onConflict: 'endpoint' }
      )

    return NextResponse.json({ ok: true })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erro desconhecido'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
