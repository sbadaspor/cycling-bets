'use client'

import { useEffect } from 'react'
import type { CategoriaProvaTipo } from '@/types'

interface Props {
  categoria?: CategoriaProvaTipo
  nomeProva?: string
}

// Detecta Grande Volta pelo nome
function detectarGrandeVolta(nome: string): 'giro' | 'tour' | 'vuelta' | null {
  const n = nome.toLowerCase()
  if (n.includes('giro')) return 'giro'
  if (n.includes('tour de france') || n.includes('tour france')) return 'tour'
  if (n.includes('vuelta')) return 'vuelta'
  return null
}

const TEMAS = {
  grande_volta: { accent: '#c8f400', glow: 'rgba(200,244,0,0.15)', label: 'Grande Volta' },
  prova_semana: { accent: '#4488ff', glow: 'rgba(68,136,255,0.15)', label: 'Prova da Semana' },
  monumento:    { accent: '#ff9500', glow: 'rgba(255,149,0,0.15)',  label: 'Monumento' },
  prova_dia:    { accent: '#44cc88', glow: 'rgba(68,204,136,0.15)', label: 'Prova de um dia' },
}

const TEMAS_GT = {
  giro:   { accent: '#ff6b6b', glow: 'rgba(255,107,107,0.12)', pattern: '🇮🇹' },
  tour:   { accent: '#4488ff', glow: 'rgba(68,136,255,0.12)',  pattern: '🇫🇷' },
  vuelta: { accent: '#ff4444', glow: 'rgba(255,68,68,0.12)',   pattern: '🇪🇸' },
}

export default function DynamicTheme({ categoria, nomeProva }: Props) {
  useEffect(() => {
    const root = document.documentElement

    // Verificar se é Grande Volta com tema especial
    if (nomeProva) {
      const gt = detectarGrandeVolta(nomeProva)
      if (gt && TEMAS_GT[gt]) {
        const tema = TEMAS_GT[gt]
        root.style.setProperty('--lime', tema.accent)
        root.style.setProperty('--lime-glow', tema.glow)
        return () => {
          root.style.removeProperty('--lime')
          root.style.removeProperty('--lime-glow')
        }
      }
    }

    // Tema por categoria
    if (categoria && TEMAS[categoria]) {
      const tema = TEMAS[categoria]
      root.style.setProperty('--lime', tema.accent)
      root.style.setProperty('--lime-glow', tema.glow)
      return () => {
        root.style.removeProperty('--lime')
        root.style.removeProperty('--lime-glow')
      }
    }
  }, [categoria, nomeProva])

  return null
}
