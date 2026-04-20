// Utilitários partilhados sobre provas
// Centraliza lógica que estava duplicada em page.tsx, perfil/page.tsx e PerfilSections.tsx

/**
 * Detecta se o nome de uma prova corresponde a uma das três Grandes Voltas.
 */
export function tipoGrandeVolta(nome: string): 'giro' | 'tour' | 'vuelta' | null {
  const n = nome.toLowerCase()
  if (n.includes('giro'))   return 'giro'
  if (n.includes('tour'))   return 'tour'
  if (n.includes('vuelta')) return 'vuelta'
  return null
}

/**
 * Ordem canónica das Grandes Voltas dentro do mesmo ano (Giro → Tour → Vuelta).
 * Útil para ordenar palmares.
 */
export function ordemDentroAno(nome: string): number {
  const tipo = tipoGrandeVolta(nome)
  if (tipo === 'vuelta') return 3
  if (tipo === 'tour')   return 2
  if (tipo === 'giro')   return 1
  return 0
}
