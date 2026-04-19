import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { calcularPontos } from '@/lib/pontuacao'
import type { ResultadoFormData } from '@/types'

export async function POST(req: NextRequest) {
  const supabase = await createClient()

  // Verificar autenticação e admin
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }

  const { data: perfil } = await supabase
    .from('perfis')
    .select('is_admin')
    .eq('id', user.id)
    .single()

  if (!perfil?.is_admin) {
    return NextResponse.json({ error: 'Acesso negado. Apenas admins.' }, { status: 403 })
  }

  const body: ResultadoFormData = await req.json()
  const { prova_id, resultado_top20, camisola_sprint, camisola_montanha, camisola_juventude } = body

  // Validações
  if (!prova_id || !resultado_top20 || resultado_top20.length !== 20) {
    return NextResponse.json({ error: 'Dados inválidos. Necessário 20 ciclistas no resultado.' }, { status: 400 })
  }

  // Upsert do resultado real
  const { error: resultadoError } = await supabase
    .from('resultados_reais')
    .upsert({
      prova_id,
      resultado_top20,
      camisola_sprint: camisola_sprint || null,
      camisola_montanha: camisola_montanha || null,
      camisola_juventude: camisola_juventude || null,
      inserido_por: user.id,
    }, { onConflict: 'prova_id' })

  if (resultadoError) {
    return NextResponse.json({ error: resultadoError.message }, { status: 500 })
  }

  // Calcular pontos para TODAS as apostas desta prova
  const { data: apostas, error: apostasError } = await supabase
    .from('apostas')
    .select('*')
    .eq('prova_id', prova_id)

  if (apostasError) {
    return NextResponse.json({ error: apostasError.message }, { status: 500 })
  }

  const resultadoCamisolas = {
    sprint: camisola_sprint,
    montanha: camisola_montanha,
    juventude: camisola_juventude,
  }

  let apostasCalculadas = 0

  for (const aposta of apostas) {
    const apostaCamisolas = {
      sprint: aposta.camisola_sprint,
      montanha: aposta.camisola_montanha,
      juventude: aposta.camisola_juventude,
    }

    const calculo = calcularPontos(
      aposta.apostas_top20,
      resultado_top20,
      apostaCamisolas,
      resultadoCamisolas
    )

    const { error: updateError } = await supabase
      .from('apostas')
      .update({
        pontos_total: calculo.pontos_total,
        pontos_top10: calculo.pontos_top10,
        pontos_top20: calculo.pontos_top20,
        pontos_camisolas: calculo.pontos_camisolas,
        acertos_exatos: calculo.acertos_exatos,
        acertos_exatos_top10: calculo.acertos_exatos_top10,
        acertos_exatos_top20: calculo.acertos_exatos_top20,
        acertos_camisolas: calculo.acertos_camisolas,
        calculada: true,
        updated_at: new Date().toISOString(),
      })
      .eq('id', aposta.id)

    if (!updateError) apostasCalculadas++
  }

  // Marcar prova como finalizada
  await supabase
    .from('provas')
    .update({ status: 'finalizada', updated_at: new Date().toISOString() })
    .eq('id', prova_id)

  // Enviar notificação a todos os subscritores
  try {
    const { data: prova } = await supabase
      .from('provas')
      .select('nome')
      .eq('id', prova_id)
      .single()

    await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/notify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-key': process.env.ADMIN_NOTIFY_KEY!,
      },
      body: JSON.stringify({
        title: '🏆 Resultado disponível!',
        body: `Os resultados de ${prova?.nome ?? 'uma prova'} já estão disponíveis.`,
        url: '/apostas',
      }),
    })
  } catch {
    // Não falhar o endpoint se a notificação falhar
  }

  return NextResponse.json({
    success: true,
    apostas_calculadas: apostasCalculadas,
    total_apostas: apostas.length,
  })
}
