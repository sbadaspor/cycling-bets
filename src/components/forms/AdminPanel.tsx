'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { Prova } from '@/types'
import StartlistManager from './StartlistManager'
import EtapasManager from './EtapasManager'

interface Props {
  provas: Prova[]
}

export function AdminPanel({ provas }: Props) {
  const [tab, setTab] = useState<'etapas' | 'provas' | 'startlist'>('etapas')

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="flex gap-1 bg-zinc-900 border border-zinc-800 rounded-xl p-1 w-fit flex-wrap">
        <button
          onClick={() => setTab('etapas')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            tab === 'etapas'
              ? 'bg-amber-500 text-zinc-900'
              : 'text-zinc-400 hover:text-zinc-100'
          }`}
        >
          🏁 Etapas / Resultados
        </button>
        <button
          onClick={() => setTab('startlist')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            tab === 'startlist'
              ? 'bg-amber-500 text-zinc-900'
              : 'text-zinc-400 hover:text-zinc-100'
          }`}
        >
          📋 Startlist
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

      {tab === 'etapas' && <EtapasManager provas={provas} />}
      {tab === 'startlist' && <StartlistManager provas={provas} />}
      {tab === 'provas' && <NovaProvaTab />}
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
