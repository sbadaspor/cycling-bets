import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { calcularPontos } from '@/lib/pontuacao'
import type { CategoriaProvaTipo } from '@/types'

// ============================================================
// Helper: verificar se utilizador é admin
// ============================================================
async function checkAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false as const, status: 401, error: 'Não autenticado' }

  const { data: perfil } = await supabase
    .from('perfis')
    .select('is_admin')
    .eq('id', user.id)
    .single()

  if (!perfil?.is_admin) {
    return { ok: false as const, status: 403, error: 'Apenas admins.' }
  }
  return { ok: true as const, supabase, userId: user.id }
}

// ============================================================
// Helper: recalcular pontos de todas as apostas com base na
// etapa mais recente da prova
// ============================================================
async function recalcularPontosProva(
  supabase: Awaited<ReturnType<typeof createClient>>,
  provaId: string
) {
  const { data: ultimaEtapa } = await supabase
    .from('etapas_resultados')
    .select('*')
    .eq('prova_id', provaId)
    .order('numero_etapa', { ascending: false })
    .limit(1)
    .maybeSingle()

  // Buscar categoria da prova
  const { data: prova } = await supabase
    .from('provas')
    .select('categoria')
    .eq('id', provaId)
    .single()

  const categoria: CategoriaProvaTipo | undefined = prova?.categoria ?? undefined

  const { data: apostas, error: apErr } = await supabase
    .from('apostas')
    .select('*')
    .eq('prova_id', provaId)

  if (apErr) throw new Error(apErr.message)

  if (!ultimaEtapa) {
    for (const a of apostas ?? []) {
      await supabase
        .from('apostas')
        .update({
          pontos_total: 0,
          pontos_top10: 0,
          pontos_top20: 0,
          pontos_camisolas: 0,
          acertos_exatos: 0,
          acertos_exatos_top10: 0,
          acertos_exatos_top20: 0,
          acertos_camisolas: 0,
          calculada: false,
          updated_at: new Date().toISOString(),
        })
        .eq('id', a.id)
    }
    return { calculadas: 0, total: apostas?.length ?? 0 }
  }

  const resultadoCamisolas = {
    sprint: ultimaEtapa.camisola_sprint ?? '',
    montanha: ultimaEtapa.camisola_montanha ?? '',
    juventude: ultimaEtapa.camisola_juventude ?? '',
  }

  let calculadas = 0
  for (const aposta of apostas ?? []) {
    const apostaCamisolas = {
      sprint: aposta.camisola_sprint ?? '',
      montanha: aposta.camisola_montanha ?? '',
      juventude: aposta.camisola_juventude ?? '',
    }

    const calc = calcularPontos(
      aposta.apostas_top20,
      ultimaEtapa.classificacao_geral_top20,
      apostaCamisolas,
      resultadoCamisolas,
      categoria
    )

    const { error: upErr } = await supabase
      .from('apostas')
      .update({
        pontos_total: calc.pontos_total,
        pontos_top10: calc.pontos_top10,
        pontos_top20: calc.pontos_top20,
        pontos_camisolas: calc.pontos_camisolas,
        acertos_exatos: calc.acertos_exatos,
        acertos_exatos_top10: calc.acertos_exatos_top10,
        acertos_exatos_top20: calc.acertos_exatos_top20,
        acertos_camisolas: calc.acertos_camisolas,
        calculada: true,
        updated_at: new Date().toISOString(),
      })
      .eq('id', aposta.id)

    if (!upErr) calculadas++
  }

  return { calculadas, total: apostas?.length ?? 0, etapa: ultimaEtapa.numero_etapa }
}

// ============================================================
// Helper: sincronizar etapa final com a tabela resultados_reais
// ============================================================
async function sincronizarResultadoFinal(
  supabase: Awaited<ReturnType<typeof createClient>>,
  provaId: string,
  userId: string
) {
  const { data: etapaFinal } = await supabase
    .from('etapas_resultados')
    .select('*')
    .eq('prova_id', provaId)
    .eq('is_final', true)
    .maybeSingle()

  if (!etapaFinal) {
    await supabase
      .from('provas')
      .update({ status: 'aberta', updated_at: new Date().toISOString() })
      .eq('id', provaId)
    return
  }

  await supabase.from('resultados_reais').upsert(
    {
      prova_id: provaId,
      resultado_top20: etapaFinal.classificacao_geral_top20,
      camisola_sprint: etapaFinal.camisola_sprint || null,
      camisola_montanha: etapaFinal.camisola_montanha || null,
      camisola_juventude: etapaFinal.camisola_juventude || null,
      inserido_por: userId,
    },
    { onConflict: 'prova_id' }
  )

  await supabase
    .from('provas')
    .update({ status: 'finalizada', updated_at: new Date().toISOString() })
    .eq('id', provaId)
}

