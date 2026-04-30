import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getConfigCategoria } from '@/lib/categoriaConfig'
import type { ApostaFormData, CategoriaProvaTipo } from '@/types'

export async function POST(req: NextRequest) {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }

  const body: ApostaFormData = await req.json()
  const { prova_id, apostas_top20, camisola_sprint, camisola_montanha, camisola_juventude } = body

  if (!prova_id || !apostas_top20) {
    return NextResponse.json({ error: 'Dados inválidos.' }, { status: 400 })
  }

  // Verificar se prova existe, está aberta e obter categoria
  const { data: prova } = await supabase
    .from('provas')
    .select('id, status, categoria')
    .eq('id', prova_id)
    .single()

  if (!prova || prova.status !== 'aberta') {
    return NextResponse.json({ error: 'Prova não disponível para apostas.' }, { status: 400 })
  }

  // Determinar número de posições com base na categoria
  const config = getConfigCategoria(prova.categoria as CategoriaProvaTipo)
  const numPos = config.numPosicoes

  // Validar número de ciclistas preenchidos (as posições extra são strings vazias)
  const preenchidos = apostas_top20.filter(c => c.trim())
  if (preenchidos.length !== numPos) {
    return NextResponse.json(
      { error: `Todos os ${numPos} lugares devem ser preenchidos.` },
      { status: 400 }
    )
  }

  // Upsert da aposta (sempre com array de 20 — posições extra ficam vazias)
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

  // 53 — Notificar os outros 2 jogadores quando alguém aposta
  try {
    const { sendNotificationsToAll } = await import('@/lib/sendNotifications')
    const { data: perfilUser } = await supabase
      .from('perfis').select('username').eq('id', user.id).single()
    const { data: provaInfo } = await supabase
      .from('provas').select('nome').eq('id', prova_id).single()
    const username = perfilUser?.username ?? 'Alguém'
    const nomeProva = provaInfo?.nome ?? 'uma prova'
    await sendNotificationsToAll(
      `🎯 ${username} apostou!`,
      `${username} acabou de submeter a aposta para ${nomeProva}.`,
      `/provas/${prova_id}`,
      user.id // excluir o próprio user
    )
  } catch {
    // best-effort
  }

  return NextResponse.json({ success: true, aposta: data })
}
