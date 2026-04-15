'use client'

import { useState, useMemo } from 'react'
import type { Prova } from '@/types'
import NovaProvaForm from './NovaProvaForm'

interface Props {
  provas: Prova[]
  onSelecionar: (prova: Prova) => void
}

type Filtro = 'todas' | 'a_decorrer' | 'futuras' | 'finalizadas'

interface ProvaCategorizada extends Prova {
  estado: 'a_decorrer' | 'futura' | 'finalizada'
  diasAteInicio: number
}

function categorizar(prova: Prova): ProvaCategorizada {
  const hoje = new Date()
  hoje.setHours(0, 0, 0, 0)
  const inicio = new Date(prova.data_inicio)
  const fim = new Date(prova.data_fim)
  const diffMs = inicio.getTime() - hoje.getTime()
  const diasAteInicio = Math.round(diffMs / (1000 * 60 * 60 * 24))

  let estado: ProvaCategorizada['estado']
  if (prova.status === 'finalizada') {
    estado = 'finalizada'
  } else if (hoje >= inicio && hoje <= fim) {
    estado = 'a_decorrer'
  } else if (hoje < inicio) {
    estado = 'futura'
  } else {
    estado = 'a_decorrer'
  }

  return { ...prova, estado, diasAteInicio }
}

export default function ProvasList({ provas, onSelecionar }: Props) {
  const [filtro, setFiltro] = useState<Filtro>('todas')
  const [mostrarNova, setMostrarNova] = useState(false)

  const provasCategorizadas = useMemo(() => {
    const cat = provas.map(categorizar)

    const ordemCategoria: Record<ProvaCategorizada['estado'], number> = {
      a_decorrer: 0,
      futura: 1,
      finalizada: 2,
    }

    return cat.sort((a, b) => {
      if (a.estado !== b.estado) {
        return ordemCategoria[a.estado] - ordemCategoria[b.estado]
      }
      if (a.estado === 'futura') {
        return a.diasAteInicio - b.diasAteInicio
      }
      if (a.estado === 'finalizada') {
        return new Date(b.data_fim).getTime() - new Date(a.data_fim).getTime()
      }
      return new Date(b.data_inicio).getTime() - new Date(a.data_inicio).getTime()
    })
  }, [provas])

  const contagens = useMemo(() => ({
    todas: provasCategorizadas.length,
    a_decorrer: provasCategorizadas.filter(p => p.estado === 'a_decorrer').length,
    futuras: provasCategorizadas.filter(p => p.estado === 'futura').length,
    finalizadas: provasCategorizadas.filter(p => p.estado === 'finalizada').length,
  }), [provasCategorizadas])

  const provasFiltradas = useMemo(() => {
    if (filtro === 'todas') return provasCategorizadas
    if (filtro === 'a_decorrer') return provasCategorizadas.filter(p => p.estado === 'a_decorrer')
    if (filtro === 'futuras') return provasCategorizadas.filter(p => p.estado === 'futura')
    return provasCategorizadas.filter(p => p.estado === 'finalizada')
  }, [provasCategorizadas, filtro])

  function badgeCategoria(p: ProvaCategorizada) {
    if (p.estado === 'a_decorrer') {
      return (
        <span className="badge bg-amber-900/50 text-amber-400 border border-amber-800 text-xs">
          🟢 A decorrer
        </span>
      )
    }
    if (p.estado === 'futura') {
      const txt = p.diasAteInicio === 0
        ? 'Começa hoje'
        : p.diasAteInicio === 1
          ? 'Começa amanhã'
          : `Daqui a ${p.diasAteInicio} dias`
      return (
        <span className="badge bg-blue-900/50 text-blue-400 border border-blue-800 text-xs">
          ⏳ {txt}
        </span>
      )
    }
    return (
      <span className="badge bg-zinc-800 text-zinc-400 border border-zinc-700 text-xs">
        ✅ Finalizada
      </span>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex gap-1 bg-zinc-900 border border-zinc-800 rounded-xl p-1 flex-wrap">
          {([
            ['todas', 'Todas', contagens.todas],
            ['a_decorrer', '🟢 A decorrer', contagens.a_decorrer],
            ['futuras', '⏳ Futuras', contagens.futuras],
            ['finalizadas', '✅ Finalizadas', contagens.finalizadas],
          ] as const).map(([f, label, count]) => (
            <button
              key={f}
              onClick={() => setFiltro(f)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                filtro === f
                  ? 'bg-amber-500 text-zinc-900'
                  : 'text-zinc-400 hover:text-zinc-100'
              }`}
            >
              {label} ({count})
            </button>
          ))}
        </div>

        {!mostrarNova && (
          <button
            onClick={() => setMostrarNova(true)}
            className="btn-primary"
          >
            ➕ Nova prova
          </button>
        )}
      </div>

      {mostrarNova && (
        <NovaProvaForm
          onCreated={() => setMostrarNova(false)}
          onCancel={() => setMostrarNova(false)}
        />
      )}

      {provasFiltradas.length === 0 ? (
        <div className="card text-center py-12 text-zinc-500">
          <p>Não há provas {filtro !== 'todas' ? `na categoria selecionada` : ''}.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {provasFiltradas.map(p => (
            <div
              key={p.id}
              className="flex items-center justify-between gap-3 rounded-lg border border-zinc-800 bg-zinc-900/50 p-4 hover:bg-zinc-900/80 transition-colors"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-zinc-100">{p.nome}</span>
                  {badgeCategoria(p)}
                </div>
                <div className="text-xs text-zinc-500 mt-1">
                  {p.data_inicio} → {p.data_fim}
                </div>
                {p.descricao && (
                  <div className="text-xs text-zinc-400 mt-1 truncate">
                    {p.descricao}
                  </div>
                )}
              </div>
              <button
                onClick={() => onSelecionar(p)}
                className="px-4 py-2 text-sm rounded-md bg-amber-500 text-zinc-900 font-medium hover:bg-amber-400 whitespace-nowrap"
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
