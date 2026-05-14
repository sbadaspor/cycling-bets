import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendEmailEtapa } from '@/lib/sendEmailEtapa'

export async function POST(req: NextRequest) {
  const supabase = await createClient()

  // Verificar admin
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const { data: perfil } = await supabase
    .from('perfis')
    .select('is_admin')
    .eq('id', user.id)
    .single()

  if (!perfil?.is_admin) return NextResponse.json({ error: 'Apenas admins.' }, { status: 403 })

  const { prova_id, numero_etapa } = await req.json()
  if (!prova_id || !numero_etapa) {
    return NextResponse.json({ error: 'prova_id e numero_etapa são obrigatórios.' }, { status: 400 })
  }

  // Buscar prova
  const { data: prova } = await supabase
    .from('provas')
    .select('nome, categoria')
    .eq('id', prova_id)
    .single()

  if (!prova) return NextResponse.json({ error: 'Prova não encontrada.' }, { status: 404 })

  // Buscar etapa
  const { data: etapa } = await supabase
    .from('etapas_resultados')
    .select('*')
    .eq('prova_id', prova_id)
    .eq('numero_etapa', numero_etapa)
    .single()

  if (!etapa) return NextResponse.json({ error: 'Etapa não encontrada.' }, { status: 404 })

  // Buscar apostas com perfis
  const { data: apostas } = await supabase
    .from('apostas')
    .select('*, perfil:perfis(username, full_name, email)')
    .eq('prova_id', prova_id)

  if (!apostas || apostas.length === 0) {
    return NextResponse.json({ error: 'Sem apostas para esta prova.' }, { status: 404 })
  }

  await sendEmailEtapa(
    { nome: prova.nome, categoria: prova.categoria },
    etapa,
    apostas,
    prova_id
  )

  return NextResponse.json({ success: true, message: `Email enviado para etapa ${numero_etapa}.` })
}
