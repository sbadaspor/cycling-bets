import { CiclistaParsed } from '@/types'

export interface ParseResult {
  ciclistas: CiclistaParsed[]
  equipas: string[]
  linhasIgnoradas: string[]
}

/**
 * Parser para texto colado do procyclingstats.com ou similar.
 *
 * Formato esperado:
 *   1 Alpecin-Premier Tech          <- cabeçalho equipa (número + espaço + nome)
 *   1. VAN DER POEL Mathieu         <- ciclista (número + ponto + nome)
 *   2. DEL GROSSO Tibor
 *   DS: MEERSMAN Gianni             <- ignorado
 *   2 Bahrain - Victorious          <- nova equipa
 *   11. TIBERI Antonio
 *   ...
 */
export function parseStartlist(texto: string): ParseResult {
  const ciclistas: CiclistaParsed[] = []
  const equipas: string[] = []
  const linhasIgnoradas: string[] = []
  let equipaAtual: string | null = null

  // Regex:
  // - Cabeçalho equipa: começa com 1-3 dígitos, espaço, depois texto SEM ponto no número
  //   ex.: "1 Alpecin-Premier Tech", "14 Red Bull - BORA - hansgrohe"
  // - Ciclista: começa com 1-3 dígitos, ponto, espaço, NOME
  //   ex.: "1. VAN DER POEL Mathieu", "131.ROGLIC Primoz" (sem espaço depois do ponto)
  const regexEquipa = /^(\d{1,3})\s+([^\d].*)$/
  const regexCiclista = /^(\d{1,3})\.\s*(.+)$/

  const linhas = texto
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0)

  for (const linha of linhas) {
    // Ignora linhas de DS (Directeur Sportif) e ruído comum
    if (/^DS:/i.test(linha)) continue
    if (/procyclingstats/i.test(linha)) continue
    if (/^\d{1,2}\/\d{1,2}\/\d{2,4}/.test(linha)) continue // datas
    if (/starting$/i.test(linha)) continue
    if (/\d+\s*km\s*\|/i.test(linha)) continue

    const mCiclista = linha.match(regexCiclista)
    if (mCiclista) {
      const dorsal = parseInt(mCiclista[1], 10)
      const nome = mCiclista[2].trim()
      if (!equipaAtual) {
        linhasIgnoradas.push(linha + '  (sem equipa atribuída)')
        continue
      }
      ciclistas.push({ nome, equipa: equipaAtual, dorsal })
      continue
    }

    const mEquipa = linha.match(regexEquipa)
    if (mEquipa) {
      equipaAtual = mEquipa[2].trim()
      if (!equipas.includes(equipaAtual)) {
        equipas.push(equipaAtual)
      }
      continue
    }

    linhasIgnoradas.push(linha)
  }

  return { ciclistas, equipas, linhasIgnoradas }
}
