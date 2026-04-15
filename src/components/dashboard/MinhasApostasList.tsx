'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import type { Prova } from '@/types'
import { categorizarProva, compararProvas, type CategoriaProva } from '@/lib/provaStatus'

interface DadosProva {
  prova: Prova
  temAposta: boolean
  pontos: number
  temStartlist: boolean
}

interface Props {
  dadosPorProva: DadosProva[]
  userId: string
}

type Filtro = 'todas' | 'a_decorrer' | 'futuras' | 'finalizadas'

export default function MinhasApostasList({ dadosPorProva, userId }: Props) {
  const [filtro, setFiltro] = useState<Filtro>('todas')

  const dadosCategorizados = useMemo(() => {
    return dadosPorProva
      .map(d => ({
        ...d,
        cat: categorizarProva(d.prova),
      }))
      .sort((a, b) => compararProvas(a.cat, b.cat))
  }, [dadosPorProva])

  const contagens = useMemo(() => ({
    todas: dadosCategorizados.length,
    a_decorrer: dadosCategorizados.filter(d => d.cat.categoria === 'a_decorrer').length,
    futuras: dadosCategorizados.filter(d => d.cat.categoria === 'futura').length,
    finalizadas: dadosCategorizados.filter(d => d.cat.categoria === 'finalizada').length,
  }), [dadosCategorizados])

  const filtrados = useMemo(() => {
    if (filtro === 'todas') return dadosCategorizados
    const map: Record<Exclude<Filtro, 'todas'>, CategoriaProva> = {
      a_decorrer: 'a_decorrer',
      futuras: 'futura',
      finalizadas: 'finalizada',
    }
    return dadosCategorizados.filter(d => d.cat.categoria === map[filtro])
  }, [dadosCategorizados, filtro])

  function badgeCategoria(cat: ReturnType<typeof categorizarProva>) {
    if (cat.categoria === 'a_decorrer') {
      return <span className="badge bg-amber-900/50 text-amber-400 border border-amber-800 text-xs">🟢 A decorrer</span>
    }
    if (cat.categoria === 'futura') {
      const txt = cat.diasAteInicio === 0 ? 'Começa hoje' : cat.diasAteInicio === 1 ? 'Começa amanhã' : `Daqui a ${cat.diasAteInicio} dias`
      return <span className="badge bg-blue-900/50 text-blue-400 border border-blue-800 text-xs">⏳ {txt}</span>
    }
    return <span className="badge bg-green-900/50 text-green-400 border border-green-800 text-xs">✅ Finalizada</span>
  }

  return (
    <div className="space-y-6">
      {/* Filtros */}
      <div className="flex gap-1 bg-zinc-900 border border-zinc-800 rounded-xl p-1 flex-wrap w-fit">
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
              filtro === f ? 'bg-amber-500 text-zinc-900' : 'text-zinc-400 hover:text-zinc-100'
            }`}
          >
            {label} ({count})
          </button>
        ))}
      </div>

      {/* Lista */}
      {filtrados.length === 0 ? (
        <div className="card text-center py-12 text-zinc-500">
          <p>Não há provas {filtro !== 'todas' ? 'nesta categoria' : ''}.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtrados.map(d => {
            const { prova, cat, temAposta, pontos, temStartlist } = d

            // Determinar ação principal
            let acao: { texto: string; href: string; estilo: string; desativado?: boolean } | null = null

            if (cat.categoria === 'futura') {
              if (!temStartlist) {
                acao = { texto: '⏳ Aguarda startlist', href: '#', estilo: 'bg-zinc-800 text-zinc-500 cursor-not-allowed', desativado: true }
              } else if (temAposta) {
                acao = { texto: '✏️ Editar aposta', href: `/apostas/${prova.id}`, estilo: 'bg-amber-500 text-zinc-900 hover:bg-amber-400' }
              } else {
                acao = { texto: '📝 Apostar', href: `/apostas/${prova.id}`, estilo: 'bg-amber-500 text-zinc-900 hover:bg-amber-400' }
              }
            } else {
              // A decorrer ou finalizada
              if (temAposta) {
                acao = { texto: '👁️ Ver minha aposta', href: `/provas/${prova.id}/apostas/${userId}`, estilo: 'bg-zinc-700 text-zinc-100 hover:bg-zinc-600' }
              } else {
                acao = { texto: '— Sem aposta —', href: '#', estilo: 'bg-zinc-800 text-zinc-500 cursor-not-allowed', desativado: true }
              }
            }

            return (
              <div
                key={prova.id}
                className="flex items-center justify-between gap-3 rounded-lg border border-zinc-800 bg-zinc-900/50 p-4"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-zinc-100">{prova.nome}</span>
                    {badgeCategoria(cat)}
                    {temAposta && cat.categoria !== 'futura' && (
                      <span className="badge bg-amber-500/20 text-amber-400 border border-amber-500/30 text-xs">
                        {pontos} pts
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-zinc-500 mt-1">
                    {prova.data_inicio} → {prova.data_fim}
                  </div>
                </div>

                {acao.desativado ? (
                  <span className={`px-4 py-2 text-sm rounded-md font-medium whitespace-nowrap ${acao.estilo}`}>
                    {acao.texto}
                  </span>
                ) : (
                  <Link
                    href={acao.href}
                    className={`px-4 py-2 text-sm rounded-md font-medium whitespace-nowrap ${acao.estilo}`}
                  >
                    {acao.texto}
                  </Link>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
