'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import type { Ciclista, EtapaResultado, Prova } from '@/types'
import CyclistAutocomplete from './CyclistAutocomplete'

interface Props {
  provas: Prova[]
}

export default function EtapasManager({ provas }: Props) {
  const router = useRouter()
  const [provaId, setProvaId] = useState<string>('')
  const [etapas, setEtapas] = useState<EtapaResultado[]>([])
  const [ciclistas, setCiclistas] = useState<Ciclista[]>([])
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [sucesso, setSucesso] = useState<string | null>(null)
  const [modo, setModo] = useState<'lista' | 'editar'>('lista')

  // Estado do formulário
  const [editando, setEditando] = useState<EtapaResultado | null>(null)
  const [numeroEtapa, setNumeroEtapa] = useState<number>(1)
  const [dataEtapa, setDataEtapa] = useState<string>('')
  const [top20, setTop20] = useState<string[]>(Array(20).fill(''))
  const [camisolaSprint, setCamisolaSprint] = useState('')
  const [camisolaMontanha, setCamisolaMontanha] = useState('')
  const [camisolaJuventude, setCamisolaJuventude] = useState('')
  const [isFinal, setIsFinal] = useState(false)
  const [preenchidoDeAnterior, setPreenchidoDeAnterior] = useState(false)

  // Carregar etapas + startlist quando muda a prova
  useEffect(() => {
    if (!provaId) {
      setEtapas([])
      setCiclistas([])
      return
    }
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

    // Pré-preencher com a etapa anterior (se houver) para o admin só editar mudanças
    const ultima = etapas.length > 0
      ? etapas.reduce((a, b) => (a.numero_etapa > b.numero_etapa ? a : b))
      : null

    if (ultima) {
      setTop20([...ultima.classificacao_geral_top20])
      setCamisolaSprint(ultima.camisola_sprint ?? '')
      setCamisolaMontanha(ultima.camisola_montanha ?? '')
      setCamisolaJuventude(ultima.camisola_juventude ?? '')
      setPreenchidoDeAnterior(true)
    } else {
      setTop20(Array(20).fill(''))
      setCamisolaSprint('')
      setCamisolaMontanha('')
      setCamisolaJuventude('')
      setPreenchidoDeAnterior(false)
    }

    setIsFinal(false)
    setErro(null)
    setSucesso(null)
    setModo('editar')
  }

  function limparFormulario() {
    setTop20(Array(20).fill(''))
    setCamisolaSprint('')
    setCamisolaMontanha('')
    setCamisolaJuventude('')
    setPreenchidoDeAnterior(false)
  }

  function editarEtapa(e: EtapaResultado) {
    setEditando(e)
    setNumeroEtapa(e.numero_etapa)
    setDataEtapa(e.data_etapa)
    setTop20(e.classificacao_geral_top20)
    setCamisolaSprint(e.camisola_sprint ?? '')
    setCamisolaMontanha(e.camisola_montanha ?? '')
    setCamisolaJuventude(e.camisola_juventude ?? '')
    setIsFinal(e.is_final)
    setPreenchidoDeAnterior(false)
    setErro(null)
    setSucesso(null)
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
      // Recarregar lista
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

    const vazios = top20.filter(c => !c.trim())
    if (vazios.length > 0) {
      setErro(`Faltam ${vazios.length} posições no Top-20.`)
      return
    }

    const invalidos = top20.filter(c => !nomesValidos.has(c.trim()))
    if (invalidos.length > 0) {
      setErro(`${invalidos.length} ciclista(s) não estão na startlist. Usa o autocomplete.`)
      return
    }

    const camisolas = [camisolaSprint, camisolaMontanha, camisolaJuventude]
      .map(c => c.trim())
      .filter(c => c.length > 0)
    const camisolasInvalidas = camisolas.filter(c => !nomesValidos.has(c))
    if (camisolasInvalidas.length > 0) {
      setErro('Ciclista de camisola não está na startlist.')
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/etapas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prova_id: provaId,
          numero_etapa: numeroEtapa,
          data_etapa: dataEtapa,
          classificacao_geral_top20: top20.map(c => c.trim()),
          camisola_sprint: camisolaSprint.trim(),
          camisola_montanha: camisolaMontanha.trim(),
          camisola_juventude: camisolaJuventude.trim(),
          is_final: isFinal,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erro ao guardar')

      setSucesso(
        `✅ Etapa ${numeroEtapa} guardada. Pontos recalculados para ${data.apostas_calculadas}/${data.total_apostas} apostas.${data.is_final ? ' Prova marcada como FINALIZADA.' : ''}`
      )
      // Recarregar lista
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

  // ============================================================
  // UI
  // ============================================================

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-4 text-sm text-amber-200">
        <strong>Como funciona:</strong> insere uma classificação geral acumulada por cada etapa. A pontuação dos jogadores é recalculada automaticamente com base na <strong>etapa mais recente</strong>. Marca a checkbox <em>&quot;Esta é a etapa final&quot;</em> na última etapa para fechar a prova.
      </div>

      {/* Seleção de prova */}
      <div className="card">
        <label className="block text-sm font-medium text-zinc-400 mb-2">Selecionar Prova</label>
        <select
          className="input-field"
          value={provaId}
          onChange={e => {
            setProvaId(e.target.value)
            setModo('lista')
            setErro(null)
            setSucesso(null)
          }}
        >
          <option value="">-- Escolhe uma prova --</option>
          {provas.map(p => (
            <option key={p.id} value={p.id}>
              {p.nome} ({p.status})
            </option>
          ))}
        </select>
        {provaId && ciclistas.length === 0 && (
          <p className="mt-2 text-sm text-amber-400">
            ⚠️ Esta prova ainda não tem startlist carregada. Vai ao separador <strong>Startlist</strong> primeiro.
          </p>
        )}
      </div>

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
      {provaId && ciclistas.length > 0 && modo === 'lista' && (
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-zinc-100">
              Etapas inseridas ({etapas.length})
            </h2>
            <button onClick={novaEtapa} className="btn-primary">
              ➕ Nova etapa
            </button>
          </div>

          {etapas.length === 0 ? (
            <p className="text-zinc-500 text-sm py-8 text-center">
              Ainda não há etapas inseridas. Clica em <strong>Nova etapa</strong> para começar.
            </p>
          ) : (
            <div className="space-y-2">
              {etapas.map(e => {
                const ehUltima = e.numero_etapa === Math.max(...etapas.map(x => x.numero_etapa))
                return (
                  <div
                    key={e.id}
                    className="flex items-center justify-between gap-3 rounded-lg border border-zinc-800 bg-zinc-900/50 p-3"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-zinc-100">Etapa {e.numero_etapa}</span>
                        <span className="text-xs text-zinc-500">{e.data_etapa}</span>
                        {e.is_final && (
                          <span className="badge bg-green-900/50 text-green-400 border border-green-800 text-xs">
                            🏁 Final
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-zinc-500 mt-1">
                        Líder: <span className="text-amber-400">{e.classificacao_geral_top20[0]}</span>
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
      {provaId && ciclistas.length > 0 && modo === 'editar' && (
        <>
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-zinc-100">
                {editando ? `Editar Etapa ${editando.numero_etapa}` : `Nova Etapa ${numeroEtapa}`}
              </h2>
              <button
                onClick={() => setModo('lista')}
                className="text-sm text-zinc-400 hover:text-zinc-100"
              >
                ← Voltar à lista
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-zinc-400 mb-1.5">Data da Etapa *</label>
                <input
                  type="date"
                  className="input-field"
                  value={dataEtapa}
                  onChange={e => setDataEtapa(e.target.value)}
                />
              </div>
            </div>
          </div>

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
              Classificação Geral após Etapa {numeroEtapa}
            </h2>
            <p className="text-zinc-500 text-sm mb-4">
              Top 20 da geral acumulada (não o pódio do dia).
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {top20.map((nome, idx) => (
                <div key={idx} className="flex items-start gap-3">
                  <div className={`
                    w-8 h-8 flex items-center justify-center rounded-lg text-xs font-bold flex-shrink-0 mt-2
                    ${idx < 10
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
                        const novo = [...top20]
                        novo[idx] = v
                        setTop20(novo)
                      }}
                      placeholder={`${idx + 1}º lugar`}
                      usados={top20.filter((_, i) => i !== idx)}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

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

          <button
            onClick={guardarEtapa}
            disabled={loading}
            className="btn-primary w-full py-3 text-base"
          >
            {loading
              ? '⏳ A guardar e recalcular pontos...'
              : editando
                ? '💾 Atualizar Etapa'
                : '➕ Guardar Etapa'}
          </button>
        </>
      )}
    </div>
  )
}
