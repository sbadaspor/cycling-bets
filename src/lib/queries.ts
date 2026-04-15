import { createClient } from '@/lib/supabase/server'
import type { Aposta, Ciclista, EtapaResultado, LeaderboardEntry, LeaderboardProva, Prova, ResultadoReal } from '@/types'
import { compararDesempate } from '@/lib/pontuacao'

// ============================================================
// PROVAS
// ============================================================

export async function getProvas() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('provas')
    .select('*')
    .order('data_inicio', { ascending: false })

  if (error) throw error
  return data as Prova[]
}

export async function getProva(id: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('provas')
    .select('*')
    .eq('id', id)
    .single()

  if (error) throw error
  return data as Prova
}

// ============================================================
// APOSTAS
// ============================================================

export async function getApostasProva(provaId: string): Promise<Aposta[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('apostas')
    .select(`*, perfil:perfis(*)`)
    .eq('prova_id', provaId)
    .order('pontos_total', { ascending: false })

  if (error) throw error
  return data as Aposta[]
}

export async function getMinhaAposta(provaId: string, userId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('apostas')
    .select(`*, prova:provas(*)`)
    .eq('prova_id', provaId)
    .eq('user_id', userId)
    .maybeSingle()

  if (error) throw error
  return data as Aposta | null
}

export async function getUltimasApostas(userId: string, limit = 10) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('apostas')
    .select(`*, prova:provas(*)`)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) throw error
  return data as Aposta[]
}

// ============================================================
// LEADERBOARD GERAL (todas as provas finalizadas)
// ============================================================

export async function getLeaderboardGeral(): Promise<LeaderboardEntry[]> {
  const supabase = await createClient()

  // Busca todas as apostas de provas finalizadas
  const { data, error } = await supabase
    .from('apostas')
    .select(`
      *,
      perfil:perfis(*),
      prova:provas!inner(status)
    `)
    .eq('prova.status', 'finalizada')
    .eq('calculada', true)

  if (error) throw error

  // Agregar por utilizador
  const mapaUtilizadores = new Map<string, LeaderboardEntry>()

  for (const aposta of (data as Aposta[])) {
    if (!aposta.perfil) continue
    const userId = aposta.user_id

    if (!mapaUtilizadores.has(userId)) {
      mapaUtilizadores.set(userId, {
        rank: 0,
        perfil: aposta.perfil,
        apostas: { total: 0, calculadas: 0 },
        pontos_total: 0,
        pontos_top10: 0,
        pontos_top20: 0,
        pontos_camisolas: 0,
        acertos_exatos: 0,
        acertos_exatos_top10: 0,
        acertos_exatos_top20: 0,
        acertos_camisolas: 0,
      })
    }

    const entry = mapaUtilizadores.get(userId)!
    entry.apostas.total++
    if (aposta.calculada) entry.apostas.calculadas++
    entry.pontos_total += aposta.pontos_total
    entry.pontos_top10 += aposta.pontos_top10
    entry.pontos_top20 += aposta.pontos_top20
    entry.pontos_camisolas += aposta.pontos_camisolas
    entry.acertos_exatos += aposta.acertos_exatos
    entry.acertos_exatos_top10 += aposta.acertos_exatos_top10
    entry.acertos_exatos_top20 += aposta.acertos_exatos_top20
    entry.acertos_camisolas += aposta.acertos_camisolas
  }

  const lista = Array.from(mapaUtilizadores.values())
    .sort(compararDesempate)
    .map((entry, idx) => ({ ...entry, rank: idx + 1 }))

  return lista
}

// ============================================================
// LEADERBOARD POR PROVA
// ============================================================

export async function getLeaderboardProva(provaId: string): Promise<LeaderboardProva[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('apostas')
    .select(`*, perfil:perfis(*)`)
    .eq('prova_id', provaId)
    .eq('calculada', true)

  if (error) throw error

  const lista = (data as Aposta[])
    .sort(compararDesempate)
    .map((aposta, idx) => ({
      rank: idx + 1,
      perfil: aposta.perfil!,
      aposta,
    }))

  return lista
}

// ============================================================
// RESULTADOS
// ============================================================

export async function getResultadoProva(provaId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('resultados_reais')
    .select('*')
    .eq('prova_id', provaId)
    .maybeSingle()

  if (error) throw error
  return data as ResultadoReal | null
}

// ============================================================
// CICLISTAS / STARTLIST
// ============================================================

export async function getCiclistas(provaId: string): Promise<Ciclista[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('ciclistas')
    .select('*')
    .eq('prova_id', provaId)
    .order('dorsal', { ascending: true })

  if (error) throw error
  return data as Ciclista[]
}

export async function countCiclistas(provaId: string): Promise<number> {
  const supabase = await createClient()
  const { count, error } = await supabase
    .from('ciclistas')
    .select('*', { count: 'exact', head: true })
    .eq('prova_id', provaId)

  if (error) throw error
  return count ?? 0
}

// ============================================================
// APOSTAS — busca específica por id ou por user+prova
// ============================================================

export async function getApostaPorUser(provaId: string, userId: string): Promise<Aposta | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('apostas')
    .select(`*, perfil:perfis(*), prova:provas(*)`)
    .eq('prova_id', provaId)
    .eq('user_id', userId)
    .maybeSingle()

  if (error) throw error
  return data as Aposta | null
}

export async function getApostasProvaComPerfil(provaId: string): Promise<Aposta[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('apostas')
    .select(`*, perfil:perfis(*)`)
    .eq('prova_id', provaId)
    .order('pontos_total', { ascending: false })

  if (error) throw error
  return data as Aposta[]
}

// ============================================================
// ETAPAS (classificação geral por etapa)
// ============================================================

export async function getEtapas(provaId: string): Promise<EtapaResultado[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('etapas_resultados')
    .select('*')
    .eq('prova_id', provaId)
    .order('numero_etapa', { ascending: true })

  if (error) throw error
  return data as EtapaResultado[]
}

export async function getUltimaEtapa(provaId: string): Promise<EtapaResultado | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('etapas_resultados')
    .select('*')
    .eq('prova_id', provaId)
    .order('numero_etapa', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) throw error
  return data as EtapaResultado | null
}

export async function getProximoNumeroEtapa(provaId: string): Promise<number> {
  const ultima = await getUltimaEtapa(provaId)
  return ultima ? ultima.numero_etapa + 1 : 1
}

// ============================================================
// Última prova finalizada (para o dashboard quando não há prova a decorrer)
// ============================================================

export async function getUltimaProvaFinalizada(): Promise<Prova | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('provas')
    .select('*')
    .eq('status', 'finalizada')
    .order('data_fim', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) throw error
  return data as Prova | null
}