// ============================================================
// GET /api/etapas?prova_id=xxx
// ============================================================
export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const provaId = req.nextUrl.searchParams.get('prova_id')

  if (!provaId) {
    return NextResponse.json({ error: 'prova_id é obrigatório' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('etapas_resultados')
    .select('*')
    .eq('prova_id', provaId)
    .order('numero_etapa', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ etapas: data })
}

// ============================================================
// POST /api/etapas
// Body: { prova_id, numero_etapa, data_etapa, classificacao_geral_top20[],
//         posicoes_adicionais?: [{posicao, nome}],
//         camisola_sprint?, camisola_montanha?, camisola_juventude?, is_final }
// ============================================================
export async function POST(req: NextRequest) {
  const auth = await checkAdmin()
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })
  const { supabase, userId } = auth

  const body = await req.json()
  const {
    prova_id,
    numero_etapa,
    data_etapa,
    classificacao_geral_top20,
    posicoes_adicionais,
    camisola_sprint,
    camisola_montanha,
    camisola_juventude,
    is_final,
  } = body

  if (!prova_id || !numero_etapa || !data_etapa) {
    return NextResponse.json({ error: 'prova_id, numero_etapa e data_etapa são obrigatórios.' }, { status: 400 })
  }
  if (!Array.isArray(classificacao_geral_top20) || classificacao_geral_top20.length !== 20) {
    return NextResponse.json({ error: 'classificacao_geral_top20 tem de ter exatamente 20 posições (preenche só as usadas pela categoria).' }, { status: 400 })
  }

  // Buscar categoria para saber quantas posições validar
  const { data: prova } = await supabase
    .from('provas')
    .select('categoria')
    .eq('id', prova_id)
    .single()

  const categoria: CategoriaProvaTipo | undefined = prova?.categoria ?? undefined
  const numPos = categoria === 'monumento' || categoria === 'prova_dia' ? 10 : 20

  // Validar as primeiras numPos posições como obrigatórias; o resto pode ficar vazio
  for (let i = 0; i < numPos; i++) {
    if (!classificacao_geral_top20[i] || !classificacao_geral_top20[i].trim()) {
      return NextResponse.json({ error: `Posição ${i + 1} está vazia.` }, { status: 400 })
    }
  }

  // Validar posições adicionais (só fazem sentido para top-20)
  let posicoesAdicionaisLimpas: { posicao: number; nome: string }[] = []
  if (Array.isArray(posicoes_adicionais)) {
    const posVistas = new Set<number>()
    const nomesVistos = new Set<string>()
    const nomesTop20 = new Set(
      classificacao_geral_top20
        .slice(0, numPos)
        .map((n: string) => n.trim())
    )

    for (const item of posicoes_adicionais) {
      if (!item || typeof item.posicao !== 'number' || typeof item.nome !== 'string') continue
      const nome = item.nome.trim()
      if (!nome) continue
      if (item.posicao <= numPos) {
        return NextResponse.json({ error: `Posições adicionais têm de ser maiores que ${numPos}.` }, { status: 400 })
      }
      if (posVistas.has(item.posicao)) {
        return NextResponse.json({ error: `Posição ${item.posicao} aparece mais que uma vez nas posições adicionais.` }, { status: 400 })
      }
      if (nomesVistos.has(nome) || nomesTop20.has(nome)) {
        return NextResponse.json({ error: `Ciclista "${nome}" aparece mais que uma vez na classificação.` }, { status: 400 })
      }
      posVistas.add(item.posicao)
      nomesVistos.add(nome)
      posicoesAdicionaisLimpas.push({ posicao: item.posicao, nome })
    }
    posicoesAdicionaisLimpas.sort((a, b) => a.posicao - b.posicao)
  }

  if (is_final) {
    await supabase
      .from('etapas_resultados')
      .update({ is_final: false })
      .eq('prova_id', prova_id)
      .neq('numero_etapa', numero_etapa)
  }

  const { error: upErr } = await supabase
    .from('etapas_resultados')
    .upsert(
      {
        prova_id,
        numero_etapa,
        data_etapa,
        classificacao_geral_top20,
        posicoes_adicionais: posicoesAdicionaisLimpas,
        camisola_sprint: camisola_sprint || null,
        camisola_montanha: camisola_montanha || null,
        camisola_juventude: camisola_juventude || null,
        is_final: !!is_final,
        inserido_por: userId,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'prova_id,numero_etapa' }
    )

  if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 })

  let recalc
  try {
    recalc = await recalcularPontosProva(supabase, prova_id)
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erro a recalcular pontos'
    return NextResponse.json({ error: msg }, { status: 500 })
  }

  await sincronizarResultadoFinal(supabase, prova_id, userId)

  return NextResponse.json({
    success: true,
    apostas_calculadas: recalc.calculadas,
    total_apostas: recalc.total,
    is_final: !!is_final,
  })
}

// ============================================================
// DELETE /api/etapas?prova_id=xxx&numero_etapa=N
// ============================================================
export async function DELETE(req: NextRequest) {
  const auth = await checkAdmin()
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })
  const { supabase, userId } = auth

  const provaId = req.nextUrl.searchParams.get('prova_id')
  const numeroEtapaStr = req.nextUrl.searchParams.get('numero_etapa')

  if (!provaId || !numeroEtapaStr) {
    return NextResponse.json({ error: 'prova_id e numero_etapa são obrigatórios.' }, { status: 400 })
  }
  const numeroEtapa = parseInt(numeroEtapaStr, 10)

  const { data: ultima } = await supabase
    .from('etapas_resultados')
    .select('numero_etapa')
    .eq('prova_id', provaId)
    .order('numero_etapa', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!ultima || ultima.numero_etapa !== numeroEtapa) {
    return NextResponse.json(
      { error: 'Só é possível apagar a última etapa inserida.' },
      { status: 400 }
    )
  }

  const { error: delErr } = await supabase
    .from('etapas_resultados')
    .delete()
    .eq('prova_id', provaId)
    .eq('numero_etapa', numeroEtapa)

  if (delErr) return NextResponse.json({ error: delErr.message }, { status: 500 })

  await sincronizarResultadoFinal(supabase, provaId, userId)
  const recalc = await recalcularPontosProva(supabase, provaId)

  return NextResponse.json({
    success: true,
    apostas_recalculadas: recalc.calculadas,
  })
}
