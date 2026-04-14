/**
 * MOTOR DE PONTUAÇÃO - Sistema de Apostas de Ciclismo
 *
 * Regras:
 * - Ciclista apostado no Top-10 que terminou no Top-10 real: 3 pts
 * - Ciclista apostado no Top-20 (fora Top-10) que terminou no Top-20 real (fora Top-10): 2 pts
 * - Ciclista apostado no Top-20 da aposta que terminou no Top-10 real: 1 pt
 * - Ciclista apostado no Top-10 que terminou no Top-20 real (fora Top-10): 0 pts
 * - Camisolas: 1 pt por acerto
 *
 * Desempate:
 * 1. Maior nº de posições exatas (total)
 * 2. Maior nº de posições exatas no Top-10
 * 3. Maior nº de posições exatas no Top-20
 * 4. Maior nº de camisolas certas
 */

import type { PontosCalculo, PontoBreakdownItem, CamisolaBreakdown } from '@/types'

export function calcularPontos(
  apostasTop20: string[],    // array de 20, índice 0 = 1º lugar apostado
  resultadoTop20: string[],  // array de 20, índice 0 = 1º lugar real
  camisolasApostadas: { sprint?: string; montanha?: string; juventude?: string },
  camisolasReais: { sprint?: string; montanha?: string; juventude?: string }
): PontosCalculo {

  const breakdown: PontoBreakdownItem[] = []

  let pontos_top10 = 0
  let pontos_top20 = 0
  let acertos_exatos = 0
  let acertos_exatos_top10 = 0
  let acertos_exatos_top20 = 0

  // Construir mapa: ciclista -> posição real (1-indexed)
  const posicaoReal = new Map<string, number>()
  resultadoTop20.forEach((ciclista, idx) => {
    if (ciclista.trim()) posicaoReal.set(ciclista.trim().toLowerCase(), idx + 1)
  })

  // Analisar cada ciclista apostado
  apostasTop20.forEach((ciclista, idx) => {
    if (!ciclista.trim()) return

    const nomeLower = ciclista.trim().toLowerCase()
    const posApostada = idx + 1   // 1-indexed
    const posReal = posicaoReal.get(nomeLower) ?? null

    let pontos = 0
    let tipo: PontoBreakdownItem['tipo'] = 'nao_top20'
    let descricao = ''

    const apostadoNoTop10 = posApostada <= 10
    const apostadoNoTop20Fora10 = posApostada > 10 && posApostada <= 20
    const realNoTop10 = posReal !== null && posReal <= 10
    const realNoTop20Fora10 = posReal !== null && posReal > 10 && posReal <= 20

    if (posReal === null) {
      // Ciclista apostado não entrou no Top-20 real
      tipo = 'nao_top20'
      pontos = 0
      descricao = 'Não entrou no Top-20'
    } else if (apostadoNoTop10 && realNoTop10) {
      // Apostado Top-10, terminou Top-10 → 3 pts
      pontos = 3
      tipo = 'top10_exato'
      descricao = `Apostado ${posApostada}º, terminou ${posReal}º (Top-10 → Top-10)`

      // Verificar posição exata
      if (posApostada === posReal) {
        acertos_exatos++
        acertos_exatos_top10++
        descricao += ' ✓ Posição Exata!'
      }
    } else if (apostadoNoTop20Fora10 && realNoTop20Fora10) {
      // Apostado 11-20, terminou 11-20 → 2 pts
      pontos = 2
      tipo = 'top20_exato'
      descricao = `Apostado ${posApostada}º, terminou ${posReal}º (Top-20 → Top-20)`

      if (posApostada === posReal) {
        acertos_exatos++
        acertos_exatos_top20++
        descricao += ' ✓ Posição Exata!'
      }
    } else if (apostadoNoTop20Fora10 && realNoTop10) {
      // Apostado 11-20, mas terminou Top-10 → 1 pt (bónus, fez melhor que o esperado)
      pontos = 1
      tipo = 'top10_bonus'
      descricao = `Apostado ${posApostada}º, terminou ${posReal}º (Top-20 → Top-10, bónus)`
    } else if (apostadoNoTop10 && realNoTop20Fora10) {
      // Apostado Top-10, terminou 11-20 → 0 pts (estava no Top-10 da aposta, saiu fora)
      pontos = 0
      tipo = 'top20_bonus'
      descricao = `Apostado ${posApostada}º, terminou ${posReal}º (Top-10 → Top-20, sem pontos)`
    } else {
      tipo = 'fora'
      pontos = 0
      descricao = `Apostado ${posApostada}º, terminou ${posReal}º (fora da pontuação)`
    }

    if (apostadoNoTop10) {
      pontos_top10 += pontos
    } else {
      pontos_top20 += pontos
    }

    breakdown.push({
      ciclista: ciclista.trim(),
      posicao_apostada: posApostada,
      posicao_real: posReal,
      pontos,
      tipo,
      descricao,
    })
  })

  // Calcular pontos de camisolas
  const camisolaBreakdowns = calcularCamisolas(camisolasApostadas, camisolasReais)
  const pontos_camisolas = camisolaBreakdowns.reduce((sum, c) => sum + c.pontos, 0)
  acertos_camisolas = camisolaBreakdowns.filter(c => c.acertou).length

  const pontos_total = pontos_top10 + pontos_top20 + pontos_camisolas

  return {
    pontos_total,
    pontos_top10,
    pontos_top20,
    pontos_camisolas,
    acertos_exatos,
    acertos_exatos_top10,
    acertos_exatos_top20,
    acertos_camisolas,
    breakdown,
  }
}

