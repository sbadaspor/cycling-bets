import { CiclistaParsed } from '@/types'

export interface ParseResult {
  ciclistas: CiclistaParsed[]
  equipas: string[]
  linhasIgnoradas: string[]
}

/**
 * Parser para texto colado do procyclingstats.com ou PDF similar.
 *
 * Formato esperado:
 *   1 Alpecin-Premier Tech          <- cabeçalho equipa (número + espaço + nome)
 *   1. VAN DER POEL Mathieu         <- ciclista (número + ponto + nome)
 *   2. DEL GROSSO Tibor
 *   DS: MEERSMAN Gianni,ROODHOOFT   <- linha DS (pode continuar na linha seguinte)
 *   Christoph                        <- continuação do DS anterior -> ignorar
 *   2 Bahrain - Victorious          <- nova equipa
 *   ...
 */
export function parseStartlist(texto: string): ParseResult {
  const ciclistas: CiclistaParsed[] = []
  const equipas: string[] = []
  const linhasIgnoradas: string[] = []
  let equipaAtual: string | null = null
  let emDS = false  // true quando estamos dentro de um bloco DS

  const regexEquipa = /^(\d{1,3})\s+([^\d].*)$/
  const regexCiclista = /^(\d{1,3})\.\s*(.+)$/

  const linhas = texto
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0)

  for (const linha of linhas) {
    // Ruído comum a ignorar em qualquer contexto
    if (/procyclingstats/i.test(linha)) continue
    if (/^\d{1,2}\/\d{1,2}\/\d{2,4}/.test(linha)) continue
    if (/starting$/i.test(linha)) continue
    if (/\d+\s*km\s*\|/i.test(linha)) continue

    // Início de bloco DS
    if (/^DS:/i.test(linha)) {
      emDS = true
      continue
    }

    // Se a linha bate com ciclista (número + ponto + nome), isso quebra o bloco DS
    const mCiclista = linha.match(regexCiclista)
    if (mCiclista) {
      emDS = false
      const dorsal = parseInt(mCiclista[1], 10)
      const nome = mCiclista[2].trim()
      if (!equipaAtual) {
        linhasIgnoradas.push(linha + '  (sem equipa atribuída)')
        continue
      }
      ciclistas.push({ nome, equipa: equipaAtual, dorsal })
      continue
    }

    // Se bate com equipa, também quebra o bloco DS
    const mEquipa = linha.match(regexEquipa)
    if (mEquipa) {
      emDS = false
      equipaAtual = mEquipa[2].trim()
      if (!equipas.includes(equipaAtual)) {
        equipas.push(equipaAtual)
      }
      continue
    }

    // Se estamos dentro de um bloco DS, ignora em silêncio (continuação do nome do DS)
    if (emDS) {
      continue
    }

    // Linha não reconhecida fora de bloco DS
    linhasIgnoradas.push(linha)
  }

  return { ciclistas, equipas, linhasIgnoradas }
}
