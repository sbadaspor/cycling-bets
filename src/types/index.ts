// ============================================================
// TIPOS PRINCIPAIS DO SISTEMA
// ============================================================
export type ProvaStatus = 'aberta' | 'fechada' | 'finalizada'
export interface Perfil {
  id: string
  username: string
  full_name?: string
  is_admin: boolean
  avatar_url?: string
  created_at: string
  updated_at: string
}
export interface Prova {
  id: string
  nome: string
  data_inicio: string
  data_fim: string
  status: ProvaStatus
  descricao?: string
  created_at: string
  updated_at: string
}
export interface Ciclista {
  id: string
  prova_id: string
  nome: string          // ex.: "VAN DER POEL Mathieu"
  equipa: string        // ex.: "Alpecin-Premier Tech"
  dorsal?: number       // ex.: 1
  created_at: string
}
export interface Aposta {
  id: string
  prova_id: string
  user_id: string
  apostas_top20: string[] // 20 nomes de ciclistas, índice 0 = 1º lugar
  camisola_sprint?: string
  camisola_montanha?: string
  camisola_juventude?: string
  // Pontuação calculada
  pontos_total: number
  pontos_top10: number
  pontos_top20: number
  pontos_camisolas: number
  // Desempate
  acertos_exatos: number
  acertos_exatos_top10: number
  acertos_exatos_top20: number
  acertos_camisolas: number
  calculada: boolean
  created_at: string
  updated_at: string
  // Joins
  perfil?: Perfil
  prova?: Prova
}
export interface ResultadoReal {
  id: string
  prova_id: string
  resultado_top20: string[] // 20 nomes, índice 0 = 1º lugar
  camisola_sprint?: string
  camisola_montanha?: string
  camisola_juventude?: string
  inserido_por?: string
  created_at: string
  updated_at: string
}
// ============================================================
// TIPOS DE UI / FORMULÁRIOS
// ============================================================
export interface ApostaFormData {
  prova_id: string
  apostas_top20: string[]
  camisola_sprint: string
  camisola_montanha: string
  camisola_juventude: string
}
export interface ResultadoFormData {
  prova_id: string
  resultado_top20: string[]
  camisola_sprint: string
  camisola_montanha: string
  camisola_juventude: string
}
export interface CiclistaParsed {
  nome: string
  equipa: string
  dorsal?: number
}
// ============================================================
// TIPOS DE LEADERBOARD
// ============================================================
export interface LeaderboardEntry {
  rank: number
  perfil: Perfil
  apostas: {
    total: number
    calculadas: number
  }
  pontos_total: number
  pontos_top10: number
  pontos_top20: number
  pontos_camisolas: number
  acertos_exatos: number
  acertos_exatos_top10: number
  acertos_exatos_top20: number
  acertos_camisolas: number
}
export interface LeaderboardProva {
  rank: number
  perfil: Perfil
  aposta: Aposta
}
// ============================================================
// TIPOS DE CÁLCULO DE PONTOS
// ============================================================
export interface PontosCalculo {
  pontos_total: number
  pontos_top10: number
  pontos_top20: number
  pontos_camisolas: number
  acertos_exatos: number
  acertos_exatos_top10: number
  acertos_exatos_top20: number
  acertos_camisolas: number
  breakdown: PontoBreakdownItem[]
}
export interface PontoBreakdownItem {
  ciclista: string
  posicao_apostada: number
  posicao_real: number | null
  pontos: number
  tipo: 'top10_exato' | 'top20_exato' | 'top10_bonus' | 'top20_bonus' | 'fora' | 'nao_top20'
  descricao: string
}
export interface CamisolaBreakdown {
  tipo: 'sprint' | 'montanha' | 'juventude'
  apostado: string
  real: string
  acertou: boolean
  pontos: number
}
