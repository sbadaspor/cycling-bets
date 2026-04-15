'use client'

import { useState, useEffect } from 'react'
import type { Prova } from '@/types'
import ProvasList from './ProvasList'
import ProvaDetalhe from './ProvaDetalhe'

interface Props {
  provas: Prova[]
}

export function AdminPanel({ provas }: Props) {
  const [provaSelecionadaId, setProvaSelecionadaId] = useState<string | null>(null)

  const provaSelecionada = provaSelecionadaId
    ? provas.find(p => p.id === provaSelecionadaId) ?? null
    : null

  // Se a prova selecionada deixou de existir (foi apagada), voltar à lista
  useEffect(() => {
    if (provaSelecionadaId && !provas.find(p => p.id === provaSelecionadaId)) {
      setProvaSelecionadaId(null)
    }
  }, [provas, provaSelecionadaId])

  if (provaSelecionada) {
    return (
      <ProvaDetalhe
        prova={provaSelecionada}
        onVoltar={() => setProvaSelecionadaId(null)}
      />
    )
  }

  return (
    <ProvasList
      provas={provas}
      onSelecionar={(p) => setProvaSelecionadaId(p.id)}
    />
  )
}
