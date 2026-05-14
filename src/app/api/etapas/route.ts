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
// última etapa inserida. Usa upsert em batch — sem loop de
// roundtrips individuais.
// ============================================================
async function recalcularPontosProva(
  supabase: Awaited<ReturnType<typeof createClient>>,
  provaId: string
) {
  const [{ data: ultimaEtapa }, { data: prova }] = await Promise.all([
    supabase
      .from('etapas_resultados')
      .select('*')
      .eq('prova_id', provaId)
      .order('numero_etapa', { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from('provas')
      .select('categoria')
      .eq('id', provaId)
      .single(),
  ])

  const categoria: CategoriaProvaTipo | undefined = prova?.categoria ?? undefined

  const { data: apostas, error: apErr } = await supabase
    .from('apostas')
    .select('*')
    .eq('prova_id', provaId)

  if (apErr) throw new Error(apErr.message)

  if (!ultimaEtapa) {
    const updates = (apostas ?? []).map(a => ({
      id: a.id,
      prova_id: a.prova_id,
      user_id: a.user_id,
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
    }))
    if (updates.length > 0) {
      await supabase.from('apostas').upsert(updates)
    }
    return { calculadas: 0, total: apostas?.length ?? 0 }
  }

  const resultadoCamisolas = {
    sprint: ultimaEtapa.camisola_sprint ?? '',
    montanha: ultimaEtapa.camisola_montanha ?? '',
    juventude: ultimaEtapa.camisola_juventude ?? '',
  }

  const updates = (apostas ?? []).map(aposta => {
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

    return {
      id: aposta.id,
      prova_id: aposta.prova_id,
      user_id: aposta.user_id,
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
    }
  })

  if (updates.length > 0) {
    const { error: upsertErr } = await supabase.from('apostas').upsert(updates)
    if (upsertErr) throw new Error(upsertErr.message)
  }

  return { calculadas: updates.length, total: updates.length, etapa: ultimaEtapa.numero_etapa }
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
    tempos_classificacao,
    camisola_sprint,
    camisola_montanha,
    camisola_juventude,
    perfil_url,
    is_final,
  } = body

  if (!prova_id || !numero_etapa || !data_etapa) {
    return NextResponse.json({ error: 'prova_id, numero_etapa e data_etapa são obrigatórios.' }, { status: 400 })
  }
  if (!Array.isArray(classificacao_geral_top20) || classificacao_geral_top20.length !== 20) {
    return NextResponse.json({ error: 'classificacao_geral_top20 tem de ter exatamente 20 posições.' }, { status: 400 })
  }

  const { data: prova } = await supabase
    .from('provas')
    .select('categoria, nome')
    .eq('id', prova_id)
    .single()

  const categoria: CategoriaProvaTipo | undefined = prova?.categoria ?? undefined
  const nomeProva = prova?.nome ?? 'uma prova'
  const numPos = categoria === 'monumento' || categoria === 'prova_dia' ? 10 : 20

  for (let i = 0; i < numPos; i++) {
    if (!classificacao_geral_top20[i] || !classificacao_geral_top20[i].trim()) {
      return NextResponse.json({ error: `Posição ${i + 1} está vazia.` }, { status: 400 })
    }
  }

  let posicoesAdicionaisLimpas: { posicao: number; nome: string }[] = []
  if (Array.isArray(posicoes_adicionais)) {
    const posVistas = new Set<number>()
    const nomesVistos = new Set<string>()
    const nomesTop20 = new Set(
      classificacao_geral_top20.slice(0, numPos).map((n: string) => n.trim())
    )

    for (const item of posicoes_adicionais) {
      if (!item || typeof item.posicao !== 'number' || typeof item.nome !== 'string') continue
      const nome = item.nome.trim()
      if (!nome) continue
      if (item.posicao <= numPos) {
        return NextResponse.json({ error: `Posições adicionais têm de ser maiores que ${numPos}.` }, { status: 400 })
      }
      if (posVistas.has(item.posicao)) {
        return NextResponse.json({ error: `Posição ${item.posicao} aparece mais que uma vez.` }, { status: 400 })
      }
      if (nomesVistos.has(nome) || nomesTop20.has(nome)) {
        return NextResponse.json({ error: `Ciclista "${nome}" aparece mais que uma vez.` }, { status: 400 })
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
        tempos_classificacao: tempos_classificacao ?? {},
        camisola_sprint: camisola_sprint || null,
        camisola_montanha: camisola_montanha || null,
        camisola_juventude: camisola_juventude || null,
        perfil_url: perfil_url || null,
        is_final: !!is_final,
        inserido_por: userId,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'prova_id,numero_etapa' }
    )

  if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 })

  // Recalcular pontos
  let recalc
  try {
    recalc = await recalcularPontosProva(supabase, prova_id)
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erro a recalcular pontos'
    return NextResponse.json({ error: msg }, { status: 500 })
  }

  // Actualizar status da prova
  const novoStatus = is_final ? 'finalizada' : 'fechada'
  await supabase
    .from('provas')
    .update({ status: novoStatus, updated_at: new Date().toISOString() })
    .eq('id', prova_id)

  // ============================================================
  // Email com resumo da etapa (best-effort)
  // ============================================================
  try {
    const { sendEmailEtapa } = await import('@/lib/sendEmailEtapa')

    // Buscar apostas com perfis (incluindo email)
    const { data: apostasComPerfil } = await supabase
      .from('apostas')
      .select('*, perfil:perfis(username, full_name, email)')
      .eq('prova_id', prova_id)

    const etapaInserida = {
      numero_etapa,
      data_etapa,
      classificacao_geral_top20,
      tempos_classificacao: tempos_classificacao ?? {},
      camisola_sprint:    camisola_sprint || undefined,
      camisola_montanha:  camisola_montanha || undefined,
      camisola_juventude: camisola_juventude || undefined,
      is_final: !!is_final,
    }

    if (apostasComPerfil && apostasComPerfil.length > 0) {
      await sendEmailEtapa(
        { nome: nomeProva, categoria },
        etapaInserida,
        apostasComPerfil,
        prova_id
      )
    }
  } catch (e) {
    console.error('[email etapa]', e)
    // best-effort — nunca bloqueia a resposta
  }

  // ============================================================
  // Notificações push personalizadas por jogador (best-effort)
  // Cada jogador recebe a sua posição e pontos actuais.
  // ============================================================
  try {
    const { sendNotificationsToAll } = await import('@/lib/sendNotifications')
    const isGrandeVolta = categoria === 'grande_volta' || categoria === 'prova_semana'
    const medals = ['🥇', '🥈', '🥉']

    // Buscar classificação actualizada ordenada por pontos
    const { data: apostasOrdenadas } = await supabase
      .from('apostas')
      .select('user_id, pontos_total')
      .eq('prova_id', prova_id)
      .order('pontos_total', { ascending: false })

    if (apostasOrdenadas && apostasOrdenadas.length > 0) {
      if (is_final) {
        // Notificação de fim de prova personalizada com posição final
        for (let i = 0; i < apostasOrdenadas.length; i++) {
          const aposta = apostasOrdenadas[i]
          const medalEmoji = medals[i] ?? `${i + 1}º`
          await sendNotificationsToAll(
            `🏁 ${nomeProva} terminou!`,
            `Ficaste ${medalEmoji} com ${aposta.pontos_total} pontos. Vê a classificação final.`,
            `/provas/${prova_id}`,
            undefined,
            [aposta.user_id]
          ).catch(() => {})
        }
      } else if (isGrandeVolta) {
        // Notificação de nova etapa personalizada com posição actual
        for (let i = 0; i < apostasOrdenadas.length; i++) {
          const aposta = apostasOrdenadas[i]
          const medalEmoji = medals[i] ?? `${i + 1}º lugar`
          await sendNotificationsToAll(
            `⚡ ${nomeProva} — Etapa ${numero_etapa}`,
            `Estás ${medalEmoji} com ${aposta.pontos_total} pts. Toca a ver!`,
            `/provas/${prova_id}`,
            undefined,
            [aposta.user_id]
          ).catch(() => {})
        }
      }
    } else {
      // Fallback genérico se não houver apostas ainda
      if (is_final) {
        await sendNotificationsToAll(
          '🏁 Classificação final disponível!',
          `${nomeProva} terminou. Vê a classificação final.`,
          `/provas/${prova_id}`,
        )
      } else if (isGrandeVolta) {
        await sendNotificationsToAll(
          `⚡ Etapa ${numero_etapa} concluída`,
          `Os pontos de ${nomeProva} foram atualizados. Vê como estás!`,
          `/provas/${prova_id}`,
        )
      }
    }
  } catch {
    // Notificações são best-effort — nunca bloqueiam a resposta
  }

  return NextResponse.json({
    success: true,
    apostas_calculadas: recalc.calculadas,
    total_apostas: recalc.total,
    etapa: numero_etapa,
    is_final: !!is_final,
  })
}

// ============================================================
// DELETE /api/etapas?prova_id=xxx&numero_etapa=N
// ============================================================
export async function DELETE(req: NextRequest) {
  const auth = await checkAdmin()
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })
  const { supabase } = auth

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

  const recalc = await recalcularPontosProva(supabase, provaId)

  // Repor status da prova conforme o estado das etapas restantes
  const { data: novaUltima } = await supabase
    .from('etapas_resultados')
    .select('is_final')
    .eq('prova_id', provaId)
    .order('numero_etapa', { ascending: false })
    .limit(1)
    .maybeSingle()

  let novoStatus: string
  if (!novaUltima) {
    novoStatus = 'aberta'
  } else if (novaUltima.is_final) {
    novoStatus = 'finalizada'
  } else {
    novoStatus = 'fechada'
  }

  await supabase
    .from('provas')
    .update({ status: novoStatus, updated_at: new Date().toISOString() })
    .eq('id', provaId)

  return NextResponse.json({
    success: true,
    apostas_recalculadas: recalc.calculadas,
  })
}
