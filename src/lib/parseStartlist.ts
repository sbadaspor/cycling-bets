import { CiclistaParsed } from '@/types'

export interface ParseResult {
  ciclistas: CiclistaParsed[]
  equipas: string[]
  linhasIgnoradas: string[]
}

/**
 * Parser para texto colado do procyclingstats.com ou PDF similar.
 */
export function parseStartlist(texto: string): ParseResult {
  const ciclistas: CiclistaParsed[] = []
  const equipas: string[] = []
  const linhasIgnoradas: string[] = []
  let equipaAtual: string | null = null
  let equipaAtualCompleta = false // true assim que aparece o primeiro ciclista dessa equipa
  let emDS = false

  const regexEquipa = /^(\d{1,3})\s+([^\d].*)$/
  const regexCiclista = /^(\d{1,3})\.\s*(.+)$/

  const linhas = texto
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0)

  for (const linha of linhas) {
    // Ruído comum
    if (/procyclingstats/i.test(linha)) continue
    if (/^\d{1,2}\/\d{1,2}\/\d{2,4}/.test(linha)) continue
    if (/starting$/i.test(linha)) continue
    if (/\d+\s*km\s*\|/i.test(linha)) continue

    if (/^DS:/i.test(linha)) {
      emDS = true
      continue
    }

    const mCiclista = linha.match(regexCiclista)
    if (mCiclista) {
      emDS = false
      equipaAtualCompleta = true
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
      emDS = false
      equipaAtual = mEquipa[2].trim()
      equipaAtualCompleta = false
      if (!equipas.includes(equipaAtual)) {
        equipas.push(equipaAtual)
      }
      continue
    }

    if (emDS) continue

    // Continuação do nome da equipa (caso "Red Bull - BORA -\nhansgrohe")
    // Se a última equipa ainda não teve ciclistas e terminava em hífen,
    // juntamos esta linha ao nome da equipa.
    if (equipaAtual && !equipaAtualCompleta && /[-–]\s*$/.test(equipaAtual)) {
      const anterior = equipaAtual
      equipaAtual = (equipaAtual + ' ' + linha).replace(/\s+/g, ' ').trim()
      // Substitui na lista de equipas
      const idx = equipas.indexOf(anterior)
      if (idx >= 0) equipas[idx] = equipaAtual
      continue
    }

    linhasIgnoradas.push(linha)
  }

  return { ciclistas, equipas, linhasIgnoradas }
}
