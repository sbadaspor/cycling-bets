import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { ApostaFormData } from '@/types'

export async function POST(req: NextRequest) {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }

  const body: ApostaFormData = await req.json()
  const { prova_id, apostas_top20, camisola_sprint, camisola_montanha, camisola_juventude } = body

  // Validações
  if (!prova_id || !apostas_top20 || apostas_top20.length !== 20) {
    return NextResponse.json({ error: 'Dados inválidos. Necessário 20 ciclistas.' }, { status: 400 })
  }

  if (apostas_top20.some(c => !c.trim())) {
    return NextResponse.json({ error: 'Todos os 20 lugares devem ser preenchidos.' }, { status: 400 })
  }

  // Verificar se prova existe e está aberta
  const { data: prova } = await supabase
    .from('provas')
    .select('id, status')
    .eq('id', prova_id)
    .single()

  if (!prova || prova.status !== 'aberta') {
    return NextResponse.json({ error: 'Prova não disponível para apostas.' }, { status: 400 })
  }

  // Upsert da aposta
  const { data, error } = await supabase
    .from('apostas')
    .upsert({
      prova_id,
      user_id: user.id,
      apostas_top20,
      camisola_sprint: camisola_sprint || null,
      camisola_montanha: camisola_montanha || null,
      camisola_juventude: camisola_juventude || null,
      calculada: false,
    }, { onConflict: 'prova_id,user_id' })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true, aposta: data })
}
