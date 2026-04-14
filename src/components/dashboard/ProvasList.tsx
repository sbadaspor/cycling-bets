import Link from 'next/link'
import type { Prova } from '@/types'

interface Props {
  provas: Prova[]
  userId?: string
}

export function ProvasList({ provas, userId }: Props) {
  if (provas.length === 0) {
    return (
      <div className="card text-center py-8">
        <p className="text-zinc-500">Sem provas disponíveis</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {provas.map((prova) => (
        <div key={prova.id} className="card p-4">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <p className="font-medium text-zinc-100 truncate text-sm">{prova.nome}</p>
              <p className="text-zinc-500 text-xs mt-0.5">
                {new Date(prova.data_inicio).toLocaleDateString('pt-PT')} →{' '}
                {new Date(prova.data_fim).toLocaleDateString('pt-PT')}
              </p>
            </div>
            <span className={`badge-${prova.status} flex-shrink-0`}>
              {prova.status === 'aberta' ? '🟢 Aberta' : prova.status === 'fechada' ? '🟡 Fechada' : '✅ Final'}
            </span>
          </div>

          {prova.descricao && (
            <p className="text-zinc-500 text-xs mt-2 line-clamp-1">{prova.descricao}</p>
          )}

          <div className="flex gap-2 mt-3">
            {prova.status === 'aberta' && userId && (
              <Link
                href={`/apostas/${prova.id}`}
                className="btn-primary text-xs px-3 py-1.5"
              >
                Apostar
              </Link>
            )}
            {prova.status !== 'aberta' && (
              <Link
                href={`/provas/${prova.id}`}
                className="btn-secondary text-xs px-3 py-1.5"
              >
                Ver Resultados
              </Link>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
