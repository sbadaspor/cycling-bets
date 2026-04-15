'use client'

import { useState } from 'react'
import type { Prova } from '@/types'
import ProvaDetalhesTab from './ProvaDetalhesTab'
import StartlistManager from './StartlistManager'
import EtapasManager from './EtapasManager'

interface Props {
  prova: Prova
  onBack: () => void
  onDeleted: () => void
}

type SubTab = 'detalhes' | 'startlist' | 'etapas'

export default function ProvaDetalhe({ prova, onBack, onDeleted }: Props) {
  const [subTab, setSubTab] = useState<SubTab>('detalhes')

  return (
    <div className="space-y-6">
      {/* Header com botão voltar */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <button
            onClick={onBack}
            className="text-sm text-zinc-400 hover:text-zinc-100 mb-2"
          >
            ← Voltar à lista de provas
          </button>
          <h2 className="text-2xl font-bold text-zinc-100">{prova.nome}</h2>
          <p className="text-sm text-zinc-500">
            {prova.data_inicio} → {prova.data_fim} · estado: {prova.status}
          </p>
        </div>
      </div>

      {/* Sub-tabs */}
      <div className="flex gap-1 bg-zinc-900 border border-zinc-800 rounded-xl p-1 w-fit flex-wrap">
        <button
          onClick={() => setSubTab('detalhes')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            subTab === 'detalhes' ? 'bg-amber-500 text-zinc-900' : 'text-zinc-400 hover:text-zinc-100'
          }`}
        >
          📝 Detalhes
        </button>
        <button
          onClick={() => setSubTab('startlist')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            subTab === 'startlist' ? 'bg-amber-500 text-zinc-900' : 'text-zinc-400 hover:text-zinc-100'
          }`}
        >
          📋 Startlist
        </button>
        <button
          onClick={() => setSubTab('etapas')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            subTab === 'etapas' ? 'bg-amber-500 text-zinc-900' : 'text-zinc-400 hover:text-zinc-100'
          }`}
        >
          🏁 Etapas / Resultados
        </button>
      </div>

      {/* Conteúdo */}
      {subTab === 'detalhes' && <ProvaDetalhesTab prova={prova} onDeleted={onDeleted} />}
      {subTab === 'startlist' && <StartlistManager prova={prova} />}
      {subTab === 'etapas' && <EtapasManager prova={prova} />}
    </div>
  )
}
