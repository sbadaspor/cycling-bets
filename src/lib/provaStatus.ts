import type { Prova } from '@/types'

export type CategoriaProva = 'a_decorrer' | 'futura' | 'finalizada'

export interface ProvaCategorizada extends Prova {
  estado: CategoriaProva    // renomeado de "categoria" para "estado"
  diasAteInicio: number
}

/**
 * Categoriza uma prova com base na data atual e no seu status.
 */
export function categorizarProva(prova: Prova): ProvaCategorizada {
  const hoje = new Date()
  hoje.setHours(0, 0, 0, 0)
  const inicio = new Date(prova.data_inicio)
  inicio.setHours(0, 0, 0, 0)

  const diffMs = inicio.getTime() - hoje.getTime()
  const diasAteInicio = Math.round(diffMs / (1000 * 60 * 60 * 24))

  let estado: CategoriaProva
  if (prova.status === 'finalizada') {
    estado = 'finalizada'
  } else if (hoje < inicio) {
    estado = 'futura'
  } else {
    estado = 'a_decorrer'
  }

  return { ...prova, estado, diasAteInicio }
}

/**
 * Comparador para ordenar provas:
 * 1. A decorrer primeiro
 * 2. Depois futuras (mais próximas primeiro)
 * 3. Por último finalizadas (mais recentes primeiro)
 */
export function compararProvas(a: ProvaCategorizada, b: ProvaCategorizada): number {
  const ordem: Record<CategoriaProva, number> = {
    a_decorrer: 0,
    futura: 1,
    finalizada: 2,
  }
  if (a.estado !== b.estado) {
    return ordem[a.estado] - ordem[b.estado]
  }
  if (a.estado === 'futura') {
    return a.diasAteInicio - b.diasAteInicio
  }
  if (a.estado === 'finalizada') {
    return new Date(b.data_fim).getTime() - new Date(a.data_fim).getTime()
  }
  return new Date(b.data_inicio).getTime() - new Date(a.data_inicio).getTime()
}

/**
 * Diz se uma prova ainda permite apostar.
 */
export function podeApostar(prova: Prova): boolean {
  if (prova.status === 'finalizada') return false
  const cat = categorizarProva(prova)
  return cat.estado === 'futura'
}
