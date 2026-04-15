'use client'

import { useState } from 'react'
import type { Prova } from '@/types'
import ProvasList from './ProvasList'
import ProvaDetalhe from './ProvaDetalhe'

interface Props {
  provas: Prova[]
}

export function AdminPanel({ provas }: Props) {
  const [provaSelecionada, setProvaSelecionada] = useState<Prova | null>(null)

  // Quando a lista de provas muda (ex.: depois de apagar/criar/editar),
  // se a selecionada já não existe, voltar à lista
  if (provaSelecionada && !provas.find(p => p.id === provaSelecionada.id)) {
    setProvaSelecionada(null)
  }

  // Se houver uma selecionada, atualizar com os dados frescos da lista
  const provaAtual = provaSelecionada
    ? provas.find(p => p.id === provaSelecionada.id) ?? null
    : null

  return (
    <div className="space-y-6">
      {!provaAtual ? (
        <ProvasList provas={provas} onSelect={setProvaSelecionada} />
      ) : (
        <ProvaDetalhe
          prova={provaAtual}
          onBack={() => setProvaSelecionada(null)}
          onDeleted={() => setProvaSelecionada(null)}
        />
      )}
    </div>
  )
}
