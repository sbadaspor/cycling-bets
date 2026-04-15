import type { Prova } from '@/types'

export type CategoriaProva = 'a_decorrer' | 'futura' | 'finalizada'

export interface ProvaCategorizada extends Prova {
  categoria: CategoriaProva
  diasAteInicio: number  // negativo se já começou
}

/**
 * Categoriza uma prova com base na data atual e no seu status.
 * - finalizada: status = 'finalizada'
 * - a_decorrer: data atual >= data_inicio e prova não finalizada
 * - futura: data atual < data_inicio
 */
export function categorizarProva(prova: Prova): ProvaCategorizada {
  const hoje = new Date()
  hoje.setHours(0, 0, 0, 0)
  const inicio = new Date(prova.data_inicio)
  inicio.setHours(0, 0, 0, 0)

  const diffMs = inicio.getTime() - hoje.getTime()
  const diasAteInicio = Math.round(diffMs / (1000 * 60 * 60 * 24))

  let categoria: CategoriaProva
  if (prova.status === 'finalizada') {
    categoria = 'finalizada'
  } else if (hoje < inicio) {
    categoria = 'futura'
  } else {
    categoria = 'a_decorrer'
  }

  return { ...prova, categoria, diasAteInicio }
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
  if (a.categoria !== b.categoria) {
    return ordem[a.categoria] - ordem[b.categoria]
  }
  if (a.categoria === 'futura') {
    return a.diasAteInicio - b.diasAteInicio
  }
  if (a.categoria === 'finalizada') {
    return new Date(b.data_fim).getTime() - new Date(a.data_fim).getTime()
  }
  // a_decorrer: mais recentes primeiro
  return new Date(b.data_inicio).getTime() - new Date(a.data_inicio).getTime()
}

/**
 * Diz se uma prova ainda permite apostar.
 * Regra: só provas futuras (data_inicio > hoje) e que ainda não estão finalizadas.
 */
export function podeApostar(prova: Prova): boolean {
  if (prova.status === 'finalizada') return false
  const cat = categorizarProva(prova)
  return cat.categoria === 'futura'
}
