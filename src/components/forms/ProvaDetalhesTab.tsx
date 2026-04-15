'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { CategoriaProvaTipo, Prova } from '@/types'

interface Props {
  prova: Prova
  onDeleted: () => void
}

const CATEGORIAS: { value: CategoriaProvaTipo; label: string }[] = [
  { value: 'grande_volta', label: 'Grande Volta' },
  { value: 'prova_semana', label: 'Prova de uma semana' },
  { value: 'monumento', label: 'Monumento' },
  { value: 'prova_dia', label: 'Prova de um dia' },
]

export default function ProvaDetalhesTab({ prova, onDeleted }: Props) {
  const router = useRouter()
  const [nome, setNome] = useState(prova.nome)
  const [dataInicio, setDataInicio] = useState(prova.data_inicio)
  const [dataFim, setDataFim] = useState(prova.data_fim)
  const [categoria, setCategoria] = useState<CategoriaProvaTipo | ''>(prova.categoria ?? '')
  const [descricao, setDescricao] = useState(prova.descricao ?? '')
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [sucesso, setSucesso] = useState<string | null>(null)

  // Apagar
  const [confirmarOpen, setConfirmarOpen] = useState(false)
  const [confirmacaoNome, setConfirmacaoNome] = useState('')
  const [apagando, setApagando] = useState(false)

  async function guardar() {
    setErro(null)
    setSucesso(null)
    if (!nome.trim() || !dataInicio || !dataFim) {
      setErro('Nome e datas são obrigatórios.')
      return
    }
    if (new Date(dataInicio) > new Date(dataFim)) {
      setErro('Data de início não pode ser posterior à data de fim.')
      return
    }

    setLoading(true)
    try {
      const payload: Record<string, unknown> = {
        nome: nome.trim(),
        data_inicio: dataInicio,
        data_fim: dataFim,
        descricao,
      }
      if (categoria) payload.categoria = categoria

      const res = await fetch(`/api/provas/${prova.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erro ao guardar')
      setSucesso('✅ Prova atualizada.')
      router.refresh()
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro desconhecido')
    } finally {
      setLoading(false)
    }
  }

  async function apagar() {
    setErro(null)
    setApagando(true)
    try {
      const res = await fetch(`/api/provas/${prova.id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirmacao_nome: confirmacaoNome.trim() }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erro ao apagar')
      router.refresh()
      onDeleted()
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro desconhecido')
      setApagando(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="card max-w-2xl space-y-4">
        <h2 className="text-lg font-semibold text-zinc-100">📝 Editar detalhes da prova</h2>

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

        <div>
          <label className="block text-sm font-medium text-zinc-400 mb-1.5">Nome da Prova *</label>
          <input
            type="text"
            className="input-field"
            value={nome}
            onChange={e => setNome(e.target.value)}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-400 mb-1.5">Categoria</label>
          <select
            className="input-field"
            value={categoria}
            onChange={e => setCategoria(e.target.value as CategoriaProvaTipo | '')}
          >
            <option value="">— sem categoria —</option>
            {CATEGORIAS.map(c => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
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
          <label className="block text-sm font-medium text-zinc-400 mb-1.5">Descrição</label>
          <textarea
            className="input-field resize-none"
            rows={2}
            value={descricao}
            onChange={e => setDescricao(e.target.value)}
          />
        </div>

        <div className="text-xs text-zinc-500">
          Estado atual: <span className="text-zinc-300 font-medium">{prova.status}</span>
          {prova.status === 'finalizada' && (
            <span className="ml-2">(definido automaticamente quando a etapa final é guardada)</span>
          )}
        </div>

        <button
          onClick={guardar}
          disabled={loading}
          className="btn-primary"
        >
          {loading ? '⏳ A guardar...' : '💾 Guardar alterações'}
        </button>
      </div>

      {/* Zona perigosa */}
      <div className="card max-w-2xl border-red-900/50 bg-red-950/20 space-y-3">
        <h2 className="text-lg font-semibold text-red-300">⚠️ Zona perigosa</h2>
        <p className="text-sm text-red-200/80">
          Apagar a prova remove definitivamente: a startlist, todas as etapas, todas as apostas dos jogadores e os resultados. Esta ação <strong>não pode ser desfeita</strong>.
        </p>

        {!confirmarOpen ? (
          <button
            onClick={() => {
              setConfirmarOpen(true)
              setConfirmacaoNome('')
            }}
            className="px-4 py-2 rounded-md bg-red-900/50 text-red-200 hover:bg-red-900/70 text-sm"
          >
            🗑️ Apagar prova
          </button>
        ) : (
          <div className="space-y-3 rounded-md border border-red-800/50 bg-red-950/40 p-3">
            <p className="text-sm text-red-200">
              Para confirmar, escreve exatamente o nome da prova:
            </p>
            <p className="font-mono text-sm bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-zinc-300 inline-block">
              {prova.nome}
            </p>
            <input
              type="text"
              className="input-field"
              placeholder="Escreve aqui o nome da prova..."
              value={confirmacaoNome}
              onChange={e => setConfirmacaoNome(e.target.value)}
              disabled={apagando}
            />
            <div className="flex gap-2">
              <button
                onClick={apagar}
                disabled={apagando || confirmacaoNome.trim() !== prova.nome}
                className="px-4 py-2 rounded-md bg-red-700 text-white hover:bg-red-600 disabled:opacity-40 disabled:cursor-not-allowed text-sm"
              >
                {apagando ? '⏳ A apagar...' : '🗑️ Apagar definitivamente'}
              </button>
              <button
                onClick={() => {
                  setConfirmarOpen(false)
                  setConfirmacaoNome('')
                  setErro(null)
                }}
                disabled={apagando}
                className="px-4 py-2 rounded-md bg-zinc-700 text-zinc-200 hover:bg-zinc-600 text-sm"
              >
                Cancelar
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
