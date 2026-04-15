import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { CiclistaParsed } from '@/types'

// GET /api/ciclistas?prova_id=xxx  -> lista ciclistas de uma prova
export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const provaId = req.nextUrl.searchParams.get('prova_id')

  if (!provaId) {
    return NextResponse.json({ error: 'prova_id é obrigatório' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('ciclistas')
    .select('*')
    .eq('prova_id', provaId)
    .order('dorsal', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ciclistas: data })
}

// POST /api/ciclistas -> substitui startlist de uma prova
// Body: { prova_id: string, ciclistas: CiclistaParsed[] }
export async function POST(req: NextRequest) {
  const supabase = await createClient()

  // Verificar utilizador autenticado e admin
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }

  const { data: perfil } = await supabase
    .from('perfis')
    .select('is_admin')
    .eq('id', user.id)
    .single()

  if (!perfil?.is_admin) {
    return NextResponse.json({ error: 'Apenas admins podem gerir startlists' }, { status: 403 })
  }

  const body = await req.json()
  const provaId: string = body.prova_id
  const ciclistas: CiclistaParsed[] = body.ciclistas

  if (!provaId || !Array.isArray(ciclistas) || ciclistas.length === 0) {
    return NextResponse.json({ error: 'prova_id e ciclistas são obrigatórios' }, { status: 400 })
  }

  // 1. Apagar startlist antiga
  const { error: errDel } = await supabase
    .from('ciclistas')
    .delete()
    .eq('prova_id', provaId)

  if (errDel) return NextResponse.json({ error: errDel.message }, { status: 500 })

  // 2. Inserir nova
  const rows = ciclistas.map((c) => ({
    prova_id: provaId,
    nome: c.nome,
    equipa: c.equipa,
    dorsal: c.dorsal ?? null,
  }))

  const { error: errIns } = await supabase.from('ciclistas').insert(rows)
  if (errIns) return NextResponse.json({ error: errIns.message }, { status: 500 })

  return NextResponse.json({ success: true, count: rows.length })
}

// DELETE /api/ciclistas?prova_id=xxx -> apaga toda a startlist
export async function DELETE(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const { data: perfil } = await supabase
    .from('perfis')
    .select('is_admin')
    .eq('id', user.id)
    .single()
  if (!perfil?.is_admin) return NextResponse.json({ error: 'Apenas admins' }, { status: 403 })

  const provaId = req.nextUrl.searchParams.get('prova_id')
  if (!provaId) return NextResponse.json({ error: 'prova_id é obrigatório' }, { status: 400 })

  const { error } = await supabase.from('ciclistas').delete().eq('prova_id', provaId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
