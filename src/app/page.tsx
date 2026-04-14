import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import { getLeaderboardGeral, getProvas, getUltimasApostas } from '@/lib/queries'
import { LeaderboardTable } from '@/components/dashboard/LeaderboardTable'
import { ProvasList } from '@/components/dashboard/ProvasList'
import { UltimasApostas } from '@/components/dashboard/UltimasApostas'
import { StatsCards } from '@/components/dashboard/StatsCards'

export default async function HomePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [leaderboard, provas, ultimasApostas] = await Promise.all([
    getLeaderboardGeral(),
    getProvas(),
    user ? getUltimasApostas(user.id, 10) : Promise.resolve([]),
  ])

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-zinc-100">
            🚴 VeloApostas
          </h1>
          <p className="text-zinc-400 mt-1">
            Sistema de apostas de ciclismo entre amigos
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <StatsCards
        totalProvas={provas.length}
        provasAbertas={provas.filter(p => p.status === 'aberta').length}
        totalParticipantes={leaderboard.length}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Leaderboard Geral */}
        <div className="lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-zinc-100">
              🏆 Classificação Geral
            </h2>
            <span className="text-sm text-zinc-500">
              {leaderboard.length} participante{leaderboard.length !== 1 ? 's' : ''}
            </span>
          </div>
          <Suspense fallback={<LoadingCard />}>
            <LeaderboardTable entries={leaderboard} currentUserId={user?.id} />
          </Suspense>
        </div>

        {/* Provas & Últimas Apostas */}
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-semibold text-zinc-100 mb-4">
              🏅 Provas
            </h2>
            <ProvasList provas={provas} userId={user?.id} />
          </div>

          {user && ultimasApostas.length > 0 && (
            <div>
              <h2 className="text-xl font-semibold text-zinc-100 mb-4">
                📋 As Minhas Apostas
              </h2>
              <UltimasApostas apostas={ultimasApostas} />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function LoadingCard() {
  return (
    <div className="card animate-pulse">
      <div className="h-64 bg-zinc-800 rounded-lg" />
    </div>
  )
}
