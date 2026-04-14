import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getProva, getLeaderboardProva, getResultadoProva } from '@/lib/queries'
import Link from 'next/link'

interface Props {
  params: Promise<{ provaId: string }>
}

export default async function ProvaPage({ params }: Props) {
  const { provaId } = await params

  let prova
  try {
    prova = await getProva(provaId)
  } catch {
    redirect('/')
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [leaderboard, resultado] = await Promise.all([
    getLeaderboardProva(provaId),
    getResultadoProva(provaId),
  ])

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <Link href="/" className="text-zinc-500 text-sm hover:text-zinc-300">
          ← Dashboard
        </Link>
        <h1 className="text-2xl font-bold text-zinc-100 mt-2">{prova.nome}</h1>
        <div className="flex items-center gap-3 mt-2">
          <span className={`badge-${prova.status}`}>
            {prova.status === 'aberta' ? '🟢 Aberta' : prova.status === 'fechada' ? '🟡 Fechada' : '✅ Finalizada'}
          </span>
          <span className="text-zinc-500 text-sm">
            {new Date(prova.data_inicio).toLocaleDateString('pt-PT')} →{' '}
            {new Date(prova.data_fim).toLocaleDateString('pt-PT')}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Leaderboard */}
        <div className="lg:col-span-3">
          <h2 className="text-lg font-semibold text-zinc-100 mb-4">🏆 Classificação da Prova</h2>

          {leaderboard.length === 0 ? (
            <div className="card text-center py-12">
              <p className="text-zinc-500">
                {prova.status === 'aberta'
                  ? 'A prova ainda está a decorrer. Os resultados aparecem aqui quando for finalizada.'
                  : 'Sem apostas calculadas para esta prova.'}
              </p>
              {prova.status === 'aberta' && user && (
                <Link href={`/apostas/${provaId}`} className="btn-primary mt-4 inline-block">
                  Fazer Aposta
                </Link>
              )}
            </div>
          ) : (
            <div className="card p-0 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-800">
                    <th className="text-left px-4 py-3 text-zinc-400 font-medium w-10">#</th>
                    <th className="text-left px-4 py-3 text-zinc-400 font-medium">Participante</th>
                    <th className="text-right px-4 py-3 text-zinc-400 font-medium">Pts</th>
                    <th className="text-right px-4 py-3 text-zinc-400 font-medium hidden sm:table-cell">T10</th>
                    <th className="text-right px-4 py-3 text-zinc-400 font-medium hidden sm:table-cell">T20</th>
                    <th className="text-right px-4 py-3 text-zinc-400 font-medium hidden md:table-cell">🎽</th>
                    <th className="text-right px-4 py-3 text-zinc-400 font-medium hidden md:table-cell">Exatos</th>
                  </tr>
                </thead>
                <tbody>
                  {leaderboard.map(({ rank, perfil, aposta }) => {
                    const isMe = perfil.id === user?.id
                    return (
                      <tr
                        key={perfil.id}
                        className={`border-b border-zinc-800/50 ${
                          isMe ? 'bg-amber-500/10' : 'hover:bg-zinc-800/30'
                        }`}
                      >
                        <td className="px-4 py-3 text-zinc-500 font-medium">
                          {rank <= 3
                            ? ['🥇', '🥈', '🥉'][rank - 1]
                            : rank}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`font-medium ${isMe ? 'text-amber-400' : 'text-zinc-200'}`}>
                            {perfil.username}
                            {isMe && <span className="text-xs ml-1 text-amber-500">(tu)</span>}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-amber-400">
                          {aposta.pontos_total}
                        </td>
                        <td className="px-4 py-3 text-right text-zinc-400 hidden sm:table-cell">
                          {aposta.pontos_top10}
                        </td>
                        <td className="px-4 py-3 text-right text-zinc-400 hidden sm:table-cell">
                          {aposta.pontos_top20}
                        </td>
                        <td className="px-4 py-3 text-right text-zinc-400 hidden md:table-cell">
                          {aposta.pontos_camisolas}
                        </td>
                        <td className="px-4 py-3 text-right text-zinc-500 hidden md:table-cell">
                          {aposta.acertos_exatos}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Resultado Real */}
        <div className="lg:col-span-2">
          <h2 className="text-lg font-semibold text-zinc-100 mb-4">📋 Resultado Oficial</h2>

          {resultado ? (
            <div className="card p-0 overflow-hidden">
              <div className="px-4 py-3 border-b border-zinc-800">
                <p className="text-xs text-zinc-500 font-medium">TOP 20 OFICIAL</p>
              </div>
              <div className="divide-y divide-zinc-800/50">
                {resultado.resultado_top20.map((ciclista, idx) => (
                  <div key={idx} className="flex items-center gap-3 px-4 py-2">
                    <span className={`text-xs font-bold w-6 text-center ${
                      idx < 10 ? 'text-amber-400' : 'text-zinc-500'
                    }`}>
                      {idx + 1}
                    </span>
                    <span className="text-sm text-zinc-200">{ciclista}</span>
                  </div>
                ))}
              </div>

              {/* Camisolas */}
              {(resultado.camisola_sprint || resultado.camisola_montanha || resultado.camisola_juventude) && (
                <div className="border-t border-zinc-800 px-4 py-3 space-y-1">
                  <p className="text-xs text-zinc-500 font-medium mb-2">CAMISOLAS</p>
                  {resultado.camisola_sprint && (
                    <p className="text-sm text-zinc-300">🟢 <span className="text-zinc-500">Sprint:</span> {resultado.camisola_sprint}</p>
                  )}
                  {resultado.camisola_montanha && (
                    <p className="text-sm text-zinc-300">🔴 <span className="text-zinc-500">Montanha:</span> {resultado.camisola_montanha}</p>
                  )}
                  {resultado.camisola_juventude && (
                    <p className="text-sm text-zinc-300">⚪ <span className="text-zinc-500">Juventude:</span> {resultado.camisola_juventude}</p>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="card text-center py-8">
              <p className="text-zinc-500 text-sm">
                {prova.status === 'finalizada'
                  ? 'Resultado não disponível.'
                  : 'A aguardar o resultado oficial.'}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
