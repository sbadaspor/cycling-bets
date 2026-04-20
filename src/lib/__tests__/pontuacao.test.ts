import { describe, it, expect } from 'vitest'
import {
  calcularPontos,
  calcularCamisolas,
  compararDesempate,
} from '../pontuacao'

// ── Helpers ────────────────────────────────────────────────────────────────

/** Cria um array de 20 nomes: os primeiros N são os fornecidos, o resto fica vazio */
function top20(...nomes: string[]): string[] {
  return [...nomes, ...Array(20 - nomes.length).fill('')]
}

const SEM_CAMISOLAS = { sprint: '', montanha: '', juventude: '' }

// ── Grande Volta ───────────────────────────────────────────────────────────

describe('calcularPontos — grande_volta', () => {
  it('ciclista apostado top-10 E termina top-10 → 3 pts', () => {
    const aposta    = top20('Pogacar', 'Vingegaard')
    const resultado = top20('Pogacar', 'Vingegaard')
    const r = calcularPontos(aposta, resultado, SEM_CAMISOLAS, SEM_CAMISOLAS, 'grande_volta')
    expect(r.pontos_total).toBe(6)
    expect(r.pontos_top10).toBe(6)
  })

  it('ciclista apostado 11-20 E termina 11-20 → 2 pts', () => {
    const aposta    = top20(...Array(10).fill('X'), 'Carapaz')
    const resultado = top20(...Array(10).fill('X'), 'Carapaz')
    const r = calcularPontos(aposta, resultado, SEM_CAMISOLAS, SEM_CAMISOLAS, 'grande_volta')
    // 10 ciclistas X no top-10 + Carapaz no 11º
    expect(r.pontos_top20).toBe(2)
  })

  it('apostado 11-20 mas termina top-10 → 1 pt (bónus)', () => {
    const aposta    = top20(...Array(10).fill('X'), 'Carapaz')
    const resultado = top20('Carapaz', ...Array(10).fill('X'))
    const r = calcularPontos(aposta, resultado, SEM_CAMISOLAS, SEM_CAMISOLAS, 'grande_volta')
    expect(r.pontos_top20).toBe(1)
    const item = r.breakdown.find(b => b.ciclista === 'Carapaz')
    expect(item?.tipo).toBe('top10_bonus')
  })

  it('apostado top-10 mas termina 11-20 → 0 pts', () => {
    const aposta    = top20('Carapaz')
    const resultado = top20(...Array(10).fill('X'), 'Carapaz')
    const r = calcularPontos(aposta, resultado, SEM_CAMISOLAS, SEM_CAMISOLAS, 'grande_volta')
    expect(r.pontos_top10).toBe(0)
    const item = r.breakdown.find(b => b.ciclista === 'Carapaz')
    expect(item?.tipo).toBe('top20_bonus')
    expect(item?.pontos).toBe(0)
  })

  it('ciclista fora do top-20 → 0 pts', () => {
    const aposta    = top20('Desconhecido')
    const resultado = top20('Pogacar')
    const r = calcularPontos(aposta, resultado, SEM_CAMISOLAS, SEM_CAMISOLAS, 'grande_volta')
    expect(r.pontos_total).toBe(0)
    expect(r.breakdown[0].tipo).toBe('nao_top20')
  })

  it('posição exata no top-10 conta como acerto exato', () => {
    const aposta    = top20('Pogacar')
    const resultado = top20('Pogacar')
    const r = calcularPontos(aposta, resultado, SEM_CAMISOLAS, SEM_CAMISOLAS, 'grande_volta')
    expect(r.acertos_exatos).toBe(1)
    expect(r.acertos_exatos_top10).toBe(1)
    expect(r.acertos_exatos_top20).toBe(0)
  })

  it('posição exata no 11-20 conta como acerto exato top-20', () => {
    // Usar nomes únicos para top-10 em ordem inversa (sem acertos exatos no top-10)
    // e Carapaz exactamente na posição 11
    const top10 = Array.from({ length: 10 }, (_, i) => `Ciclista${i}`)
    const aposta    = top20(...top10, 'Carapaz')
    const resultado = top20(...[...top10].reverse(), 'Carapaz')
    const r = calcularPontos(aposta, resultado, SEM_CAMISOLAS, SEM_CAMISOLAS, 'grande_volta')
    expect(r.acertos_exatos).toBe(1)
    expect(r.acertos_exatos_top20).toBe(1)
    expect(r.acertos_exatos_top10).toBe(0)
  })

  it('comparação de nomes é case-insensitive', () => {
    const aposta    = top20('POGACAR')
    const resultado = top20('pogacar')
    const r = calcularPontos(aposta, resultado, SEM_CAMISOLAS, SEM_CAMISOLAS, 'grande_volta')
    expect(r.pontos_total).toBe(3)
  })

  it('espaços extra nos nomes são ignorados', () => {
    const aposta    = top20('  Pogacar  ')
    const resultado = top20('Pogacar')
    const r = calcularPontos(aposta, resultado, SEM_CAMISOLAS, SEM_CAMISOLAS, 'grande_volta')
    expect(r.pontos_total).toBe(3)
  })

  it('posições vazias não contam', () => {
    const aposta    = top20('Pogacar', '')
    const resultado = top20('Pogacar')
    const r = calcularPontos(aposta, resultado, SEM_CAMISOLAS, SEM_CAMISOLAS, 'grande_volta')
    expect(r.breakdown.filter(b => b.ciclista === '').length).toBe(0)
  })
})

