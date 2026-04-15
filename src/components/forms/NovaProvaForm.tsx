'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Props {
  onCreated?: () => void
  onCancel?: () => void
}

export default function NovaProvaForm({ onCreated, onCancel }: Props) {
  const router = useRouter()
  const [nome, setNome] = useState('')
  const [dataInicio, setDataInicio] = useState('')
  const [dataFim, setDataFim] = useState('')
  const [descricao, setDescricao] = useState('')
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  async function handleSubmit() {
    setErro(null)
    if (!nome || !dataInicio || !dataFim) {
      return setErro('Nome e datas são obrigatórios.')
    }
    if (new Date(dataInicio) > new Date(dataFim)) {
      return setErro('Data de início não pode ser posterior à data de fim.')
    }

    setLoading(true)
    try {
      const res = await fetch('/api/provas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome, data_inicio: dataInicio, data_fim: dataFim, descricao }),
      })
      const data = await res.json()
      if (!res.ok) {
        setErro(data.error || 'Erro ao criar')
        return
      }
      router.refresh()
      onCreated?.()
    } catch {
      setErro('Erro de rede.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="card max-w-lg space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-zinc-100">➕ Criar Nova Prova</h2>
        {onCancel && (
          <button
            onClick={onCancel}
            className="text-sm text-zinc-400 hover:text-zinc-100"
          >
            ✕ Cancelar
          </button>
        )}
      </div>

      {erro && (
        <div className="bg-red-900/30 border border-red-800 rounded-lg px-4 py-3 text-red-400 text-sm">
          ⚠️ {erro}
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-zinc-400 mb-1.5">Nome da Prova *</label>
        <input
          type="text"
          className="input-field"
          placeholder="ex: Tour de France 2026"
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
