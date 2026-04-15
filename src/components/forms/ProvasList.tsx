'use client'

import { useMemo, useState } from 'react'
import type { Prova } from '@/types'
import NovaProvaForm from './NovaProvaForm'

interface Props {
  provas: Prova[]
  onSelect: (prova: Prova) => void
}

type Categoria = 'a_decorrer' | 'futura' | 'finalizada'
type Filtro = 'todas' | Categoria

function categorizar(prova: Prova): Categoria {
  if (prova.status === 'finalizada') return 'finalizada'
  const hoje = new Date()
  hoje.setHours(0, 0, 0, 0)
  const inicio = new Date(prova.data_inicio)
  const fim = new Date(prova.data_fim)
  if (hoje >= inicio && hoje <= fim) return 'a_decorrer'
  if (hoje < inicio) return 'futura'
  // já passou data fim mas não está finalizada (sem etapa final marcada)
  return 'a_decorrer'
}

function diasAte(dataInicio: string): number {
  const hoje = new Date()
  hoje.setHours(0, 0, 0, 0)
  const inicio = new Date(dataInicio)
  const ms = inicio.getTime() - hoje.getTime()
  return Math.round(ms / (1000 * 60 * 60 * 24))
}

function formatarData(d: string): string {
  const [y, m, day] = d.split('-')
  return `${day}/${m}/${y}`
}

export default function ProvasList({ provas, onSelect }: Props) {
  const [filtro, setFiltro] = useState<Filtro>('todas')
  const [criando, setCriando] = useState(false)

  const { ordenadas, contagens } = useMemo(() => {
    const cont: Record<Categoria, number> = { a_decorrer: 0, futura: 0, finalizada: 0 }
    const com = provas.map(p => {
      const cat = categorizar(p)
      cont[cat]++
      return { prova: p, categoria: cat }
    })

    // Ordem: a decorrer → futuras (mais próximas primeiro) → finalizadas (mais recentes primeiro)
    const ordemCategoria: Record<Categoria, number> = {
      a_decorrer: 0,
      futura: 1,
      finalizada: 2,
    }

    com.sort((a, b) => {
      if (a.categoria !== b.categoria) {
        return ordemCategoria[a.categoria] - ordemCategoria[b.categoria]
      }
      if (a.categoria === 'futura') {
        // mais próximas primeiro
        return new Date(a.prova.data_inicio).getTime() - new Date(b.prova.data_inicio).getTime()
      }
      if (a.categoria === 'finalizada') {
        // mais recentes primeiro
        return new Date(b.prova.data_fim).getTime() - new Date(a.prova.data_fim).getTime()
      }
      // a decorrer: mais cedo a começar primeiro
      return new Date(a.prova.data_inicio).getTime() - new Date(b.prova.data_inicio).getTime()
    })

    return { ordenadas: com, contagens: cont }
  }, [provas])

  const filtradas = filtro === 'todas'
    ? ordenadas
    : ordenadas.filter(p => p.categoria === filtro)

  return (
    <div className="space-y-6">
      {/* Cabeçalho com filtros e botão */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex gap-1 bg-zinc-900 border border-zinc-800 rounded-xl p-1 flex-wrap">
          <FiltroBtn label={`Todas (${provas.length})`} ativo={filtro === 'todas'} onClick={() => setFiltro('todas')} />
          <FiltroBtn label={`🟢 A decorrer (${contagens.a_decorrer})`} ativo={filtro === 'a_decorrer'} onClick={() => setFiltro('a_decorrer')} />
          <FiltroBtn label={`⏳ Futuras (${contagens.futura})`} ativo={filtro === 'futura'} onClick={() => setFiltro('futura')} />
          <FiltroBtn label={`✅ Finalizadas (${contagens.finalizada})`} ativo={filtro === 'finalizada'} onClick={() => setFiltro('finalizada')} />
        </div>

        {!criando && (
          <button onClick={() => setCriando(true)} className="btn-primary">
            ➕ Nova prova
          </button>
        )}
      </div>

      {/* Formulário de criação inline */}
      {criando && (
        <NovaProvaForm
          onCreated={() => setCriando(false)}
          onCancel={() => setCriando(false)}
        />
      )}

      {/* Lista */}
      {filtradas.length === 0 ? (
        <div className="card text-center py-12 text-zinc-500">
          <p>Nenhuma prova nesta categoria.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtradas.map(({ prova, categoria }) => (
            <div
              key={prova.id}
              className="flex items-center justify-between gap-3 rounded-lg border border-zinc-800 bg-zinc-900/50 p-4 hover:bg-zinc-900 transition-colors"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <CategoriaBadge categoria={categoria} />
                  <span className="font-bold text-zinc-100 truncate">{prova.nome}</span>
                </div>
                <div className="text-xs text-zinc-500 mt-1">
                  {formatarData(prova.data_inicio)} → {formatarData(prova.data_fim)}
                  {categoria === 'futura' && (
                    <span className="ml-2 text-blue-400">
                      (daqui a {diasAte(prova.data_inicio)} dias)
                    </span>
                  )}
                </div>
                {prova.descricao && (
                  <div className="text-xs text-zinc-600 mt-1 truncate">{prova.descricao}</div>
                )}
              </div>
              <button
                onClick={() => onSelect(prova)}
                className="px-3 py-1.5 text-sm rounded-md bg-zinc-700 hover:bg-zinc-600 whitespace-nowrap"
              >
                Gerir →
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function FiltroBtn({ label, ativo, onClick }: { label: string; ativo: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
        ativo ? 'bg-amber-500 text-zinc-900' : 'text-zinc-400 hover:text-zinc-100'
      }`}
    >
      {label}
    </button>
  )
}

function CategoriaBadge({ categoria }: { categoria: Categoria }) {
  const map: Record<Categoria, { label: string; cls: string }> = {
    a_decorrer: { label: '🟢 A decorrer', cls: 'bg-green-900/40 text-green-300 border-green-800' },
    futura: { label: '⏳ Futura', cls: 'bg-blue-900/40 text-blue-300 border-blue-800' },
    finalizada: { label: '✅ Finalizada', cls: 'bg-zinc-800 text-zinc-400 border-zinc-700' },
  }
  const { label, cls } = map[categoria]
  return (
    <span className={`text-xs px-2 py-0.5 rounded-md border ${cls}`}>
      {label}
    </span>
  )
}
