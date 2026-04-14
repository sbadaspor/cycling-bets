'use client'

import type { LeaderboardEntry } from '@/types'

interface Props {
  entries: LeaderboardEntry[]
  currentUserId?: string
}

export function LeaderboardTable({ entries, currentUserId }: Props) {
  if (entries.length === 0) {
    return (
      <div className="card text-center py-12">
        <p className="text-zinc-500 text-lg">🏁</p>
        <p className="text-zinc-400 mt-2">Ainda não há classificação geral.</p>
        <p className="text-zinc-500 text-sm mt-1">
          Aparece depois das provas ficarem finalizadas.
        </p>
      </div>
    )
  }

  return (
    <div className="card p-0 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-800">
              <th className="text-left px-4 py-3 text-zinc-400 font-medium w-12">#</th>
              <th className="text-left px-4 py-3 text-zinc-400 font-medium">Participante</th>
              <th className="text-right px-4 py-3 text-zinc-400 font-medium">Pontos</th>
              <th className="text-right px-4 py-3 text-zinc-400 font-medium hidden sm:table-cell">Top-10</th>
              <th className="text-right px-4 py-3 text-zinc-400 font-medium hidden md:table-cell">Top-20</th>
              <th className="text-right px-4 py-3 text-zinc-400 font-medium hidden md:table-cell">🎽</th>
              <th className="text-right px-4 py-3 text-zinc-400 font-medium hidden lg:table-cell">Exatos</th>
              <th className="text-right px-4 py-3 text-zinc-400 font-medium hidden sm:table-cell">Provas</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry) => {
              const isMe = entry.perfil.id === currentUserId
              return (
                <tr
                  key={entry.perfil.id}
                  className={`border-b border-zinc-800/50 transition-colors ${
                    isMe
                      ? 'bg-amber-500/10 hover:bg-amber-500/15'
                      : 'hover:bg-zinc-800/50'
                  }`}
                >
                  <td className="px-4 py-3">
                    <RankBadge rank={entry.rank} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-zinc-700 flex items-center justify-center text-xs font-bold text-zinc-300 flex-shrink-0">
                        {entry.perfil.username?.[0]?.toUpperCase() ?? '?'}
                      </div>
                      <div>
                        <p className={`font-medium ${isMe ? 'text-amber-400' : 'text-zinc-100'}`}>
                          {entry.perfil.username}
                          {isMe && <span className="text-xs ml-1 text-amber-500">(tu)</span>}
                        </p>
                        {entry.perfil.full_name && (
                          <p className="text-zinc-500 text-xs">{entry.perfil.full_name}</p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className="text-lg font-bold text-amber-400">{entry.pontos_total}</span>
                    <span className="text-zinc-500 text-xs ml-1">pts</span>
                  </td>
                  <td className="px-4 py-3 text-right text-zinc-300 hidden sm:table-cell">
                    {entry.pontos_top10}
                  </td>
                  <td className="px-4 py-3 text-right text-zinc-300 hidden md:table-cell">
                    {entry.pontos_top20}
                  </td>
                  <td className="px-4 py-3 text-right text-zinc-300 hidden md:table-cell">
                    {entry.pontos_camisolas}
                  </td>
                  <td className="px-4 py-3 text-right text-zinc-400 hidden lg:table-cell">
                    {entry.acertos_exatos}
                  </td>
                  <td className="px-4 py-3 text-right text-zinc-400 hidden sm:table-cell text-xs">
                    {entry.apostas.calculadas}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Legenda */}
      <div className="px-4 py-3 border-t border-zinc-800 bg-zinc-900/50">
        <p className="text-xs text-zinc-600">
          Top-10 = pts em apostas Top-10 | Top-20 = pts em apostas Top-20 | 🎽 = pts camisolas | Exatos = posições exatas
        </p>
      </div>
    </div>
  )
}

function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) return <span className="text-yellow-400 font-bold text-lg">🥇</span>
  if (rank === 2) return <span className="text-slate-300 font-bold text-lg">🥈</span>
  if (rank === 3) return <span className="text-amber-600 font-bold text-lg">🥉</span>
  return <span className="text-zinc-500 font-medium w-6 text-center inline-block">{rank}</span>
}
