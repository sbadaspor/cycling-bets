import type { CategoriaProvaTipo, VitoriasJogador } from '@/types'

interface Props {
  vitorias: VitoriasJogador[]
}

const CATEGORIAS: { tipo: CategoriaProvaTipo; label: string; emoji: string }[] = [
  { tipo: 'grande_volta', label: 'Grandes Voltas', emoji: '🏔️' },
  { tipo: 'prova_semana', label: 'Provas de uma semana', emoji: '📅' },
  { tipo: 'monumento', label: 'Monumentos', emoji: '🗿' },
  { tipo: 'prova_dia', label: 'Provas de um dia', emoji: '⚡' },
]

export default function VitoriasJogadores({ vitorias }: Props) {
  if (vitorias.length === 0) {
    return null
  }

  // Determinar quais categorias têm pelo menos 1 vitória (para esconder colunas vazias)
  const categoriasComVitorias = CATEGORIAS.filter(c =>
    vitorias.some(v => v.porCategoria[c.tipo] > 0)
  )

  const maxTotal = Math.max(...vitorias.map(v => v.total))

  return (
    <div className="space-y-6">
      {/* Quadro de vitórias totais */}
      <div className="card">
        <h2 className="text-lg font-semibold text-zinc-100 mb-4">
          🏆 Vitórias totais
        </h2>
        <div className="space-y-2">
          {vitorias.map((v, idx) => {
            const medalha = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : null
            const percentagem = maxTotal > 0 ? (v.total / maxTotal) * 100 : 0
            return (
              <div
                key={v.perfil.id}
                className="flex items-center gap-3 rounded-lg border border-zinc-800 bg-zinc-900/50 p-3"
              >
                <span className="inline-flex items-center justify-center w-10 h-10 rounded-md bg-zinc-800 text-base font-bold text-zinc-300 flex-shrink-0">
                  {medalha ?? `#${idx + 1}`}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="text-zinc-100 font-medium truncate">
                      {v.perfil.username}
                    </span>
                    <span className="text-amber-400 font-bold whitespace-nowrap">
                      {v.total} {v.total === 1 ? 'vitória' : 'vitórias'}
                    </span>
                  </div>
                  <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-amber-500 rounded-full transition-all"
                      style={{ width: `${percentagem}%` }}
                    />
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Quadro de vitórias por categoria */}
      {categoriasComVitorias.length > 0 && (
        <div className="card">
          <h2 className="text-lg font-semibold text-zinc-100 mb-4">
            🏅 Vitórias por categoria
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-zinc-500 border-b border-zinc-800">
                  <th className="py-2 px-2">Jogador</th>
                  {categoriasComVitorias.map(c => (
                    <th key={c.tipo} className="py-2 px-2 text-center">
                      <div className="flex flex-col items-center gap-0.5">
                        <span>{c.emoji}</span>
                        <span className="font-normal">{c.label}</span>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {vitorias.map(v => (
                  <tr key={v.perfil.id} className="border-b border-zinc-900">
                    <td className="py-2 px-2 text-zinc-100 font-medium">
                      {v.perfil.username}
                    </td>
                    {categoriasComVitorias.map(c => {
                      const n = v.porCategoria[c.tipo]
                      return (
                        <td
                          key={c.tipo}
                          className="py-2 px-2 text-center"
                        >
                          <span className={n > 0 ? 'text-amber-400 font-bold' : 'text-zinc-600'}>
                            {n}
                          </span>
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
