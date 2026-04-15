import Link from 'next/link'
import type { Prova } from '@/types'
import { categorizarProva, compararProvas } from '@/lib/provaStatus'

interface Props {
  provas: Prova[]
  userId?: string
}

export function ProvasList({ provas, userId }: Props) {
  const futuras = provas
    .map(categorizarProva)
    .filter(p => p.estado === 'futura')
    .sort(compararProvas)

  if (futuras.length === 0) {
    return (
      <div className="card text-center py-8">
        <p className="text-zinc-500 text-sm">Sem provas agendadas</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {futuras.map((prova) => {
        const txtTempo = prova.diasAteInicio === 0
          ? 'Começa hoje'
          : prova.diasAteInicio === 1
            ? 'Começa amanhã'
            : `Daqui a ${prova.diasAteInicio} dias`

        return (
          <div key={prova.id} className="card p-4">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <p className="font-medium text-zinc-100 truncate text-sm">{prova.nome}</p>
                <p className="text-zinc-500 text-xs mt-0.5">
                  {new Date(prova.data_inicio).toLocaleDateString('pt-PT')} →{' '}
                  {new Date(prova.data_fim).toLocaleDateString('pt-PT')}
                </p>
              </div>
              <span className="badge bg-blue-900/50 text-blue-400 border border-blue-800 text-xs flex-shrink-0">
                ⏳ {txtTempo}
              </span>
            </div>

            {prova.descricao && (
              <p className="text-zinc-500 text-xs mt-2 line-clamp-1">{prova.descricao}</p>
            )}

            {userId && (
              <div className="flex gap-2 mt-3">
                <Link
                  href={`/apostas/${prova.id}`}
                  className="btn-primary text-xs px-3 py-1.5"
                >
                  Apostar
                </Link>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
