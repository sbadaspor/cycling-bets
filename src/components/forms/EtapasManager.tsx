'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import type { Ciclista, EtapaResultado, PosicaoAdicional, Prova } from '@/types'
import CyclistAutocomplete from './CyclistAutocomplete'
import { getConfigCategoria } from '@/lib/categoriaConfig'
import ImageResultsParser from './ImageResultsParser'

interface Props {
  prova: Prova
}

export default function EtapasManager({ prova }: Props) {
  const router = useRouter()
  const provaId = prova.id
  const config = getConfigCategoria(prova.categoria)
  const numPos = config.numPosicoes
  const topAlto = numPos === 20 ? 10 : 5

  const [etapas, setEtapas] = useState<EtapaResultado[]>([])
  const [ciclistas, setCiclistas] = useState<Ciclista[]>([])
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [sucesso, setSucesso] = useState<string | null>(null)
  const [modo, setModo] = useState<'lista' | 'editar'>('lista')
  const [modoInput, setModoInput] = useState<'manual' | 'imagem' | 'csv'>('manual')
  const [temposMap, setTemposMap] = useState<Record<string, string>>({})

  // Formulário
  const [editando, setEditando] = useState<EtapaResultado | null>(null)
  const [numeroEtapa, setNumeroEtapa] = useState<number>(1)
  const [dataEtapa, setDataEtapa] = useState<string>('')
  const [posicoes, setPosicoes] = useState<string[]>(Array(numPos).fill(''))
  const [adicionais, setAdicionais] = useState<PosicaoAdicional[]>([])
  const [camisolaSprint, setCamisolaSprint] = useState('')
  const [camisolaMontanha, setCamisolaMontanha] = useState('')
  const [camisolaJuventude, setCamisolaJuventude] = useState('')
  const [perfilUrl, setPerfilUrl] = useState('')
  const [gpxUrl, setGpxUrl] = useState('')
  const [gpxUploading, setGpxUploading] = useState(false)
  const [isFinal, setIsFinal] = useState(false)
  const [preenchidoDeAnterior, setPreenchidoDeAnterior] = useState(false)

  useEffect(() => {
    Promise.all([
      fetch(`/api/etapas?prova_id=${provaId}`).then(r => r.json()),
      fetch(`/api/ciclistas?prova_id=${provaId}`).then(r => r.json()),
    ])
      .then(([eRes, cRes]) => {
        setEtapas(eRes.etapas ?? [])
        setCiclistas(cRes.ciclistas ?? [])
      })
      .catch(() => {
        setEtapas([])
        setCiclistas([])
      })
  }, [provaId])

  const nomesValidos = new Set(ciclistas.map(c => c.nome))

  function novaEtapa() {
    setEditando(null)
    const proximo = etapas.length > 0 ? Math.max(...etapas.map(e => e.numero_etapa)) + 1 : 1
    setNumeroEtapa(proximo)
    setDataEtapa(new Date().toISOString().split('T')[0])

    const ultima = etapas.length > 0
      ? etapas.reduce((a, b) => (a.numero_etapa > b.numero_etapa ? a : b))
      : null

    if (ultima && config.multiEtapas) {
      setPosicoes([...ultima.classificacao_geral_top20.slice(0, numPos)])
      setAdicionais([...(ultima.posicoes_adicionais ?? [])])
      setCamisolaSprint(ultima.camisola_sprint ?? '')
      setCamisolaMontanha(ultima.camisola_montanha ?? '')
      setCamisolaJuventude(ultima.camisola_juventude ?? '')
      setPreenchidoDeAnterior(true)
    } else {
      setPosicoes(Array(numPos).fill(''))
      setAdicionais([])
      setCamisolaSprint('')
      setCamisolaMontanha('')
      setCamisolaJuventude('')
      setPreenchidoDeAnterior(false)
    }

    setPerfilUrl('')
    setGpxUrl('')
    setIsFinal(!config.multiEtapas)
    setErro(null)
    setSucesso(null)
    setModoInput('manual')
    setModo('editar')
  }

  function limparFormulario() {
    setPosicoes(Array(numPos).fill(''))
    setAdicionais([])
    setCamisolaSprint('')
    setCamisolaMontanha('')
    setCamisolaJuventude('')
    setPreenchidoDeAnterior(false)
  }

  function editarEtapa(e: EtapaResultado) {
    setEditando(e)
    setNumeroEtapa(e.numero_etapa)
    setDataEtapa(e.data_etapa)
    setPosicoes(e.classificacao_geral_top20.slice(0, numPos))
    setAdicionais(e.posicoes_adicionais ?? [])
    setCamisolaSprint(e.camisola_sprint ?? '')
    setCamisolaMontanha(e.camisola_montanha ?? '')
    setCamisolaJuventude(e.camisola_juventude ?? '')
    setPerfilUrl(e.perfil_url ?? '')
    setGpxUrl(e.gpx_url ?? '')
    setIsFinal(e.is_final || !config.multiEtapas)
    setPreenchidoDeAnterior(false)
    setErro(null)
    setSucesso(null)
    setTemposMap(((e as unknown as Record<string, unknown>).tempos_classificacao as Record<string, string>) ?? {})
    setModoInput('manual')
    setModo('editar')
  }

  async function apagarEtapa(numero: number) {
    if (!confirm(`Apagar etapa ${numero}? Os pontos serão recalculados com base na etapa anterior (ou zerados se for a única).`)) return
    setLoading(true)
    setErro(null)
    setSucesso(null)
    try {
      const res = await fetch(`/api/etapas?prova_id=${provaId}&numero_etapa=${numero}`, {
        method: 'DELETE',
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erro ao apagar')
      setSucesso(`✅ Etapa ${numero} apagada. Pontos recalculados.`)
      const eRes = await fetch(`/api/etapas?prova_id=${provaId}`).then(r => r.json())
      setEtapas(eRes.etapas ?? [])
      router.refresh()
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro desconhecido')
    } finally {
      setLoading(false)
    }
  }

  async function guardarEtapa() {
    setErro(null)
    setSucesso(null)

    const vazios = posicoes.filter(c => !c.trim())
    if (vazios.length > 0) {
      setErro(`Faltam ${vazios.length} posições no Top-${numPos}.`)
      return
    }

    const invalidos = posicoes.filter(c => !nomesValidos.has(c.trim()))
    if (invalidos.length > 0) {
      setErro(`${invalidos.length} ciclista(s) do Top-${numPos} não estão na startlist.`)
      return
    }

    for (const a of adicionais) {
      if (!a.nome.trim()) {
        setErro('Há posições adicionais sem ciclista escolhido.')
        return
      }
      if (!nomesValidos.has(a.nome.trim())) {
        setErro(`Ciclista "${a.nome}" não está na startlist.`)
        return
      }
      if (a.posicao <= numPos) {
        setErro(`Posições adicionais têm de ser maiores que ${numPos}.`)
        return
      }
    }
    const posUnicas = new Set(adicionais.map(a => a.posicao))
    if (posUnicas.size !== adicionais.length) {
      setErro('Há posições adicionais repetidas.')
      return
    }
    const nomesTop = new Set(posicoes.map(n => n.trim()))
    for (const a of adicionais) {
      if (nomesTop.has(a.nome.trim())) {
        setErro(`Ciclista "${a.nome}" já está no Top-${numPos}.`)
        return
      }
    }
    const nomesAd = adicionais.map(a => a.nome.trim())
    if (new Set(nomesAd).size !== nomesAd.length) {
      setErro('Há ciclistas repetidos nas posições adicionais.')
      return
    }

    if (config.temCamisolas) {
      const camisolas = [camisolaSprint, camisolaMontanha, camisolaJuventude]
        .map(c => c.trim())
        .filter(c => c.length > 0)
      const camisolasInvalidas = camisolas.filter(c => !nomesValidos.has(c))
      if (camisolasInvalidas.length > 0) {
        setErro('Ciclista de camisola não está na startlist.')
        return
      }
    }

    const classificacao = [...posicoes.map(c => c.trim())]
    while (classificacao.length < 20) classificacao.push('')

    setLoading(true)
    try {
      const res = await fetch('/api/etapas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prova_id: provaId,
          numero_etapa: numeroEtapa,
          data_etapa: dataEtapa,
          classificacao_geral_top20: classificacao,
          posicoes_adicionais: adicionais.map(a => ({ posicao: a.posicao, nome: a.nome.trim(), tempo: (a as { posicao: number; nome: string; tempo?: string }).tempo ?? '' })),
          tempos_classificacao: temposMap,
          camisola_sprint: config.temCamisolas ? camisolaSprint.trim() : '',
          camisola_montanha: config.temCamisolas ? camisolaMontanha.trim() : '',
          camisola_juventude: config.temCamisolas ? camisolaJuventude.trim() : '',
          perfil_url: perfilUrl.trim() || null,
          gpx_url: gpxUrl.trim() || null,
          is_final: !config.multiEtapas ? true : isFinal,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erro ao guardar')

      setSucesso(
        `✅ Etapa ${numeroEtapa} guardada. Pontos recalculados para ${data.apostas_calculadas}/${data.total_apostas} apostas.${data.is_final ? ' Prova marcada como FINALIZADA.' : ''}`
      )
      const eRes = await fetch(`/api/etapas?prova_id=${provaId}`).then(r => r.json())
      setEtapas(eRes.etapas ?? [])
      setModo('lista')
      router.refresh()
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro desconhecido')
    } finally {
      setLoading(false)
    }
  }

  function adicionarPosicao() {
    const visiveis = adicionais.filter(a => a.posicao > numPos)
    const proximaPos = visiveis.length > 0
      ? Math.max(...visiveis.map(a => a.posicao)) + 1
      : numPos + 1
    setAdicionais([...adicionais, { posicao: proximaPos, nome: '' }])
  }

  function removerPosicao(idx: number) {
    setAdicionais(adicionais.filter((_, i) => i !== idx))
  }

  function atualizarPosicao(idx: number, campo: 'posicao' | 'nome', valor: string | number) {
    setAdicionais(adicionais.map((a, i) =>
      i === idx ? { ...a, [campo]: valor } : a
    ))
  }

  const tituloLista = config.multiEtapas ? 'Etapas inseridas' : 'Resultado da prova'
  const btnNovaEtapa = config.multiEtapas ? '➕ Nova etapa' : '➕ Inserir resultado'
  const podeCriarNova = config.multiEtapas || etapas.length === 0

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-4 text-sm text-amber-200">
        {config.multiEtapas ? (
          <>
            <strong>Como funciona:</strong> insere a classificação geral (Top-{numPos}) por etapa. Opcionalmente, adiciona posições para lá do {numPos} para os jogadores verem onde estão os ciclistas que apostaram. A pontuação é recalculada automaticamente com base na <strong>etapa mais recente</strong>.
          </>
        ) : (
          <>
            <strong>Como funciona:</strong> esta prova ({config.label}) tem apenas uma classificação final. Insere o Top-{numPos} e a prova fica automaticamente finalizada.
          </>
        )}
      </div>

      {ciclistas.length === 0 && (
        <div className="bg-amber-900/30 border border-amber-800 rounded-lg px-4 py-3 text-amber-300 text-sm">
          ⚠️ Esta prova ainda não tem startlist carregada. Vai ao separador <strong>Startlist</strong> primeiro.
        </div>
      )}

      {erro && (
        <div className="bg-red-900/30 border border-red-800 rounded-lg px-4 py-3 text-red-400 text-sm">
          ⚠️ {erro}
        </div>
      )}
      {sucesso && (
        <div className="bg-green-900/30 border border-green-800 rounded-lg px-4 py-3 text-green-400 text-sm">
          {sucesso}
        </div>
      )}

      {/* MODO LISTA */}
      {ciclistas.length > 0 && modo === 'lista' && (
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-zinc-100">
              {tituloLista} {config.multiEtapas && `(${etapas.length})`}
            </h2>
            {podeCriarNova && (
              <button onClick={novaEtapa} className="btn-primary">
                {btnNovaEtapa}
              </button>
            )}
          </div>

          {etapas.length === 0 ? (
            <p className="text-zinc-500 text-sm py-8 text-center">
              {config.multiEtapas
                ? 'Ainda não há etapas inseridas. Clica em Nova etapa para começar.'
                : 'Ainda não há resultado inserido. Clica em Inserir resultado para começar.'}
            </p>
          ) : (
            <div className="space-y-2">
              {etapas.map(e => {
                const ehUltima = e.numero_etapa === Math.max(...etapas.map(x => x.numero_etapa))
                const numAd = e.posicoes_adicionais?.length ?? 0
                return (
                  <div
                    key={e.id}
                    className="flex items-center justify-between gap-3 rounded-lg border border-zinc-800 bg-zinc-900/50 p-3"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        {config.multiEtapas && (
                          <span className="font-bold text-zinc-100">Etapa {e.numero_etapa}</span>
                        )}
                        {!config.multiEtapas && (
                          <span className="font-bold text-zinc-100">Resultado</span>
                        )}
                        <span className="text-xs text-zinc-500">{e.data_etapa}</span>
                        {e.is_final && config.multiEtapas && (
                          <span className="badge bg-green-900/50 text-green-400 border border-green-800 text-xs">
                            🏁 Final
                          </span>
                        )}
                        {numAd > 0 && (
                          <span className="badge bg-blue-900/50 text-blue-400 border border-blue-800 text-xs">
                            +{numAd} adicionais
                          </span>
                        )}
                        {e.perfil_url && (
                          <span className="badge bg-purple-900/50 text-purple-400 border border-purple-800 text-xs">
                            🗺️ Perfil
                          </span>
                        )}
                        {e.gpx_url && (
                          <span className="badge bg-blue-900/50 text-blue-400 border border-blue-800 text-xs">
                            📍 GPX
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-zinc-500 mt-1">
                        Vencedor: <span className="text-amber-400">{e.classificacao_geral_top20[0]}</span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => editarEtapa(e)}
                        className="px-3 py-1.5 text-sm rounded-md bg-zinc-700 hover:bg-zinc-600"
                      >
                        ✏️ Editar
                      </button>
                      {ehUltima && (
                        <button
                          onClick={() => apagarEtapa(e.numero_etapa)}
                          disabled={loading}
                          className="px-3 py-1.5 text-sm rounded-md bg-red-900/40 text-red-300 hover:bg-red-900/60 disabled:opacity-50"
                        >
                          🗑️ Apagar
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* MODO EDITAR */}
      {ciclistas.length > 0 && modo === 'editar' && (
        <>
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-zinc-100">
                {editando
                  ? (config.multiEtapas ? `Editar Etapa ${editando.numero_etapa}` : 'Editar resultado')
                  : (config.multiEtapas ? `Nova Etapa ${numeroEtapa}` : 'Inserir resultado')}
              </h2>
              <button
                onClick={() => setModo('lista')}
                className="text-sm text-zinc-400 hover:text-zinc-100"
              >
                ← Voltar
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {config.multiEtapas && (
                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-1.5">Nº Etapa *</label>
                  <input
                    type="number"
                    min={1}
                    className="input-field"
                    value={numeroEtapa}
                    onChange={e => setNumeroEtapa(parseInt(e.target.value) || 1)}
                    disabled={!!editando}
                  />
                </div>
              )}
              <div className={config.multiEtapas ? 'sm:col-span-2' : 'sm:col-span-3'}>
                <label className="block text-sm font-medium text-zinc-400 mb-1.5">Data *</label>
                <input
                  type="date"
                  className="input-field"
                  value={dataEtapa}
                  onChange={e => setDataEtapa(e.target.value)}
                />
              </div>
            </div>

            {/* URL do perfil da etapa */}
            <div style={{ marginTop: '1rem' }}>
              <label className="block text-sm font-medium text-zinc-400 mb-1.5">
                🗺️ URL do perfil da etapa (opcional)
              </label>
              <input
                type="url"
                className="input-field"
                value={perfilUrl}
                onChange={e => setPerfilUrl(e.target.value)}
                placeholder="https://www.procyclingstats.com/images/profiles/..."
              />
              {perfilUrl && (
                <div style={{ marginTop: '0.625rem', borderRadius: '0.625rem', overflow: 'hidden', border: '1px solid var(--border)' }}>
                  <img
                    src={perfilUrl}
                    alt="Perfil da etapa"
                    style={{ width: '100%', height: 'auto', display: 'block' }}
                    onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
                  />
                </div>
              )}
            </div>

            {/* Upload GPX */}
            <div style={{ marginTop: '1rem' }}>
              <label className="block text-sm font-medium text-zinc-400 mb-1.5">
                📍 Ficheiro GPX do percurso (opcional)
              </label>
              {gpxUrl ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', background: 'rgba(200,244,0,0.08)', border: '1px solid rgba(200,244,0,0.25)', borderRadius: '0.625rem', padding: '0.625rem 0.875rem' }}>
                  <span style={{ fontSize: '0.82rem', color: 'var(--lime)', flex: 1 }}>✅ GPX carregado</span>
                  <button
                    onClick={() => setGpxUrl('')}
                    style={{ fontSize: '0.75rem', color: 'var(--text-sub)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}
                  >
                    Remover
                  </button>
                </div>
              ) : (
                <div>
                  <input
                    type="file"
                    accept=".gpx"
                    disabled={gpxUploading}
                    onChange={async (e) => {
                      const file = e.target.files?.[0]
                      if (!file) return
                      setGpxUploading(true)
                      setErro(null)
                      try {
                        const { createClient } = await import('@supabase/supabase-js')
                        const supabase = createClient(
                          process.env.NEXT_PUBLIC_SUPABASE_URL!,
                          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
                        )
                        const fileName = `${provaId}-etapa-${numeroEtapa}-${Date.now()}.gpx`
                        const { error } = await supabase.storage
                          .from('gpx')
                          .upload(fileName, file, { upsert: true, contentType: 'application/gpx+xml' })
                        if (error) throw error
                        const { data: urlData } = supabase.storage.from('gpx').getPublicUrl(fileName)
                        setGpxUrl(urlData.publicUrl)
                      } catch (err) {
                        setErro(err instanceof Error ? err.message : 'Erro ao fazer upload do GPX')
                      } finally {
                        setGpxUploading(false)
                      }
                    }}
                    style={{ display: 'none' }}
                    id="gpx-upload"
                  />
                  <label
                    htmlFor="gpx-upload"
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
                      padding: '0.5rem 1rem', borderRadius: '0.625rem', cursor: gpxUploading ? 'not-allowed' : 'pointer',
                      border: '1px dashed var(--border-hi)', background: 'var(--surface-2)',
                      color: 'var(--text-dim)', fontSize: '0.82rem', fontWeight: 500,
                      opacity: gpxUploading ? 0.6 : 1,
                    }}
                  >
                    {gpxUploading ? '⏳ A carregar...' : '📁 Escolher ficheiro .gpx'}
                  </label>
                </div>
              )}
            </div>

            {/* Toggle manual / imagem / csv */}
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1.25rem', paddingTop: '1.25rem', borderTop: '1px solid var(--border)', flexWrap: 'wrap' }}>
              {[
                { key: 'manual', label: '✍️ Manual' },
                { key: 'csv', label: '📄 CSV' },
                { key: 'imagem', label: '📸 Foto' },
              ].map(opt => (
                <button
                  key={opt.key}
                  onClick={() => setModoInput(opt.key as 'manual' | 'csv' | 'imagem')}
                  style={{
                    padding: '0.5rem 1rem', borderRadius: '0.625rem',
                    border: `1px solid ${modoInput === opt.key ? 'rgba(200,244,0,0.4)' : 'var(--border-hi)'}`,
                    background: modoInput === opt.key ? 'rgba(200,244,0,0.1)' : 'var(--surface-2)',
                    color: modoInput === opt.key ? 'rgba(200,244,0,0.9)' : 'var(--text-dim)',
                    fontWeight: 600, fontSize: '0.8rem', cursor: 'pointer',
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Modo imagem */}
          {modoInput === 'imagem' && (
            <div className="card">
              <ImageResultsParser
                provaId={provaId}
                ciclistas={ciclistas}
                temCamisolas={config.temCamisolas}
                numPosicoes={numPos}
                onAplicar={({ posicoes, camisola_sprint, camisola_montanha, camisola_juventude, todosOsCiclistas }) => {
                  const novas = Array(numPos).fill('')
                  posicoes.slice(0, numPos).forEach((nome, i) => { novas[i] = nome })
                  setPosicoes(novas)
                  setCamisolaSprint(camisola_sprint)
                  setCamisolaMontanha(camisola_montanha)
                  setCamisolaJuventude(camisola_juventude)

                  const nomesNoTop = new Set(
                    novas.filter(n => n?.trim()).map(n => n.trim().toLowerCase())
                  )

                  const adicionaisFromImage = todosOsCiclistas
                    .filter(c => c.posicao > numPos && c.nome?.trim() && !nomesNoTop.has(c.nome.trim().toLowerCase()))
                    .map(c => ({ posicao: c.posicao, nome: c.nome, tempo: c.tempo }))
                  setAdicionais(adicionaisFromImage)

                  const mapa: Record<string, string> = {}
                  todosOsCiclistas.forEach(c => {
                    if (c.nome?.trim()) mapa[c.nome.trim().toLowerCase()] = c.tempo ?? ''
                  })
                  setTemposMap(mapa)
                  setModoInput('manual')
                }}
                onCancelar={() => setModoInput('manual')}
              />
            </div>
          )}

          {/* Modo CSV */}
          {modoInput === 'csv' && (
            <div className="card">
              <h3 style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text)', marginBottom: '0.5rem' }}>📄 Importar via CSV</h3>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-dim)', marginBottom: '0.875rem', lineHeight: 1.5 }}>
                Formato: <code style={{ background: 'var(--surface-2)', padding: '1px 5px', borderRadius: '3px', fontSize: '0.75rem' }}>posicao,nome,tempo</code> — uma linha por ciclista, sem cabeçalho. O tempo é opcional.
              </p>

              <input
                type="file"
                accept=".csv,text/csv"
                id="csv-file-input"
                style={{ display: 'none' }}
                onChange={async (e) => {
                  const file = e.target.files?.[0]
                  if (!file) return
                  const text = await file.text()
                  const linhas = text.trim().split('\n').filter(l => l.trim())
                  const parsed: { pos: number; nome: string; tempo: string }[] = []
                  const errosCSV: string[] = []

                  for (const linha of linhas) {
                    const partes = linha.split(',')
                    if (partes.length < 2) continue
                    const pos = parseInt(partes[0].trim())
                    const nome = partes[1].trim()
                    const tempo = partes[2]?.trim() ?? ''
                    if (isNaN(pos) || !nome) { errosCSV.push(`Linha inválida: "${linha}"`); continue }
                    parsed.push({ pos, nome, tempo })
                  }

                  if (!parsed.length) { setErro('Nenhuma linha válida encontrada no CSV.'); return }
                  if (errosCSV.length > 0) { setErro(`Erros: ${errosCSV.slice(0, 3).join('; ')}`); return }

                  parsed.sort((a, b) => a.pos - b.pos)
                  const novas = Array(numPos).fill('')
                  const mapa: Record<string, string> = {}

                  parsed.forEach(item => {
                    const idx = item.pos - 1
                    if (idx >= 0 && idx < numPos) novas[idx] = item.nome
                    if (item.nome?.trim()) mapa[item.nome.trim().toLowerCase()] = item.tempo ?? ''
                  })
                  setPosicoes(novas)
                  setTemposMap(mapa)

                  const nomesTop = new Set(novas.filter(Boolean).map(n => n.toLowerCase()))
                  const adicionaisCSV = parsed
                    .filter(item => item.pos > numPos && item.nome?.trim() && !nomesTop.has(item.nome.trim().toLowerCase()))
                    .map(item => ({ posicao: item.pos, nome: item.nome, tempo: item.tempo }))
                  setAdicionais(adicionaisCSV)
                  setModoInput('manual')
                  setSucesso(`✅ CSV importado: ${novas.filter(Boolean).length} posições no Top-${numPos}${adicionaisCSV.length > 0 ? `, ${adicionaisCSV.length} adicionais` : ''}.`)
                }}
              />

              <label
                htmlFor="csv-file-input"
                style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                  gap: '0.75rem', padding: '2.5rem 1.5rem', borderRadius: '0.75rem', cursor: 'pointer',
                  border: '2px dashed rgba(200,244,0,0.25)', background: 'rgba(200,244,0,0.03)',
                  transition: 'all 0.15s',
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(200,244,0,0.5)'; e.currentTarget.style.background = 'rgba(200,244,0,0.06)' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(200,244,0,0.25)'; e.currentTarget.style.background = 'rgba(200,244,0,0.03)' }}
              >
                <span style={{ fontSize: '2rem' }}>📁</span>
                <div style={{ textAlign: 'center' }}>
                  <p style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--lime)', marginBottom: '0.25rem' }}>Clica para escolher o ficheiro CSV</p>
                  <p style={{ fontSize: '0.72rem', color: 'var(--text-sub)' }}>ou arrasta o ficheiro aqui</p>
                </div>
              </label>

              <button
                onClick={() => setModoInput('manual')}
                style={{ marginTop: '0.75rem', padding: '0.4rem 0.875rem', borderRadius: '0.625rem', cursor: 'pointer', background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text-dim)', fontSize: '0.82rem' }}
              >
                Cancelar
              </button>
            </div>
          )}

          {/* Formulário manual */}
          {modoInput === 'manual' && (<>
          {preenchidoDeAnterior && (
            <div className="rounded-lg border border-blue-500/40 bg-blue-500/10 p-3 text-sm text-blue-200 flex items-center justify-between gap-3">
              <span>
                ℹ️ Pré-preenchido com a classificação da etapa anterior. Altera apenas as posições que mudaram.
              </span>
              <button
                onClick={limparFormulario}
                className="text-xs text-blue-300 underline hover:text-blue-100 whitespace-nowrap"
              >
                Limpar tudo
              </button>
            </div>
          )}

          <div className="card">
            <h2 className="text-lg font-semibold text-zinc-100 mb-1">
              {config.multiEtapas
                ? `Classificação Geral após Etapa ${numeroEtapa}`
                : `Classificação final Top-${numPos}`}
            </h2>
            <p className="text-zinc-500 text-sm mb-4">
              {config.multiEtapas
                ? `Top ${numPos} da geral acumulada (não o pódio do dia).`
                : `Ordem de chegada dos ${numPos} primeiros.`}
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {posicoes.map((nome, idx) => (
                <div key={idx} className="flex items-start gap-3">
                  <div className={`
                    w-8 h-8 flex items-center justify-center rounded-lg text-xs font-bold flex-shrink-0 mt-2
                    ${idx < topAlto
                      ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                      : 'bg-zinc-800 text-zinc-500 border border-zinc-700'
                    }
                  `}>
                    {idx + 1}
                  </div>
                  <div className="flex-1">
                    <CyclistAutocomplete
                      ciclistas={ciclistas}
                      value={nome}
                      onChange={(v) => {
                        const novo = [...posicoes]
                        novo[idx] = v
                        setPosicoes(novo)
                      }}
                      placeholder={`${idx + 1}º lugar`}
                      usados={[
                        ...posicoes.filter((_, i) => i !== idx),
                        ...adicionais.map(a => a.nome),
                      ]}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Posições adicionais */}
          <div className="card">
            <div className="flex items-center justify-between mb-1">
              <h2 className="text-lg font-semibold text-zinc-100">
                Posições adicionais (opcional)
              </h2>
              <button
                onClick={adicionarPosicao}
                className="text-sm rounded-md bg-zinc-700 hover:bg-zinc-600 px-3 py-1.5"
              >
                ➕ Adicionar
              </button>
            </div>
            <p className="text-zinc-500 text-sm mb-4">
              Adiciona posições para lá do {numPos} (ex.: {numPos + 3}º, {numPos + 10}º) para os jogadores verem onde estão os ciclistas que apostaram. Não dão pontos extra — é só informação.
            </p>

            {(() => {
              const temClassif = adicionais.some(a => a.posicao <= numPos)
              const visiveis = adicionais.filter(a => a.posicao > numPos)
              const totalOcultos = adicionais.filter(a => a.posicao <= numPos).length

              return (
                <>
                  {temClassif && totalOcultos > 0 && (
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-dim)', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: '0.5rem', padding: '0.5rem 0.75rem', marginBottom: '0.75rem' }}>
                      ℹ️ {totalOcultos} posições com tempos guardadas da foto (não visíveis aqui — são usadas para mostrar os tempos aos jogadores).
                    </div>
                  )}
                  {visiveis.length === 0 ? (
                    <p className="text-zinc-500 text-sm text-center py-6">
                      {temClassif
                        ? 'Todos os tempos foram importados da foto. Podes adicionar posições extra se quiseres.'
                        : <>Sem posições adicionais. Clica em <strong>Adicionar</strong> para começares.</>}
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {visiveis.map((a) => {
                        const idx = adicionais.indexOf(a)
                        return (
                          <div key={idx} className="flex items-start gap-2">
                            <input
                              type="number"
                              min={numPos + 1}
                              className="input-field w-24 flex-shrink-0"
                              value={a.posicao}
                              onChange={e => atualizarPosicao(idx, 'posicao', parseInt(e.target.value) || (numPos + 1))}
                              placeholder="Pos"
                            />
                            <div className="flex-1">
                              <CyclistAutocomplete
                                ciclistas={ciclistas}
                                value={a.nome}
                                onChange={(v) => atualizarPosicao(idx, 'nome', v)}
                                placeholder="Ciclista"
                                usados={[
                                  ...posicoes,
                                  ...adicionais.filter((_, i) => i !== idx).map(x => x.nome),
                                ]}
                              />
                            </div>
                            <button
                              onClick={() => removerPosicao(idx)}
                              className="px-3 py-2 text-sm rounded-md bg-red-900/40 text-red-300 hover:bg-red-900/60 flex-shrink-0"
                            >
                              ✕
                            </button>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </>
              )
            })()}
          </div>

          {/* Camisolas */}
          {config.temCamisolas && (
            <div className="card">
              <h2 className="text-lg font-semibold text-zinc-100 mb-4">🎽 Camisolas Atuais</h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-1.5">🟢 Sprint</label>
                  <CyclistAutocomplete
                    ciclistas={ciclistas}
                    value={camisolaSprint}
                    onChange={setCamisolaSprint}
                    placeholder="Líder dos pontos"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-1.5">🔴 Montanha</label>
                  <CyclistAutocomplete
                    ciclistas={ciclistas}
                    value={camisolaMontanha}
                    onChange={setCamisolaMontanha}
                    placeholder="Líder da montanha"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-1.5">⚪ Juventude</label>
                  <CyclistAutocomplete
                    ciclistas={ciclistas}
                    value={camisolaJuventude}
                    onChange={setCamisolaJuventude}
                    placeholder="Melhor jovem"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Etapa final */}
          {config.multiEtapas && (
            <div className="card">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isFinal}
                  onChange={e => setIsFinal(e.target.checked)}
                  className="w-5 h-5"
                />
                <div>
                  <div className="font-medium text-zinc-100">🏁 Esta é a etapa final</div>
                  <div className="text-xs text-zinc-500">
                    Marca a prova como finalizada e fixa esta classificação como resultado oficial.
                  </div>
                </div>
              </label>
            </div>
          )}

          {!config.multiEtapas && (
            <div className="card border-green-900/40 bg-green-950/20">
              <p className="text-sm text-green-200">
                ℹ️ Ao guardar, a prova fica automaticamente marcada como <strong>finalizada</strong> (provas de {config.label.toLowerCase()} têm apenas um resultado).
              </p>
            </div>
          )}

          <button
            onClick={guardarEtapa}
            disabled={loading}
            className="btn-primary w-full py-3 text-base"
          >
            {loading
              ? '⏳ A guardar e recalcular pontos...'
              : editando
                ? '💾 Atualizar'
                : '➕ Guardar'}
          </button>
          </>)}
        </>
      )}
    </div>
  )
}