// ── Monumento / Prova de um dia ────────────────────────────────────────────

describe('calcularPontos — monumento', () => {
  it('ciclista no top-10 → 1 pt', () => {
    const aposta    = top20('Van Aert')
    const resultado = top20('Alaphilippe', 'Van Aert')
    const r = calcularPontos(aposta, resultado, SEM_CAMISOLAS, SEM_CAMISOLAS, 'monumento')
    expect(r.pontos_total).toBe(1)
    expect(r.pontos_top10).toBe(1)
  })

  it('posição exata → 2 pts', () => {
    const aposta    = top20('Van Aert')
    const resultado = top20('Van Aert')
    const r = calcularPontos(aposta, resultado, SEM_CAMISOLAS, SEM_CAMISOLAS, 'monumento')
    expect(r.pontos_total).toBe(2)
    expect(r.acertos_exatos).toBe(1)
  })

  it('ciclista fora do top-10 → 0 pts', () => {
    const aposta    = top20('Ninguem')
    const resultado = top20('Van Aert')
    const r = calcularPontos(aposta, resultado, SEM_CAMISOLAS, SEM_CAMISOLAS, 'monumento')
    expect(r.pontos_total).toBe(0)
  })

  it('não tem camisolas', () => {
    const camisolasApostadas = { sprint: 'Van Aert', montanha: 'Van Aert', juventude: 'Van Aert' }
    const camisolasReais     = { sprint: 'Van Aert', montanha: 'Van Aert', juventude: 'Van Aert' }
    const r = calcularPontos(top20(), top20(), camisolasApostadas, camisolasReais, 'monumento')
    expect(r.pontos_camisolas).toBe(0)
  })
})

// ── Prova de uma semana ────────────────────────────────────────────────────

describe('calcularPontos — prova_semana', () => {
  it('comporta-se como grande_volta (top-20 com camisolas)', () => {
    const aposta    = top20('Roglic')
    const resultado = top20('Roglic')
    const r = calcularPontos(aposta, resultado, SEM_CAMISOLAS, SEM_CAMISOLAS, 'prova_semana')
    expect(r.pontos_total).toBe(3)
  })
})

// ── Camisolas ──────────────────────────────────────────────────────────────

