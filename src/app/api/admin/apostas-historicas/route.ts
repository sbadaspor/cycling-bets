import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// ── Pontuação histórica (sistema antigo: 1pt por acerto top-10) ─────────────
function calcularPontosAntigo(
  apostas: string[],
  realTop: string[],
  camisolasApostadas: { sprint?: string; montanha?: string; juventude?: string },
  camisolasReais: { sprint?: string; montanha?: string; juventude?: string },
): number {
  const realSet = new Set(realTop.map(n => n.trim().toLowerCase()).filter(Boolean))
  let pts = apostas.filter(n => n.trim() && realSet.has(n.trim().toLowerCase())).length

  // Camisolas: 1pt cada acerto
  if (camisolasApostadas.sprint && camisolasReais.sprint &&
      camisolasApostadas.sprint.trim().toLowerCase() === camisolasReais.sprint.trim().toLowerCase()) pts++
  if (camisolasApostadas.montanha && camisolasReais.montanha &&
      camisolasApostadas.montanha.trim().toLowerCase() === camisolasReais.montanha.trim().toLowerCase()) pts++
  if (camisolasApostadas.juventude && camisolasReais.juventude &&
      camisolasApostadas.juventude.trim().toLowerCase() === camisolasReais.juventude.trim().toLowerCase()) pts++

  return pts
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const { data: perfil } = await supabase.from('perfis').select('is_admin').eq('id', user.id).single()
  if (!perfil?.is_admin) return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })

  const body = await req.json()
  const {
    user_id, ano, nome_prova, categoria, posicao_grupo,
    apostas_top, resultado_real_top, sistema,
    camisola_sprint_apostada, camisola_sprint_real,
    camisola_montanha_apostada, camisola_montanha_real,
    camisola_juventude_apostada, camisola_juventude_real,
  } = body

  if (!user_id || !ano || !nome_prova || !categoria) {
    return NextResponse.json({ error: 'Campos obrigatórios em falta.' }, { status: 400 })
  }

  // Calcular pontos automaticamente
  let pontos_total = 0
  if (sistema === 'antigo') {
    pontos_total = calcularPontosAntigo(
      apostas_top ?? [],
      resultado_real_top ?? [],
      { sprint: camisola_sprint_apostada, montanha: camisola_montanha_apostada, juventude: camisola_juventude_apostada },
      { sprint: camisola_sprint_real, montanha: camisola_montanha_real, juventude: camisola_juventude_real },
    )
  }

  // Apagar entrada existente (se houver) e reinserir
  await supabase
    .from('apostas_historicas')
    .delete()
    .eq('user_id', user_id)
    .eq('ano', ano)
    .eq('nome_prova', nome_prova)

  const { data, error } = await supabase
    .from('apostas_historicas')
    .insert({
      user_id, ano, nome_prova, categoria, posicao_grupo: posicao_grupo ?? null,
      pontos_total, apostas_top: apostas_top ?? [],
      resultado_real_top: resultado_real_top ?? [],
      sistema: sistema ?? 'antigo',
      camisola_sprint_apostada: camisola_sprint_apostada || null,
      camisola_sprint_real: camisola_sprint_real || null,
      camisola_montanha_apostada: camisola_montanha_apostada || null,
      camisola_montanha_real: camisola_montanha_real || null,
      camisola_juventude_apostada: camisola_juventude_apostada || null,
      camisola_juventude_real: camisola_juventude_real || null,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true, data, pontos_calculados: pontos_total })
}

export async function DELETE(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const { data: perfil } = await supabase.from('perfis').select('is_admin').eq('id', user.id).single()
  if (!perfil?.is_admin) return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })

  const { id } = await req.json()
  if (!id) return NextResponse.json({ error: 'id em falta' }, { status: 400 })

  const { error } = await supabase.from('apostas_historicas').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { searchParams } = new URL(req.url)
  const userId = searchParams.get('user_id')

  let query = supabase
    .from('apostas_historicas')
    .select('*, perfil:perfis(id, username, avatar_url)')
    .order('ano', { ascending: false })
    .order('nome_prova', { ascending: true })

  if (userId) query = query.eq('user_id', userId)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
