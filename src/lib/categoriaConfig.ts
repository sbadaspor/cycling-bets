import type { CategoriaProvaTipo } from '@/types'

/**
 * Configuração de cada categoria de prova.
 *
 * - temCamisolas: se inclui camisolas (Sprint/Montanha/Juventude)
 * - numPosicoes: quantas posições o jogador aposta (Top-10 ou Top-20)
 * - multiEtapas: se aceita várias etapas ou só uma (a final)
 */
export interface ConfigCategoria {
  temCamisolas: boolean
  numPosicoes: number
  multiEtapas: boolean
  label: string
}

const CONFIGS: Record<CategoriaProvaTipo, ConfigCategoria> = {
  grande_volta: {
    temCamisolas: true,
    numPosicoes: 20,
    multiEtapas: true,
    label: 'Grande Volta',
  },
  prova_semana: {
    temCamisolas: true,
    numPosicoes: 20,
    multiEtapas: true,
    label: 'Prova de uma semana',
  },
  monumento: {
    temCamisolas: false,
    numPosicoes: 10,
    multiEtapas: false,
    label: 'Monumento',
  },
  prova_dia: {
    temCamisolas: false,
    numPosicoes: 10,
    multiEtapas: false,
    label: 'Prova de um dia',
  },
}

/**
 * Devolve a configuração para uma categoria.
 * Se a categoria for undefined (provas antigas sem categoria), usa grande_volta como default.
 */
export function getConfigCategoria(categoria?: CategoriaProvaTipo): ConfigCategoria {
  return CONFIGS[categoria ?? 'grande_volta']
}
