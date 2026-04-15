import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const CATEGORIAS_VALIDAS = ['grande_volta', 'prova_semana', 'monumento', 'prova_dia']

export async function POST(req: NextRequest) {
  const supabase = await createClient()
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
    return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 })
  }
  const body = await req.json()
  const { nome, data_inicio, data_fim, descricao, status, categoria } = body

  if (!nome || !data_inicio || !data_fim) {
    return NextResponse.json({ error: 'Nome e datas são obrigatórios.' }, { status: 400 })
  }
  if (categoria && !CATEGORIAS_VALIDAS.includes(categoria)) {
    return NextResponse.json({ error: 'Categoria inválida.' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('provas')
    .insert({
      nome,
      data_inicio,
      data_fim,
      descricao,
      categoria: categoria || null,
      status: status || 'aberta',
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true, prova: data })
}

export async function PATCH(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  const { data: perfil } = await supabase
    .from('perfis')
    .select('is_admin')
    .eq('id', user.id)
    .single()
  if (!perfil?.is_admin) return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 })

  const body = await req.json()
  const { id, ...updates } = body
  if (!id) return NextResponse.json({ error: 'ID obrigatório.' }, { status: 400 })

  if (updates.categoria && !CATEGORIAS_VALIDAS.includes(updates.categoria)) {
    return NextResponse.json({ error: 'Categoria inválida.' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('provas')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true, prova: data })
}
