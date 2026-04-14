import type { Aposta } from '@/types'

interface Props {
  apostas: Aposta[]
}

export function UltimasApostas({ apostas }: Props) {
  return (
    <div className="space-y-2">
      {apostas.map((aposta) => (
        <div key={aposta.id} className="card p-4">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <p className="font-medium text-zinc-200 text-sm truncate">
                {aposta.prova?.nome ?? 'Prova desconhecida'}
              </p>
              <p className="text-zinc-500 text-xs mt-0.5">
                {new Date(aposta.created_at).toLocaleDateString('pt-PT')}
              </p>
            </div>
            <div className="text-right flex-shrink-0 ml-3">
              {aposta.calculada ? (
                <div>
                  <p className="text-amber-400 font-bold">{aposta.pontos_total} pts</p>
                  <p className="text-zinc-500 text-xs">{aposta.acertos_exatos} exatos</p>
                </div>
              ) : (
                <span className="badge bg-zinc-800 text-zinc-400 border border-zinc-700">
                  Pendente
                </span>
              )}
            </div>
          </div>

          {/* Mini preview dos top 3 apostados */}
          <div className="mt-2 flex gap-1 flex-wrap">
            {aposta.apostas_top20.slice(0, 3).map((ciclista, idx) => (
              <span
                key={idx}
                className="text-xs bg-zinc-800 px-2 py-0.5 rounded text-zinc-400"
              >
                {idx + 1}. {ciclista}
              </span>
            ))}
            {aposta.apostas_top20.length > 3 && (
              <span className="text-xs text-zinc-600">+{aposta.apostas_top20.length - 3}</span>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
