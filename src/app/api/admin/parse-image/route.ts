import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const supabase = await createClient()

  // Auth: apenas admins
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const { data: perfil } = await supabase
    .from('perfis')
    .select('is_admin')
    .eq('id', user.id)
    .single()

  if (!perfil?.is_admin) {
    return NextResponse.json({ error: 'Acesso negado. Apenas admins.' }, { status: 403 })
  }

  const formData = await req.formData()
  const image = formData.get('image') as File | null
  const provaId = formData.get('prova_id') as string | null
  const temCamisolas = formData.get('tem_camisolas') === 'true'
  const numPosicoes = parseInt(formData.get('num_posicoes') as string || '20')

  if (!image) {
    return NextResponse.json({ error: 'Imagem não fornecida.' }, { status: 400 })
  }
  if (!provaId) {
    return NextResponse.json({ error: 'prova_id não fornecido.' }, { status: 400 })
  }

  // Obter startlist para cruzamento de nomes
  const { data: ciclistas } = await supabase
    .from('ciclistas')
    .select('nome, equipa')
    .eq('prova_id', provaId)
    .order('nome')

  const startlistNomes = ciclistas?.map(c => c.nome) ?? []

  // Converter imagem para base64
  const buffer = await image.arrayBuffer()
  const base64 = Buffer.from(buffer).toString('base64')
  const mediaType = (image.type || 'image/jpeg') as
    | 'image/jpeg'
    | 'image/png'
    | 'image/webp'
    | 'image/gif'

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return NextResponse.json(
      { error: 'ANTHROPIC_API_KEY não configurada no servidor.' },
      { status: 500 }
    )
  }

  const camisolasInstrucao = temCamisolas
    ? `
- "camisola_sprint": nome do portador da camisola de pontos/sprint (ou null se não visível)
- "camisola_montanha": nome do portador da camisola da montanha (ou null se não visível)
- "camisola_juventude": nome do portador da camisola do melhor jovem (ou null se não visível)`
    : `
- "camisola_sprint": null
- "camisola_montanha": null
- "camisola_juventude": null`

  const prompt = `Esta imagem contém os resultados de uma prova de ciclismo. Extrai os ${numPosicoes} primeiros ciclistas na ordem exata da classificação.

A startlist desta prova tem os seguintes ciclistas (usa EXATAMENTE estes nomes na resposta):
${startlistNomes.join('\n')}

Devolve APENAS um objeto JSON com este formato exato (sem markdown, sem texto adicional):
{
  "riders": ["Nome Exato 1", "Nome Exato 2", ..., "Nome Exato ${numPosicoes}"],${camisolasInstrucao}
}

Regras importantes:
1. Para cada nome visível na imagem, encontra o nome mais parecido na startlist acima e usa ESSE nome exato.
2. Se o apelido bater certo mas o nome próprio difere ligeiramente (acentos, abreviações), usa o nome da startlist.
3. Se não conseguires identificar um ciclista na startlist, usa o nome como aparece na imagem.
4. Inclui todos os visíveis até ao máximo de ${numPosicoes}.
5. Devolve SOMENTE o JSON, sem mais nada.`

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
        model: 'claude-opus-4-5',
        max_tokens: 2000,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image',
                source: {
                  type: 'base64',
                  media_type: mediaType,
                  data: base64,
                },
              },
              {
                type: 'text',
                text: prompt,
              },
            ],
          },
        ],
      }),
    })
  } catch (e) {
    return NextResponse.json(
      { error: 'Erro ao contactar a API de visão. Verifica a ligação.' },
      { status: 502 }
    )
  }

  if (!claudeResponse.ok) {
    const errBody = await claudeResponse.text()
    return NextResponse.json(
      { error: `Erro da API Claude: ${claudeResponse.status} — ${errBody.slice(0, 200)}` },
      { status: 502 }
    )
  }

  const claudeData = await claudeResponse.json()
  const rawText: string = claudeData.content?.[0]?.text ?? ''

  // Limpar possíveis fences de markdown
  const cleanText = rawText.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim()

  let parsed: {
    riders: string[]
    camisola_sprint: string | null
    camisola_montanha: string | null
    camisola_juventude: string | null
  }

  try {
    parsed = JSON.parse(cleanText)
  } catch {
    return NextResponse.json(
      {
        error: 'Não foi possível interpretar a resposta da IA. Tenta com uma imagem mais nítida.',
        raw: rawText.slice(0, 500),
      },
      { status: 422 }
    )
  }

  if (!Array.isArray(parsed.riders)) {
    return NextResponse.json(
      { error: 'Resposta inesperada da IA: lista de ciclistas em falta.' },
      { status: 422 }
    )
  }

  // Anotar cada nome: matched (na startlist) ou unknown
  const startlistSet = new Set(startlistNomes)
  const ridersAnnotated = parsed.riders.slice(0, numPosicoes).map((nome, idx) => ({
    posicao: idx + 1,
    nome,
    matched: startlistSet.has(nome),
  }))

  return NextResponse.json({
    riders: ridersAnnotated,
    camisola_sprint: parsed.camisola_sprint ?? null,
    camisola_montanha: parsed.camisola_montanha ?? null,
    camisola_juventude: parsed.camisola_juventude ?? null,
    total_matched: ridersAnnotated.filter(r => r.matched).length,
    total: ridersAnnotated.length,
    startlist_size: startlistNomes.length,
  })
}
