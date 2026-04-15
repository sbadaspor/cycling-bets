'use client'

import type { Aposta, EtapaResultado } from '@/types'
import { calcularPontos, calcularCamisolas } from '@/lib/pontuacao'

interface Props {
  aposta: Aposta
  ultimaEtapa: EtapaResultado | null
  ehProvaUser: boolean
}

export default function ApostaDetalhe({ aposta, ultimaEtapa, ehProvaUser }: Props) {
  const resultado = ultimaEtapa?.classificacao_geral_top20 ?? Array(20).fill('')
  const adicionais = ultimaEtapa?.posicoes_adicionais ?? []
  const camisolasReais = {
    sprint: ultimaEtapa?.camisola_sprint ?? '',
    montanha: ultimaEtapa?.camisola_montanha ?? '',
    juventude: ultimaEtapa?.camisola_juventude ?? '',
  }
  const camisolasAposta = {
    sprint: aposta.camisola_sprint ?? '',
    montanha: aposta.camisola_montanha ?? '',
    juventude: aposta.camisola_juventude ?? '',
  }

  const calc = ultimaEtapa
    ? calcularPontos(aposta.apostas_top20, resultado, camisolasAposta, camisolasReais)
    : null

  const camisolaBreakdown = ultimaEtapa
    ? calcularCamisolas(camisolasAposta, camisolasReais)
    : []

  // Mapa: ciclista -> posição real (top 20 + adicionais)
  const posReal = new Map<string, number>()
  resultado.forEach((c, i) => {
    if (c?.trim()) posReal.set(c.trim().toLowerCase(), i + 1)
  })
  adicionais.forEach(a => {
    if (a.nome?.trim()) posReal.set(a.nome.trim().toLowerCase(), a.posicao)
  })

  function dadosLinha(apostado: string, posApostada: number) {
    if (!ultimaEtapa || !apostado.trim()) {
      return { pts: 0, posReal: null as number | null, classe: 'bg-zinc-900/50' }
    }
    const pr = posReal.get(apostado.trim().toLowerCase()) ?? null
    let pts = 0
    let classe = 'bg-zinc-900/50'

    if (pr !== null) {
      const apostadoTop10 = posApostada <= 10
      const realTop10 = pr <= 10
      const realTop20 = pr <= 20

      if (apostadoTop10 && realTop10) {
        pts = 3
        classe = pr === posApostada
          ? 'bg-emerald-900/30 border-emerald-700/40'
          : 'bg-green-900/20 border-green-800/40'
      } else if (!apostadoTop10 && realTop20 && pr > 10) {
        pts = 2
        classe = pr === posApostada
          ? 'bg-emerald-900/30 border-emerald-700/40'
          : 'bg-amber-900/20 border-amber-800/40'
      } else if (!apostadoTop10 && realTop10) {
        pts = 1
        classe = 'bg-amber-900/20 border-amber-800/40'
      }
    }

    return { pts, posReal: pr, classe }
  }

  return (
    <div className="space-y-6">
      {/* Resumo de pontos */}
      <div className="card">
        <h2 className="text-lg font-semibold text-zinc-100 mb-4">
          {ehProvaUser ? '🎯 A tua pontuação' : `🎯 Pontuação de ${aposta.perfil?.username ?? 'utilizador'}`}
        </h2>

        {!ultimaEtapa ? (
          <div className="text-center py-6 text-zinc-500">
            <p>⏳ A aguardar primeira atualização da prova.</p>
            <p className="text-sm mt-1">Os pontos só são calculados depois do admin inserir a primeira etapa.</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-3 text-center">
                <div className="text-xs text-zinc-500 mb-1">Top 1-10</div>
                <div className="text-2xl font-bold text-amber-400">{calc!.pontos_top10}</div>
                <div className="text-xs text-zinc-500 mt-1">3 pts/acerto</div>
              </div>
              <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-3 text-center">
                <div className="text-xs text-zinc-500 mb-1">Top 11-20</div>
                <div className="text-2xl font-bold text-zinc-200">{calc!.pontos_top20}</div>
                <div className="text-xs text-zinc-500 mt-1">2 pts/acerto + 1 bónus</div>
              </div>
              <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-3 text-center">
                <div className="text-xs text-zinc-500 mb-1">Camisolas</div>
                <div className="text-2xl font-bold text-zinc-200">{calc!.pontos_camisolas}</div>
                <div className="text-xs text-zinc-500 mt-1">1 pt/acerto</div>
              </div>
              <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-center">
                <div className="text-xs text-amber-300 mb-1">Total</div>
                <div className="text-3xl font-bold text-amber-400">{calc!.pontos_total}</div>
                <div className="text-xs text-amber-300/70 mt-1">pontos</div>
              </div>
            </div>

            <div className="text-xs text-zinc-500 mt-4 text-center">
              Pontuação calculada com base na <strong>Etapa {ultimaEtapa.numero_etapa}</strong> ({ultimaEtapa.data_etapa}){ultimaEtapa.is_final && ' — etapa final'}
            </div>
          </>
        )}
      </div>

      {/* Top 20 apostado */}
      <div className="card">
        <h2 className="text-lg font-semibold text-zinc-100 mb-4">A minha aposta</h2>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-zinc-500 border-b border-zinc-800">
                <th className="py-2 px-2 w-12">Pos</th>
                <th className="py-2 px-2">Apostado</th>
                <th className="py-2 px-2 text-right w-20">Pontos</th>
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 20 }).map((_, idx) => {
                const apostado = aposta.apostas_top20[idx] ?? ''
                const posApostada = idx + 1
                const { pts, posReal: pr, classe } = dadosLinha(apostado, posApostada)

                return (
                  <tr
                    key={idx}
                    className={`border-b border-zinc-900 ${classe}`}
                  >
                    <td className="py-2 px-2">
                      <span className={`inline-flex items-center justify-center w-7 h-7 rounded-md text-xs font-bold ${
                        idx < 10
                          ? 'bg-amber-500/20 text-amber-400'
                          : 'bg-zinc-800 text-zinc-400'
                      }`}>
                        {posApostada}
                      </span>
                    </td>
                    <td className="py-2 px-2">
                      {apostado ? (
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-zinc-100">{apostado}</span>
                          {ultimaEtapa && (
                            pr !== null ? (
                              <span className={`text-xs px-2 py-0.5 rounded ${
                                pr === posApostada
                                  ? 'bg-emerald-500/20 text-emerald-300'
                                  : pr <= 10
                                    ? 'bg-green-500/20 text-green-300'
                                    : pr <= 20
                                      ? 'bg-amber-500/20 text-amber-300'
                                      : 'bg-zinc-700 text-zinc-300'
                              }`}>
                                {pr === posApostada ? `✓ ${pr}º` : `→ ${pr}º`}
                              </span>
                            ) : (
                              <span className="text-xs px-2 py-0.5 rounded bg-zinc-800 text-zinc-500">
                                fora
                              </span>
                            )
                          )}
                        </div>
                      ) : (
                        <span className="text-zinc-600">—</span>
                      )}
                    </td>
                    <td className="py-2 px-2 text-right">
                      {ultimaEtapa ? (
                        <span className={`font-bold ${pts > 0 ? 'text-amber-400' : 'text-zinc-600'}`}>
                          {pts}
                        </span>
                      ) : (
                        <span className="text-zinc-600">—</span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {ultimaEtapa && (
          <div className="mt-4 text-xs text-zinc-500 flex flex-wrap gap-x-4 gap-y-1">
            <span>✓ posição exata</span>
            <span>→ está no Top-20</span>
            <span>→ XXº = posição real (fora do Top-20)</span>
            <span>fora = sem informação de posição</span>
          </div>
        )}
      </div>

      {/* Camisolas */}
      <div className="card">
        <h2 className="text-lg font-semibold text-zinc-100 mb-4">🎽 Camisolas</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { tipo: 'sprint' as const, label: '🟢 Sprint', apostado: camisolasAposta.sprint, real: camisolasReais.sprint },
            { tipo: 'montanha' as const, label: '🔴 Montanha', apostado: camisolasAposta.montanha, real: camisolasReais.montanha },
            { tipo: 'juventude' as const, label: '⚪ Juventude', apostado: camisolasAposta.juventude, real: camisolasReais.juventude },
          ].map(c => {
            const breakdown = camisolaBreakdown.find(b => b.tipo === c.tipo)
            const acertou = breakdown?.acertou ?? false
            return (
              <div
                key={c.tipo}
                className={`rounded-lg border p-3 ${
                  ultimaEtapa && acertou
                    ? 'border-emerald-700/40 bg-emerald-900/20'
                    : 'border-zinc-800 bg-zinc-900/50'
                }`}
              >
                <div className="text-xs text-zinc-500 mb-1">{c.label}</div>
                <div className="text-sm text-zinc-100 font-medium">
                  {c.apostado || <span className="text-zinc-600">— sem aposta —</span>}
                </div>
                {ultimaEtapa && (
                  <div className="text-xs mt-2 pt-2 border-t border-zinc-800">
                    <span className="text-zinc-500">Real: </span>
                    <span className="text-zinc-300">{c.real || '—'}</span>
                    {c.apostado && (
                      <span className={`ml-2 font-bold ${acertou ? 'text-emerald-400' : 'text-zinc-500'}`}>
                        {acertou ? '✓ +1 pt' : '✗ 0 pts'}
                      </span>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