let acertos_camisolas = 0 // reset a cada chamada de calcularPontos

export function calcularCamisolas(
  apostadas: { sprint?: string; montanha?: string; juventude?: string },
  reais: { sprint?: string; montanha?: string; juventude?: string }
): CamisolaBreakdown[] {
  const tipos = [
    { tipo: 'sprint' as const, label: 'Sprint' },
    { tipo: 'montanha' as const, label: 'Montanha' },
    { tipo: 'juventude' as const, label: 'Juventude' },
  ]

  return tipos.map(({ tipo }) => {
    const apostado = apostadas[tipo] ?? ''
    const real = reais[tipo] ?? ''
    const acertou = apostado.trim().toLowerCase() === real.trim().toLowerCase() && apostado.trim() !== ''

    return {
      tipo,
      apostado: apostado.trim(),
      real: real.trim(),
      acertou,
      pontos: acertou ? 1 : 0,
    }
  })
}

/**
 * Comparador de desempate para leaderboard
 * Retorna número negativo se a > b (a melhor posição)
 */
export function compararDesempate(
  a: {
    pontos_total: number
    acertos_exatos: number
    acertos_exatos_top10: number
    acertos_exatos_top20: number
    acertos_camisolas: number
  },
  b: {
    pontos_total: number
    acertos_exatos: number
    acertos_exatos_top10: number
    acertos_exatos_top20: number
    acertos_camisolas: number
  }
): number {
  if (b.pontos_total !== a.pontos_total) return b.pontos_total - a.pontos_total
  if (b.acertos_exatos !== a.acertos_exatos) return b.acertos_exatos - a.acertos_exatos
  if (b.acertos_exatos_top10 !== a.acertos_exatos_top10) return b.acertos_exatos_top10 - a.acertos_exatos_top10
  if (b.acertos_exatos_top20 !== a.acertos_exatos_top20) return b.acertos_exatos_top20 - a.acertos_exatos_top20
  return b.acertos_camisolas - a.acertos_camisolas
}

/**
 * Formata pontos com indicação de tipo
 */
export function getPontoTipoLabel(tipo: PontoBreakdownItem['tipo']): string {
  const labels: Record<PontoBreakdownItem['tipo'], string> = {
    top10_exato: '3 pts',
    top20_exato: '2 pts',
    top10_bonus: '1 pt',
    top20_bonus: '0 pts',
    fora: '0 pts',
    nao_top20: '0 pts',
  }
  return labels[tipo]
}

export function getPontoTipoCor(tipo: PontoBreakdownItem['tipo']): string {
  const cores: Record<PontoBreakdownItem['tipo'], string> = {
    top10_exato: 'text-emerald-400',
    top20_exato: 'text-green-400',
    top10_bonus: 'text-yellow-400',
    top20_bonus: 'text-slate-400',
    fora: 'text-slate-500',
    nao_top20: 'text-slate-600',
  }
  return cores[tipo]
}
