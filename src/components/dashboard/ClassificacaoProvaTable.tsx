import Link from 'next/link'
import type { Aposta, EtapaResultado, Prova } from '@/types'
import { compararDesempate } from '@/lib/pontuacao'

interface Props {
  prova: Prova
  apostas: Aposta[]
  ultimaEtapa: EtapaResultado | null
  titulo?: string  // override do título (ex.: "Classificação da última prova decorrida")
}

export default function ClassificacaoProvaTable({ prova, apostas, ultimaEtapa, titulo }: Props) {
  const ordenadas = [...apostas].sort(compararDesempate)
  const tituloFinal = titulo ?? `🏆 Classificação atual — ${prova.nome}`

  return (
    <div className="card">
      <div className="flex items-baseline justify-between flex-wrap gap-2 mb-1">
        <h2 className="text-lg font-semibold text-zinc-100">{tituloFinal}</h2>
        {ultimaEtapa && (
          <span className="text-xs text-zinc-500">
            Atualizado após Etapa {ultimaEtapa.numero_etapa} · {ultimaEtapa.data_etapa}
            {ultimaEtapa.is_final && ' · final'}
          </span>
        )}
      </div>

      {ordenadas.length === 0 ? (
        <p className="text-sm text-zinc-500 py-8 text-center">
          Ainda não há apostas nesta prova.
        </p>
      ) : !ultimaEtapa ? (
        <p className="text-sm text-zinc-500 py-8 text-center">
          ⏳ A aguardar primeira atualização. Os pontos serão calculados assim que o admin inserir a primeira etapa.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-zinc-500 border-b border-zinc-800">
                <th className="py-2 px-2 w-10">#</th>
                <th className="py-2 px-2">Jogador</th>
                <th className="py-2 px-2 text-right hidden sm:table-cell">Top-10</th>
                <th className="py-2 px-2 text-right hidden sm:table-cell">Top-20</th>
                <th className="py-2 px-2 text-right hidden sm:table-cell">🎽</th>
                <th className="py-2 px-2 text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {ordenadas.map((a, idx) => {
                const rank = idx + 1
                const medalha = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : null
                return (
                  <tr
                    key={a.id}
                    className="border-b border-zinc-900 hover:bg-zinc-900/40 transition-colors"
                  >
                    <td className="py-2 px-2">
                      <span className="inline-flex items-center justify-center w-7 h-7 rounded-md bg-zinc-800 text-xs font-bold text-zinc-300">
                        {medalha ?? rank}
                      </span>
                    </td>
                    <td className="py-2 px-2">
                      <Link
                        href={`/provas/${prova.id}/apostas/${a.user_id}`}
                        className="text-zinc-100 hover:text-amber-400 font-medium"
                      >
                        {a.perfil?.username ?? 'utilizador'}
                      </Link>
                    </td>
                    <td className="py-2 px-2 text-right text-zinc-400 hidden sm:table-cell">
                      {a.pontos_top10}
                    </td>
                    <td className="py-2 px-2 text-right text-zinc-400 hidden sm:table-cell">
                      {a.pontos_top20}
                    </td>
                    <td className="py-2 px-2 text-right text-zinc-400 hidden sm:table-cell">
                      {a.pontos_camisolas}
                    </td>
                    <td className="py-2 px-2 text-right">
                      <span className="text-amber-400 font-bold">{a.pontos_total}</span>
                      <span className="text-zinc-500 text-xs ml-1">pts</span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
