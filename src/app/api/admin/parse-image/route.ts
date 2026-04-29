import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const { data: perfil } = await supabase
    .from('perfis').select('is_admin').eq('id', user.id).single()

  if (!perfil?.is_admin)
    return NextResponse.json({ error: 'Acesso negado. Apenas admins.' }, { status: 403 })

  const formData = await req.formData()
  const image = formData.get('image') as File | null
  const provaId = formData.get('prova_id') as string | null
  const temCamisolas = formData.get('tem_camisolas') === 'true'
  const numPosicoes = parseInt(formData.get('num_posicoes') as string || '20')

  if (!image) return NextResponse.json({ error: 'Imagem não fornecida.' }, { status: 400 })
  if (!provaId) return NextResponse.json({ error: 'prova_id não fornecido.' }, { status: 400 })

  const { data: ciclistas } = await supabase
    .from('ciclistas').select('nome').eq('prova_id', provaId).order('nome')

  const startlistNomes = ciclistas?.map(c => c.nome) ?? []

  const buffer = await image.arrayBuffer()
  const base64 = Buffer.from(buffer).toString('base64')
  const mediaType = (image.type || 'image/jpeg') as 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif'

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey)
    return NextResponse.json({ error: 'ANTHROPIC_API_KEY não configurada.' }, { status: 500 })

  const prompt = `Esta imagem contém a classificação de uma prova de ciclismo. Extrai TODOS os ciclistas visíveis em ordem de classificação.

Para cada ciclista, extrai:
1. Posição (número)
2. Nome completo
3. Tempo de diferença para o líder (ex: "0:00" para o 1º, "0:06", "4:02", "s.t." se mesmo tempo)

A startlist desta prova tem estes ciclistas (usa EXATAMENTE estes nomes quando houver correspondência):
${startlistNomes.join('\n')}

Devolve APENAS este JSON (sem markdown, sem texto adicional):
{
  "cyclists": [
    {"posicao": 1, "nome": "Nome Exato", "tempo": "0:00"},
    {"posicao": 2, "nome": "Nome Exato", "tempo": "0:06"}
  ],
  "camisola_sprint": ${temCamisolas ? '"nome ou null"' : 'null'},
  "camisola_montanha": ${temCamisolas ? '"nome ou null"' : 'null'},
  "camisola_juventude": ${temCamisolas ? '"nome ou null"' : 'null'}
}

Regras:
- Extrai TODOS os ciclistas visíveis, não só os primeiros.
- Para cada nome, usa o nome EXATO da startlist quando houver correspondência.
- O tempo do 1º é sempre "0:00". "s.t." = mesmo tempo que o anterior.
- Devolve SOMENTE o JSON.`

  let claudeResponse
  try {
    claudeResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 8000,
        messages: [{
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: mediaType, data: base64 } },
            { type: 'text', text: prompt },
          ],
        }],
      }),
    })
  } catch {
    return NextResponse.json({ error: 'Erro ao contactar a API. Verifica a ligação.' }, { status: 502 })
  }

  if (!claudeResponse.ok) {
    const errBody = await claudeResponse.text()
    return NextResponse.json({ error: `Erro da API: ${claudeResponse.status} — ${errBody.slice(0, 200)}` }, { status: 502 })
  }

  const claudeData = await claudeResponse.json()
  const rawText: string = claudeData.content?.[0]?.text ?? ''
  const cleanText = rawText.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim()

  let parsed: {
    cyclists: Array<{ posicao: number; nome: string; tempo: string }>
    camisola_sprint: string | null
    camisola_montanha: string | null
    camisola_juventude: string | null
  }

  try {
    parsed = JSON.parse(cleanText)
  } catch {
    return NextResponse.json({
      error: 'Não foi possível interpretar a resposta da IA. Tenta com uma imagem mais nítida.',
      raw: rawText.slice(0, 500),
    }, { status: 422 })
  }

  if (!Array.isArray(parsed.cyclists))
    return NextResponse.json({ error: 'Resposta inesperada da IA.' }, { status: 422 })

  const startlistSet = new Set(startlistNomes)
  const cyclistsAnnotated = parsed.cyclists.map(c => ({
    posicao: c.posicao,
    nome: c.nome,
    tempo: c.tempo ?? '',
    matched: startlistSet.has(c.nome),
  }))

  return NextResponse.json({
    cyclists: cyclistsAnnotated,
    top: cyclistsAnnotated.slice(0, numPosicoes),
    camisola_sprint: parsed.camisola_sprint ?? null,
    camisola_montanha: parsed.camisola_montanha ?? null,
    camisola_juventude: parsed.camisola_juventude ?? null,
    total_matched: cyclistsAnnotated.filter(c => c.matched).length,
    total: cyclistsAnnotated.length,
    startlist_size: startlistNomes.length,
  })
}
