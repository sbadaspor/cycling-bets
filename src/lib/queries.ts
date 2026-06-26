import { createClient } from '@/lib/supabase/server'
import type {
  Aposta,
  CategoriaProvaTipo,
  Ciclista,
  EtapaResultado,
  GrandesVoltasEntry,
  LeaderboardEntry,
  LeaderboardProva,
  Perfil,
  Prova,
  ResultadoReal,
  VitoriaHistorica,
  VitoriasJogador,
} from '@/types'
import { tipoGrandeVolta } from '@/lib/provaUtils'
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
  return (data ?? []) as Aposta[]
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
  return (data ?? []) as Aposta[]
}

// ============================================================
// LEADERBOARD GERAL
// ============================================================

export async function getLeaderboardGeral(): Promise<LeaderboardEntry[]> {
  const supabase = await createClient()

  // 1. Buscar IDs das provas finalizadas
  const { data: provasFinalizadas, error: provasErr } = await supabase
    .from('provas')
    .select('id')
    .eq('status', 'finalizada')

  if (provasErr) throw provasErr
  const idsFinalizadas = (provasFinalizadas ?? []).map((p: { id: string }) => p.id)
  if (idsFinalizadas.length === 0) return []

  // 2. Buscar apostas calculadas dessas provas
  const { data, error } = await supabase
    .from('apostas')
    .select(`*, perfil:perfis(*)`)
    .in('prova_id', idsFinalizadas)
    .eq('calculada', true)

  if (error) throw error

  const mapaUtilizadores = new Map<string, LeaderboardEntry>()

  for (const aposta of ((data ?? []) as Aposta[])) {
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

  const lista = ((data ?? []) as Aposta[])
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
// Fonte de verdade: sempre a última etapa inserida.
// ============================================================

export async function getResultadoProva(provaId: string): Promise<ResultadoReal | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('etapas_resultados')
    .select('*')
    .eq('prova_id', provaId)
    .order('numero_etapa', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) throw error
  if (!data) return null

  return {
    id: data.id,
    prova_id: data.prova_id,
    resultado_top20: data.classificacao_geral_top20,
    camisola_sprint: data.camisola_sprint ?? null,
    camisola_montanha: data.camisola_montanha ?? null,
    camisola_juventude: data.camisola_juventude ?? null,
    inserido_por: data.inserido_por ?? null,
    created_at: data.created_at,
    updated_at: data.updated_at,
  } as ResultadoReal
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
  return (data ?? []) as Ciclista[]
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
// APOSTAS — busca específica
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
  return (data ?? []) as Aposta[]
}

// ============================================================
// ETAPAS
// ============================================================

export async function getEtapas(provaId: string): Promise<EtapaResultado[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('etapas_resultados')
    .select('*')
    .eq('prova_id', provaId)
    .order('numero_etapa', { ascending: true })

  if (error) throw error
  return (data ?? []) as EtapaResultado[]
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

export async function getTodasEtapas(provaId: string): Promise<EtapaResultado[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('etapas_resultados')
    .select('*')
    .eq('prova_id', provaId)
    .order('numero_etapa', { ascending: true })

  if (error) throw error
  return (data ?? []) as EtapaResultado[]
}

export async function getProximoNumeroEtapa(provaId: string): Promise<number> {
  const ultima = await getUltimaEtapa(provaId)
  return ultima ? ultima.numero_etapa + 1 : 1
}

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

// ============================================================
// VITÓRIAS HISTÓRICAS + AGREGADAS
// ============================================================

export async function getVitoriasHistoricas(): Promise<VitoriaHistorica[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('vitorias_historicas')
    .select('*, perfil:perfis(*)')
    .order('ano', { ascending: false })

  if (error) throw error
  return (data ?? []) as VitoriaHistorica[]
}

// ============================================================
// LEADERBOARDS DE TODAS AS PROVAS FINALIZADAS
// ============================================================

type ProvaInfo = Pick<Prova, 'id' | 'nome' | 'categoria' | 'data_fim'>

type ApostaComProvaJoin = Omit<Aposta, 'prova'> & {
  perfil?: Perfil
  prova?: ProvaInfo & { status: string }
}

export interface LeaderboardFinalizada {
  prova: ProvaInfo
  leaderboard: LeaderboardProva[]
}

export async function getAllLeaderboardsFinalizadas(): Promise<LeaderboardFinalizada[]> {
  const supabase = await createClient()

  // 1. Buscar provas finalizadas com os seus detalhes
  const { data: provasData, error: provasErr } = await supabase
    .from('provas')
    .select('id, nome, categoria, data_fim')
    .eq('status', 'finalizada')
    .order('data_fim', { ascending: false })

  if (provasErr) throw provasErr
  const provasFinalizadas = (provasData ?? []) as ProvaInfo[]
  if (provasFinalizadas.length === 0) return []

  const idsFinalizadas = provasFinalizadas.map(p => p.id)

  // 2. Buscar apostas calculadas dessas provas
  const { data, error } = await supabase
    .from('apostas')
    .select(`*, perfil:perfis(*)`)
    .in('prova_id', idsFinalizadas)
    .eq('calculada', true)

  if (error) throw error

  // Indexar provas por id para lookup rápido
  const provasIndex = new Map<string, ProvaInfo>(provasFinalizadas.map(p => [p.id, p]))

  const mapaProvas = new Map<string, { prova: ProvaInfo; apostas: ApostaComProvaJoin[] }>()

  for (const aposta of ((data ?? []) as ApostaComProvaJoin[])) {
    const prova = provasIndex.get(aposta.prova_id)
    if (!prova) continue

    if (!mapaProvas.has(aposta.prova_id)) {
      mapaProvas.set(aposta.prova_id, { prova, apostas: [] })
    }
    mapaProvas.get(aposta.prova_id)!.apostas.push(aposta)
  }

  return Array.from(mapaProvas.values()).map(({ prova, apostas }) => ({
    prova,
    leaderboard: (apostas as Aposta[])
      .sort(compararDesempate)
      .map((aposta, idx) => ({
        rank: idx + 1,
        perfil: aposta.perfil!,
        aposta,
      })),
  }))
}

// ============================================================
// VITÓRIAS AGREGADAS
// ============================================================

export async function getDadosVitorias(): Promise<{
  vitorias: VitoriasJogador[]
  grandesVoltas: GrandesVoltasEntry[]
}> {
  const supabase = await createClient()

  const [historicasData, leaderboardsData] = await Promise.all([
    supabase.from('vitorias_historicas').select('*, perfil:perfis(*)'),
    getAllLeaderboardsFinalizadas(),
  ])

  if (historicasData.error) throw historicasData.error
  const historicas = (historicasData.data ?? []) as VitoriaHistorica[]

  const accVitorias = new Map<string, VitoriasJogador>()
  const accGV = new Map<string, GrandesVoltasEntry>()

  const getOrInitVitorias = (perfil: NonNullable<VitoriaHistorica['perfil']>): VitoriasJogador => {
    if (!accVitorias.has(perfil.id)) {
      accVitorias.set(perfil.id, {
        perfil,
        total: 0,
        porCategoria: { grande_volta: 0, prova_semana: 0, monumento: 0, prova_dia: 0 },
      })
    }
    return accVitorias.get(perfil.id)!
  }

  const getOrInitGV = (userId: string): GrandesVoltasEntry => {
    if (!accGV.has(userId)) {
      accGV.set(userId, { userId, giro: 0, tour: 0, vuelta: 0 })
    }
    return accGV.get(userId)!
  }

  for (const v of historicas) {
    if (!v.perfil) continue
    const entry = getOrInitVitorias(v.perfil)
    entry.total++
    entry.porCategoria[v.categoria]++

    const gv = tipoGrandeVolta(v.nome_prova)
    if (gv) getOrInitGV(v.perfil.id)[gv]++
  }

  for (const { prova, leaderboard } of leaderboardsData) {
    if (leaderboard.length === 0 || !prova.categoria) continue
    const vencedor = leaderboard[0]
    const perfil = vencedor.perfil
    if (!perfil) continue

    const entry = getOrInitVitorias(perfil)
    entry.total++
    entry.porCategoria[prova.categoria]++

    const gv = tipoGrandeVolta(prova.nome)
    if (gv) getOrInitGV(perfil.id)[gv]++
  }

  return {
    vitorias: Array.from(accVitorias.values()).sort((a, b) => b.total - a.total),
    grandesVoltas: Array.from(accGV.values()),
  }
}

/** @deprecated Usar getDadosVitorias() */
export async function getVitoriasAgregadas(): Promise<VitoriasJogador[]> {
  const { vitorias } = await getDadosVitorias()
  return vitorias
}

// ============================================================
// HOMEPAGE — STATS + FEED
// ============================================================

export async function getHomepageStats() {
  const supabase = await createClient()

  const [
    { count: totalApostas },
    { count: totalJogadores },
    { count: provasAtivas },
  ] = await Promise.all([
    supabase.from('apostas').select('*', { count: 'exact', head: true }),
    supabase.from('perfis').select('*', { count: 'exact', head: true }),
    supabase.from('provas').select('*', { count: 'exact', head: true }).eq('status', 'fechada'),
  ])

  return {
    totalApostas: totalApostas ?? 0,
    totalJogadores: totalJogadores ?? 0,
    provasAtivas: provasAtivas ?? 0,
  }
}

export interface ActivityItem {
  userId: string
  username: string
  fullName: string | null
  avatarUrl: string | null
  provaId: string
  provaNome: string
  createdAt: string
}

export async function getActivityFeed(limit = 6): Promise<ActivityItem[]> {
  const supabase = await createClient()

  const { data } = await supabase
    .from('apostas')
    .select('user_id, created_at, prova:provas(id, nome), perfil:perfis(username, full_name, avatar_url)')
    .order('created_at', { ascending: false })
    .limit(limit)

  return ((data ?? []) as unknown as Array<{
    user_id: string
    created_at: string
    prova: { id: string; nome: string } | null
    perfil: { username: string; full_name: string | null; avatar_url: string | null } | null
  }>)
    .filter(r => r.prova && r.perfil)
    .map(r => ({
      userId: r.user_id,
      username: r.perfil!.username,
      fullName: r.perfil!.full_name ?? null,
      avatarUrl: r.perfil!.avatar_url,
      provaId: r.prova!.id,
      provaNome: r.prova!.nome,
      createdAt: r.created_at,
    }))
}
