import { createAdminClient } from '@/lib/supabase/admin'
import { getAllLeaderboardsFinalizadas, getDadosVitorias } from '@/lib/queries'
import HistoricoClient from '@/components/h2h/HistoricoClient'

export default async function HistoricoPage() {
  const supabase = createAdminClient()

  const [perfisRes, todosLeaderboards, historicasRes, { vitorias, grandesVoltas }] = await Promise.all([
    supabase.from('perfis').select('id, username, avatar_url, full_name'),
    getAllLeaderboardsFinalizadas(),
    supabase.from('apostas_historicas').select('*').order('ano', { ascending: true }),
    getDadosVitorias(),
  ])

  const perfis = perfisRes.data ?? []
  const historicas = historicasRes.data ?? []

  return (
    <HistoricoClient
      perfis={perfis}
      todosLeaderboards={todosLeaderboards as any}
      historicas={historicas}
      vitorias={vitorias}
      grandesVoltas={grandesVoltas}
    />
  )
}
