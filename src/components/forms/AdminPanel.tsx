'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { Prova, ResultadoReal } from '@/types'

interface Props {
  provas: Prova[]
  mapaResultados: Record<string, ResultadoReal | null>
}

export function AdminPanel({ provas, mapaResultados }: Props) {
  const [tab, setTab] = useState<'provas' | 'resultados'>('resultados')

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="flex gap-1 bg-zinc-900 border border-zinc-800 rounded-xl p-1 w-fit">
        <button
          onClick={() => setTab('resultados')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            tab === 'resultados'
              ? 'bg-amber-500 text-zinc-900'
              : 'text-zinc-400 hover:text-zinc-100'
          }`}
        >
          🏁 Inserir Resultados
        </button>
        <button
          onClick={() => setTab('provas')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            tab === 'provas'
              ? 'bg-amber-500 text-zinc-900'
              : 'text-zinc-400 hover:text-zinc-100'
          }`}
        >
          ➕ Nova Prova
        </button>
      </div>

      {tab === 'resultados' && (
        <ResultadosTab provas={provas} mapaResultados={mapaResultados} />
      )}
      {tab === 'provas' && <NovaProvaTab />}
    </div>
  )
}

// ============================================================
// TAB: Inserir Resultados
// ============================================================
function ResultadosTab({
  provas,
  mapaResultados,
}: {
  provas: Prova[]
  mapaResultados: Record<string, ResultadoReal | null>
}) {
  const router = useRouter()
  const [provaId, setProvaId] = useState('')
  const [top20, setTop20] = useState<string[]>(Array(20).fill(''))
  const [camisolaSprint, setCamisolaSprint] = useState('')
  const [camisolaMontanha, setCamisolaMontanha] = useState('')
  const [camisolaJuventude, setCamisolaJuventude] = useState('')
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [sucesso, setSucesso] = useState<string | null>(null)

  const provasDisponiveis = provas.filter(p => p.status !== 'finalizada')

  const carregarResultadoExistente = (pId: string) => {
    setProvaId(pId)
    const resultado = mapaResultados[pId]
    if (resultado) {
      setTop20(resultado.resultado_top20)
      setCamisolaSprint(resultado.camisola_sprint ?? '')
      setCamisolaMontanha(resultado.camisola_montanha ?? '')
      setCamisolaJuventude(resultado.camisola_juventude ?? '')
    } else {
      setTop20(Array(20).fill(''))
      setCamisolaSprint('')
      setCamisolaMontanha('')
      setCamisolaJuventude('')
    }
  }

  const handleSubmit = async () => {
    setErro(null)
    setSucesso(null)

    if (!provaId) return setErro('Seleciona uma prova.')

    const vazios = top20.filter(c => !c.trim())
    if (vazios.length > 0) return setErro(`Faltam ${vazios.length} posições no Top-20.`)

    setLoading(true)
    try {
      const res = await fetch('/api/resultados', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prova_id: provaId,
          resultado_top20: top20.map(c => c.trim()),
          camisola_sprint: camisolaSprint.trim(),
          camisola_montanha: camisolaMontanha.trim(),
          camisola_juventude: camisolaJuventude.trim(),
        }),
      })

      const data = await res.json()
      if (!res.ok) return setErro(data.error)

      setSucesso(
        `✅ Pontos calculados para ${data.apostas_calculadas} de ${data.total_apostas} apostas!`
      )
      router.refresh()
    } catch {
      setErro('Erro de rede. Tenta novamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Aviso importante */}
      <div className="bg-amber-900/20 border border-amber-800/50 rounded-xl px-4 py-3">
        <p className="text-amber-400 text-sm font-medium">⚠️ Atenção</p>
        <p className="text-amber-300/70 text-sm mt-1">
          Ao submeter o resultado, a prova fica marcada como <strong>finalizada</strong> e os
          pontos de <strong>todos</strong> os participantes são calculados automaticamente.
          Esta ação pode ser repetida para corrigir erros.
        </p>
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

      {/* Seleção da prova */}
      <div className="card">
        <label className="block text-sm font-medium text-zinc-400 mb-2">
          Selecionar Prova
        </label>
        <select
          className="input-field"
          value={provaId}
          onChange={e => carregarResultadoExistente(e.target.value)}
        >
          <option value="">-- Escolhe uma prova --</option>
          {provasDisponiveis.map(p => (
            <option key={p.id} value={p.id}>
              {p.nome} ({p.status})
            </option>
          ))}
          {provas.filter(p => p.status === 'finalizada').map(p => (
            <option key={p.id} value={p.id}>
              {p.nome} (finalizada — corrigir)
            </option>
          ))}
        </select>
      </div>

      {provaId && (
        <>
          {/* Top 20 Real */}
          <div className="card">
            <h2 className="text-lg font-semibold text-zinc-100 mb-1">Resultado Real Top-20</h2>
            <p className="text-zinc-500 text-sm mb-4">
              Insere os ciclistas por ordem de chegada oficial.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {top20.map((ciclista, idx) => (
                <div key={idx} className="flex items-center gap-3">
                  <div className={`
                    w-8 h-8 flex items-center justify-center rounded-lg text-xs font-bold flex-shrink-0
                    ${idx < 10
                      ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                      : 'bg-zinc-800 text-zinc-500 border border-zinc-700'
                    }
                  `}>
                    {idx + 1}
                  </div>
                  <input
                    type="text"
                    className="input-field"
                    placeholder={`${idx + 1}º lugar real`}
                    value={ciclista}
                    onChange={e => {
                      const novo = [...top20]
                      novo[idx] = e.target.value
                      setTop20(novo)
                    }}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Camisolas Reais */}
          <div className="card">
            <h2 className="text-lg font-semibold text-zinc-100 mb-4">🎽 Camisolas Reais</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1.5">
                  🟢 Sprint
                </label>
                <input
                  type="text"
                  className="input-field"
                  value={camisolaSprint}
                  onChange={e => setCamisolaSprint(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1.5">
                  🔴 Montanha
                </label>
                <input
                  type="text"
                  className="input-field"
                  value={camisolaMontanha}
                  onChange={e => setCamisolaMontanha(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1.5">
                  ⚪ Juventude
                </label>
                <input
                  type="text"
                  className="input-field"
                  value={camisolaJuventude}
                  onChange={e => setCamisolaJuventude(e.target.value)}
                />
              </div>
            </div>
          </div>

          <button
            onClick={handleSubmit}
            disabled={loading}
            className="btn-primary w-full py-3 text-base"
          >
            {loading
              ? '⏳ A calcular pontos...'
              : '🏁 Submeter Resultado e Calcular Pontos'}
          </button>
        </>
      )}
    </div>
  )
}

// ============================================================
// TAB: Nova Prova
// ============================================================
function NovaProvaTab() {
  const router = useRouter()
  const [nome, setNome] = useState('')
  const [dataInicio, setDataInicio] = useState('')
  const [dataFim, setDataFim] = useState('')
  const [descricao, setDescricao] = useState('')
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [sucesso, setSucesso] = useState(false)

  const handleSubmit = async () => {
    setErro(null)
    if (!nome || !dataInicio || !dataFim) {
      return setErro('Nome e datas são obrigatórios.')
    }

    setLoading(true)
    try {
      const res = await fetch('/api/provas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome, data_inicio: dataInicio, data_fim: dataFim, descricao }),
      })
      const data = await res.json()
      if (!res.ok) return setErro(data.error)
      setSucesso(true)
      router.refresh()
      setNome('')
      setDataInicio('')
      setDataFim('')
      setDescricao('')
      setTimeout(() => setSucesso(false), 3000)
    } catch {
      setErro('Erro de rede.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="card max-w-lg space-y-4">
      <h2 className="text-lg font-semibold text-zinc-100">Criar Nova Prova</h2>

      {erro && (
        <div className="bg-red-900/30 border border-red-800 rounded-lg px-4 py-3 text-red-400 text-sm">
          ⚠️ {erro}
        </div>
      )}
      {sucesso && (
        <div className="bg-green-900/30 border border-green-800 rounded-lg px-4 py-3 text-green-400 text-sm">
          ✅ Prova criada com sucesso!
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-zinc-400 mb-1.5">Nome da Prova *</label>
        <input
          type="text"
          className="input-field"
          placeholder="ex: Tour de France 2025"
          value={nome}
          onChange={e => setNome(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-zinc-400 mb-1.5">Data Início *</label>
          <input
            type="date"
            className="input-field"
            value={dataInicio}
            onChange={e => setDataInicio(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-400 mb-1.5">Data Fim *</label>
          <input
            type="date"
            className="input-field"
            value={dataFim}
            onChange={e => setDataFim(e.target.value)}
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-zinc-400 mb-1.5">Descrição (opcional)</label>
        <textarea
          className="input-field resize-none"
          rows={2}
          placeholder="Breve descrição da prova..."
          value={descricao}
          onChange={e => setDescricao(e.target.value)}
        />
      </div>

      <button
        onClick={handleSubmit}
        disabled={loading}
        className="btn-primary w-full"
      >
        {loading ? '⏳ A criar...' : '➕ Criar Prova'}
      </button>
    </div>
  )
}