describe('calcularCamisolas', () => {
  it('acerto em todas as camisolas → 3 pts', () => {
    const apostadas = { sprint: 'Cavendish', montanha: 'Bardet', juventude: 'Evenepoel' }
    const reais     = { sprint: 'Cavendish', montanha: 'Bardet', juventude: 'Evenepoel' }
    const r = calcularCamisolas(apostadas, reais)
    expect(r.every(c => c.acertou)).toBe(true)
    expect(r.reduce((s, c) => s + c.pontos, 0)).toBe(3)
  })

  it('zero acertos → 0 pts', () => {
    const apostadas = { sprint: 'A', montanha: 'B', juventude: 'C' }
    const reais     = { sprint: 'X', montanha: 'Y', juventude: 'Z' }
    const r = calcularCamisolas(apostadas, reais)
    expect(r.every(c => !c.acertou)).toBe(true)
    expect(r.reduce((s, c) => s + c.pontos, 0)).toBe(0)
  })

  it('camisolas em branco não contam como acerto', () => {
    const r = calcularCamisolas(SEM_CAMISOLAS, SEM_CAMISOLAS)
    expect(r.every(c => !c.acertou)).toBe(true)
  })

  it('comparação é case-insensitive', () => {
    const apostadas = { sprint: 'CAVENDISH', montanha: '', juventude: '' }
    const reais     = { sprint: 'cavendish', montanha: '', juventude: '' }
    const r = calcularCamisolas(apostadas, reais)
    expect(r.find(c => c.tipo === 'sprint')?.acertou).toBe(true)
  })

  it('camisolas integradas em calcularPontos', () => {
    const apostadas = { sprint: 'Cavendish', montanha: 'Bardet', juventude: 'Evenepoel' }
    const reais     = { sprint: 'Cavendish', montanha: 'Ninguem', juventude: 'Evenepoel' }
    const r = calcularPontos(top20(), top20(), apostadas, reais, 'grande_volta')
    expect(r.pontos_camisolas).toBe(2)
    expect(r.acertos_camisolas).toBe(2)
  })
})

// ── Desempate ──────────────────────────────────────────────────────────────

describe('compararDesempate', () => {
  const base = { pontos_total: 0, acertos_exatos: 0, acertos_exatos_top10: 0, acertos_exatos_top20: 0, acertos_camisolas: 0 }

  it('mais pontos vence', () => {
    const a = { ...base, pontos_total: 20 }
    const b = { ...base, pontos_total: 15 }
    expect(compararDesempate(a, b)).toBeLessThan(0)
  })

  it('empate em pontos → mais acertos exatos totais vence', () => {
    const a = { ...base, pontos_total: 10, acertos_exatos: 3 }
    const b = { ...base, pontos_total: 10, acertos_exatos: 2 }
    expect(compararDesempate(a, b)).toBeLessThan(0)
  })

  it('empate em acertos exatos → mais acertos no top-10 vence', () => {
    const a = { ...base, pontos_total: 10, acertos_exatos: 2, acertos_exatos_top10: 2 }
    const b = { ...base, pontos_total: 10, acertos_exatos: 2, acertos_exatos_top10: 1 }
    expect(compararDesempate(a, b)).toBeLessThan(0)
  })

  it('empate no top-10 → mais acertos no top-20 vence', () => {
    const a = { ...base, pontos_total: 10, acertos_exatos: 2, acertos_exatos_top10: 1, acertos_exatos_top20: 1 }
    const b = { ...base, pontos_total: 10, acertos_exatos: 2, acertos_exatos_top10: 1, acertos_exatos_top20: 0 }
    expect(compararDesempate(a, b)).toBeLessThan(0)
  })

  it('empate total → mais camisolas certas vence', () => {
    const a = { ...base, pontos_total: 10, acertos_camisolas: 2 }
    const b = { ...base, pontos_total: 10, acertos_camisolas: 1 }
    expect(compararDesempate(a, b)).toBeLessThan(0)
  })

  it('empate absoluto → 0', () => {
    expect(compararDesempate(base, base)).toBe(0)
  })
})

// ── Cenários completos ─────────────────────────────────────────────────────

describe('cenários completos', () => {
  it('aposta perfeita numa grande volta → pontuação máxima', () => {
    const ciclistas = Array.from({ length: 20 }, (_, i) => `Ciclista${i + 1}`)
    const camisolas = { sprint: 'Sprinter', montanha: 'Escalador', juventude: 'Jovem' }
    const r = calcularPontos(top20(...ciclistas), top20(...ciclistas), camisolas, camisolas, 'grande_volta')
    // 10 × 3 pts (top-10) + 10 × 2 pts (top-20) + 3 pts (camisolas) = 53
    expect(r.pontos_total).toBe(53)
    expect(r.acertos_exatos).toBe(20)
    expect(r.acertos_camisolas).toBe(3)
  })

  it('aposta completamente errada → 0 pontos', () => {
    const aposta    = top20(...Array.from({ length: 20 }, (_, i) => `Errado${i}`))
    const resultado = top20(...Array.from({ length: 20 }, (_, i) => `Certo${i}`))
    const r = calcularPontos(aposta, resultado, SEM_CAMISOLAS, SEM_CAMISOLAS, 'grande_volta')
    expect(r.pontos_total).toBe(0)
  })
})
