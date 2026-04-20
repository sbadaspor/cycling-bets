// ============================================================
// TIPOS PRINCIPAIS DO SISTEMA
// ============================================================
export type ProvaStatus = 'aberta' | 'fechada' | 'finalizada'
export type CategoriaProvaTipo = 'grande_volta' | 'prova_semana' | 'monumento' | 'prova_dia'

export interface Perfil {
  id: string
  username: string
  full_name?: string
  is_admin: boolean
  avatar_url?: string
  data_nascimento?: string   // ISO date — opcional, pode não estar preenchido
  created_at: string
  updated_at: string
}
export interface Prova {
  id: string
  nome: string
  data_inicio: string
  data_fim: string
  status: ProvaStatus
  categoria?: CategoriaProvaTipo
  descricao?: string
  created_at: string
  updated_at: string
}
export interface Ciclista {
  id: string
  prova_id: string
  nome: string
  equipa: string
  dorsal?: number
  created_at: string
}
export interface PosicaoAdicional {
  posicao: number
  nome: string
}
export interface EtapaResultado {
  id: string
  prova_id: string
  numero_etapa: number
  data_etapa: string
  classificacao_geral_top20: string[]
  posicoes_adicionais: PosicaoAdicional[]
  camisola_sprint?: string
  camisola_montanha?: string
  camisola_juventude?: string
  is_final: boolean
  inserido_por?: string
  created_at: string
  updated_at: string
}
export interface Aposta {
  id: string
  prova_id: string
  user_id: string
  apostas_top20: string[]
  camisola_sprint?: string
  camisola_montanha?: string
  camisola_juventude?: string
  pontos_total: number
  pontos_top10: number
  pontos_top20: number
  pontos_camisolas: number
  acertos_exatos: number
  acertos_exatos_top10: number
  acertos_exatos_top20: number
  acertos_camisolas: number
  calculada: boolean
  created_at: string
  updated_at: string
  perfil?: Perfil
  prova?: Prova
}
export interface ResultadoReal {
  id: string
  prova_id: string
  resultado_top20: string[]
  camisola_sprint?: string
  camisola_montanha?: string
  camisola_juventude?: string
  inserido_por?: string
  created_at: string
  updated_at: string
}
export interface VitoriaHistorica {
  id: string
  user_id: string
  ano: number
  nome_prova: string
  categoria: CategoriaProvaTipo
  notas?: string
  created_at: string
  perfil?: Perfil
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
// VITÓRIAS AGREGADAS
// ============================================================

/** Breakdown de Grandes Voltas por jogador (Giro / Tour / Vuelta) */
export interface GrandesVoltasEntry {
  userId: string
  giro: number
  tour: number
  vuelta: number
}

export interface VitoriasJogador {
  perfil: Perfil
  total: number
  porCategoria: Record<CategoriaProvaTipo, number>
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
