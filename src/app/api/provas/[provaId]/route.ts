import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

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
  return { ok: true as const, supabase }
}

interface Params {
  params: Promise<{ provaId: string }>
}

// ============================================================
// PATCH /api/provas/[provaId]  -> editar uma prova
// Body: { nome?, data_inicio?, data_fim?, descricao? }
// ============================================================
export async function PATCH(req: NextRequest, { params }: Params) {
  const auth = await checkAdmin()
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })
  const { supabase } = auth

  const { provaId } = await params
  const body = await req.json()

  const update: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  }
  if (typeof body.nome === 'string') update.nome = body.nome.trim()
  if (typeof body.data_inicio === 'string') update.data_inicio = body.data_inicio
  if (typeof body.data_fim === 'string') update.data_fim = body.data_fim
  if (typeof body.descricao === 'string') update.descricao = body.descricao

  // Validar datas se ambas forem enviadas
  if (update.data_inicio && update.data_fim) {
    if (new Date(update.data_inicio as string) > new Date(update.data_fim as string)) {
      return NextResponse.json({ error: 'Data de início não pode ser posterior à data de fim.' }, { status: 400 })
    }
  }

  const { error } = await supabase
    .from('provas')
    .update(update)
    .eq('id', provaId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}

// ============================================================
// DELETE /api/provas/[provaId]  -> apagar uma prova
// Body: { confirmacao_nome: string }  (tem de bater com o nome da prova)
// Apaga em cascata: ciclistas, etapas_resultados, apostas, resultados_reais.
// ============================================================
export async function DELETE(req: NextRequest, { params }: Params) {
  const auth = await checkAdmin()
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })
  const { supabase } = auth

  const { provaId } = await params

  let confirmacaoNome = ''
  try {
    const body = await req.json()
    confirmacaoNome = (body?.confirmacao_nome ?? '').trim()
  } catch {
    // body opcional — se não vier, falha na verificação abaixo
  }

  const { data: prova, error: errGet } = await supabase
    .from('provas')
    .select('nome')
    .eq('id', provaId)
    .maybeSingle()

  if (errGet) return NextResponse.json({ error: errGet.message }, { status: 500 })
  if (!prova) return NextResponse.json({ error: 'Prova não encontrada.' }, { status: 404 })

  if (confirmacaoNome !== prova.nome) {
    return NextResponse.json(
      { error: `Confirmação inválida. Para apagar, escreve exatamente "${prova.nome}".` },
      { status: 400 }
    )
  }

  // Apagar a prova; o ON DELETE CASCADE no schema trata das tabelas dependentes
  const { error: errDel } = await supabase
    .from('provas')
    .delete()
    .eq('id', provaId)

  if (errDel) return NextResponse.json({ error: errDel.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
