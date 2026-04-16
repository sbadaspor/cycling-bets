/**
 * MOTOR DE PONTUAÇÃO - Sistema de Apostas de Ciclismo
 *
 * Regras para Top-20 (Grande Volta, Prova de uma semana):
 * - Apostado Top-10 + Real Top-10 → 3 pts
 * - Apostado 11-20 + Real 11-20 → 2 pts
 * - Apostado 11-20 + Real Top-10 → 1 pt (bónus)
 * - Apostado Top-10 + Real 11-20 → 0 pts
 *
 * Regras para Top-10 (Monumento, Prova de um dia):
 * - Apostado Top-5 + Real Top-5 → 3 pts
 * - Apostado 6-10 + Real 6-10 → 2 pts
 * - Apostado 6-10 + Real Top-5 → 1 pt (bónus)
 * - Apostado Top-5 + Real 6-10 → 0 pts
 *
 * Camisolas: 1 pt por acerto (só grande volta / prova semana)
 *
 * Desempate:
 * 1. Maior nº de posições exatas (total)
 * 2. Maior nº de posições exatas no "top alto"
 * 3. Maior nº de posições exatas no "top baixo"
 * 4. Maior nº de camisolas certas
 */

import type { PontosCalculo, PontoBreakdownItem, CamisolaBreakdown, CategoriaProvaTipo } from '@/types'
import { getConfigCategoria } from '@/lib/categoriaConfig'

export function calcularPontos(
  apostasTopN: string[],
  resultadoTopN: string[],
  camisolasApostadas: { sprint?: string; montanha?: string; juventude?: string },
  camisolasReais: { sprint?: string; montanha?: string; juventude?: string },
  categoria?: CategoriaProvaTipo
): PontosCalculo {
  const config = getConfigCategoria(categoria)
  const numPos = config.numPosicoes
  const topAlto = numPos === 20 ? 10 : 5   // Top-10 para grande volta, Top-5 para prova de dia
  const topBaixo = numPos === 20 ? 20 : 10

  const breakdown: PontoBreakdownItem[] = []
  let pontos_top10 = 0
  let pontos_top20 = 0
  let acertos_exatos = 0
  let acertos_exatos_top10 = 0
  let acertos_exatos_top20 = 0

  // Mapa: ciclista (lower) -> posição real (1-indexed)
  const posicaoReal = new Map<string, number>()
  resultadoTopN.forEach((ciclista, idx) => {
    if (ciclista && ciclista.trim()) posicaoReal.set(ciclista.trim().toLowerCase(), idx + 1)
  })

  apostasTopN.forEach((ciclista, idx) => {
    if (!ciclista || !ciclista.trim()) return
    if (idx >= numPos) return  // ignora posições além do que a categoria prevê

    const nomeLower = ciclista.trim().toLowerCase()
    const posApostada = idx + 1
    const posReal = posicaoReal.get(nomeLower) ?? null

    let pontos = 0
    let tipo: PontoBreakdownItem['tipo'] = 'nao_top20'
    let descricao = ''

    const apostadoNoAlto = posApostada <= topAlto
    const apostadoNoBaixoFora = posApostada > topAlto && posApostada <= topBaixo
    const realNoAlto = posReal !== null && posReal <= topAlto
    const realNoBaixoFora = posReal !== null && posReal > topAlto && posReal <= topBaixo

    if (posReal === null) {
      tipo = 'nao_top20'
      pontos = 0
      descricao = `Não entrou no Top-${topBaixo}`
    } else if (apostadoNoAlto && realNoAlto) {
      pontos = 3
      tipo = 'top10_exato'
      descricao = `Apostado ${posApostada}º, terminou ${posReal}º`
      if (posApostada === posReal) {
        acertos_exatos++
        acertos_exatos_top10++
        descricao += ' ✓ Posição Exata!'
      }
    } else if (apostadoNoBaixoFora && realNoBaixoFora) {
      pontos = 2
      tipo = 'top20_exato'
      descricao = `Apostado ${posApostada}º, terminou ${posReal}º`
      if (posApostada === posReal) {
        acertos_exatos++
        acertos_exatos_top20++
        descricao += ' ✓ Posição Exata!'
      }
    } else if (apostadoNoBaixoFora && realNoAlto) {
      pontos = 1
      tipo = 'top10_bonus'
      descricao = `Apostado ${posApostada}º, terminou ${posReal}º (bónus)`
    } else if (apostadoNoAlto && realNoBaixoFora) {
      pontos = 0
      tipo = 'top20_bonus'
      descricao = `Apostado ${posApostada}º, terminou ${posReal}º (sem pontos)`
    } else {
      tipo = 'fora'
      pontos = 0
      descricao = `Apostado ${posApostada}º, terminou ${posReal}º`
    }

    if (apostadoNoAlto) {
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

  const camisolaBreakdowns = config.temCamisolas
    ? calcularCamisolas(camisolasApostadas, camisolasReais)
    : []
  const pontos_camisolas = camisolaBreakdowns.reduce((sum, c) => sum + c.pontos, 0)
  const acertos_camisolas = camisolaBreakdowns.filter(c => c.acertou).length

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

export function calcularCamisolas(
  apostadas: { sprint?: string; montanha?: string; juventude?: string },
  reais: { sprint?: string; montanha?: string; juventude?: string }
): CamisolaBreakdown[] {
  const tipos = [
    { tipo: 'sprint' as const },
    { tipo: 'montanha' as const },
    { tipo: 'juventude' as const },
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
