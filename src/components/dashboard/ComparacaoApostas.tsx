'use client'

import { useState } from 'react'
import type { Aposta, EtapaResultado } from '@/types'
import { getConfigCategoria } from '@/lib/categoriaConfig'

interface Props {
  apostaPrincipal: Aposta
  outrasApostas: Aposta[]
  ultimaEtapa: EtapaResultado | null
  userId: string
  initialModo?: 'lista' | 'comparar_todos'
}

type Modo = 'lista' | 'comparar_um' | 'comparar_todos'

const CORES_JOGADOR = ['#c8f400', '#3b9eff', '#ff9500', '#a78bfa', '#ff4d6d']

export default function ComparacaoApostas({ apostaPrincipal, outrasApostas, ultimaEtapa, userId, initialModo = 'lista' }: Props) {
  const [modo, setModo] = useState<Modo>(initialModo)
  const [apostaSelecionada, setApostaSelecionada] = useState<Aposta | null>(null)

  const categoria = apostaPrincipal.prova?.categoria
  const config = getConfigCategoria(categoria)
  const numPos = config.numPosicoes
  const isSimples = categoria === 'monumento' || categoria === 'prova_dia'

  const resultado = ultimaEtapa?.classificacao_geral_top20 ?? []
  const posReal = new Map<string, number>()
  resultado.slice(0, numPos).forEach((c, i) => {
    if (c?.trim()) posReal.set(c.trim().toLowerCase(), i + 1)
  })

  const camisolaKeys = [
    { key: 'sprint' as const, label: '🟢 Sprint' },
    { key: 'montanha' as const, label: '🔴 Montanha' },
    { key: 'juventude' as const, label: '⚪ Juventude' },
  ]

  function getCamisola(a: Aposta, key: 'sprint' | 'montanha' | 'juventude') {
    if (key === 'sprint') return a.camisola_sprint ?? ''
    if (key === 'montanha') return a.camisola_montanha ?? ''
    return a.camisola_juventude ?? ''
  }

  function getCamisolaReal(key: 'sprint' | 'montanha' | 'juventude') {
    if (!ultimaEtapa) return ''
    if (key === 'sprint') return ultimaEtapa.camisola_sprint ?? ''
    if (key === 'montanha') return ultimaEtapa.camisola_montanha ?? ''
    return ultimaEtapa.camisola_juventude ?? ''
  }

  function getPontosCor(nome: string, posApostada: number): string {
    if (!ultimaEtapa || !nome.trim()) return ''
    const pr = posReal.get(nome.trim().toLowerCase())
    if (!pr) return ''
    if (isSimples) return pr === posApostada ? 'rgba(68,204,136,0.2)' : 'rgba(68,204,136,0.1)'
    const apostadoNoAlto = posApostada <= 10
    const apostadoNoBaixo = posApostada > 10
    const realNoAlto = pr <= 10
    const realNoBaixo = pr > 10
    if (apostadoNoAlto && realNoAlto) return 'rgba(68,204,136,0.2)'
    if (apostadoNoBaixo && realNoBaixo) return 'rgba(68,204,136,0.12)'
    if (apostadoNoBaixo && realNoAlto) return 'rgba(255,200,0,0.08)'
    return ''
  }

  // Para cada posição e cada aposta, determina se o ciclista é único nessa posição
  // (apostado por esse jogador mas não pelos outros nessa zona — top10 ou top20)
  function getUnicidade(apostas: Aposta[], apostaIdx: number, posIdx: number): {
    unico: boolean      // apostado só por este jogador nesta zona (top-10 ou top-20)
    exclusivo: boolean  // apostado só por este jogador em qualquer posição
    corJogador: string
  } {
    const aposta = apostas[apostaIdx]
    const nome = (aposta.apostas_top20[posIdx] ?? '').trim().toLowerCase()
    if (!nome) return { unico: false, exclusivo: false, corJogador: '' }

    const posApostada = posIdx + 1
    const zona = !isSimples && posApostada > 10 ? 'baixo' : 'alto'

    // Verificar se algum outro jogador apostou este ciclista na mesma zona
    const outrosNaZona = apostas
      .filter((_, i) => i !== apostaIdx)
      .some(outra => {
        return outra.apostas_top20.some((n, i) => {
          if (!n) return false
          const nZona = !isSimples && i + 1 > 10 ? 'baixo' : 'alto'
          return n.trim().toLowerCase() === nome && nZona === zona
        })
      })

    // Verificar se algum outro jogador apostou este ciclista em qualquer posição
    const outrosEmQualquerLugar = apostas
      .filter((_, i) => i !== apostaIdx)
      .some(outra => outra.apostas_top20.some(n => n?.trim().toLowerCase() === nome))

    const corJogador = CORES_JOGADOR[apostaIdx % CORES_JOGADOR.length]

    return {
      unico: !outrosNaZona,
      exclusivo: !outrosEmQualquerLugar,
      corJogador,
    }
  }

  function renderComparacao(apostas: Aposta[]) {
    const cols = apostas.length
    const gridCols = `36px repeat(${cols}, 1fr)${ultimaEtapa ? ' 72px' : ''}`

    const thStyle: React.CSSProperties = {
      padding: '0.55rem 0.5rem',
      fontSize: '0.68rem', fontWeight: 700,
      borderLeft: '1px solid var(--border)',
      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
      textAlign: 'center' as const,
    }

    // Contar diferenciais por jogador (ciclistas únicos na zona)
    const contadorUnicos = apostas.map((_, apostIdx) => {
      let count = 0
      for (let posIdx = 0; posIdx < numPos; posIdx++) {
        const { unico } = getUnicidade(apostas, apostIdx, posIdx)
        if (unico) count++
      }
      return count
    })

    return (
      <div className="card-flush" style={{ overflowX: 'auto' }}>

        {/* Legenda de diferenciais */}
        <div style={{ padding: '0.5rem 0.75rem', borderBottom: '1px solid var(--border)', background: 'rgba(255,255,255,0.02)', display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ fontSize: '0.65rem', color: 'var(--text-sub)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Diferenciais:</span>
          {apostas.map((a, i) => (
            <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
              <div style={{ width: 3, height: 14, borderRadius: 2, background: CORES_JOGADOR[i % CORES_JOGADOR.length] }} />
              <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>{a.perfil?.username ?? '—'}</span>
              <span style={{
                fontSize: '0.65rem', fontWeight: 700, padding: '1px 6px', borderRadius: '999px',
                background: contadorUnicos[i] > 0 ? `${CORES_JOGADOR[i % CORES_JOGADOR.length]}22` : 'rgba(255,255,255,0.05)',
                color: contadorUnicos[i] > 0 ? CORES_JOGADOR[i % CORES_JOGADOR.length] : 'var(--text-sub)',
              }}>
                {contadorUnicos[i]} únicos
              </span>
            </div>
          ))}
          <span style={{ fontSize: '0.65rem', color: 'var(--text-sub)', marginLeft: 'auto' }}>
            borda colorida = ciclista exclusivo de um jogador nessa zona
          </span>
        </div>

        {/* Cabeçalho */}
        <div style={{ display: 'grid', gridTemplateColumns: gridCols, borderBottom: '2px solid var(--border)', background: 'var(--surface-2)', minWidth: cols === 3 ? 420 : 280 }}>
          <div style={{ padding: '0.55rem 0.25rem', fontSize: '0.65rem', color: 'var(--text-sub)', textAlign: 'center' }}>#</div>
          {apostas.map((a, i) => (
            <div key={a.id} style={{ ...thStyle, color: a.user_id === userId ? CORES_JOGADOR[0] : 'var(--text)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.3rem' }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: CORES_JOGADOR[i % CORES_JOGADOR.length], flexShrink: 0 }} />
                {a.perfil?.username ?? '—'}{a.user_id === userId ? ' 👤' : ''}
              </div>
            </div>
          ))}
          {ultimaEtapa && <div style={{ ...thStyle, color: 'var(--lime)' }}>Real</div>}
        </div>

        {/* Separador de zona top-10 / top-20 */}
        <div style={{ minWidth: cols === 3 ? 420 : 280 }}>
          {!isSimples && (
            <div style={{ padding: '0.2rem 0.5rem', background: 'rgba(200,244,0,0.04)', borderBottom: '1px solid var(--border)' }}>
              <span style={{ fontSize: '0.6rem', fontWeight: 700, color: 'var(--lime)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>▲ Top 10 — 3pts por acerto</span>
            </div>
          )}
          {Array.from({ length: numPos }).map((_, posIdx) => {
            const posApostada = posIdx + 1
            const isAlto = !isSimples && posApostada <= 10
            const realNome = resultado[posIdx] ?? ''
            const picks = apostas.map(a => (a.apostas_top20[posIdx] ?? '').trim())
            const todosIguais = picks.every(p => p && p.toLowerCase() === picks[0].toLowerCase())

            // Separador entre top-10 e top-20
            const isSeparador = !isSimples && posApostada === 11

            return (
              <>
                {isSeparador && (
                  <div key="sep" style={{ padding: '0.2rem 0.5rem', background: 'rgba(255,255,255,0.02)', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)' }}>
                    <span style={{ fontSize: '0.6rem', fontWeight: 700, color: 'var(--text-sub)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>▼ Top 11–20 — 2pts por acerto</span>
                  </div>
                )}
                <div key={posIdx} style={{
                  display: 'grid', gridTemplateColumns: gridCols,
                  borderBottom: posIdx < numPos - 1 ? '1px solid var(--border)' : 'none',
                  background: todosIguais && picks[0] ? 'rgba(68,136,255,0.04)' : undefined,
                }}>
                  <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '0.68rem', fontWeight: 800, fontFamily: 'Barlow Condensed, sans-serif',
                    color: isSimples || isAlto ? 'var(--lime)' : 'var(--text-sub)',
                    padding: '0.45rem 0.25rem',
                  }}>
                    {posApostada}
                  </div>

                  {apostas.map((a, apostIdx) => {
                    const nome = a.apostas_top20[posIdx] ?? ''
                    const bg = getPontosCor(nome, posApostada)
                    const { unico, exclusivo, corJogador } = getUnicidade(apostas, apostIdx, posIdx)

                    return (
                      <div key={a.id} style={{
                        padding: '0.35rem 0.5rem',
                        borderLeft: '1px solid var(--border)',
                        background: bg || undefined,
                        // Borda esquerda colorida se é diferencial desta zona
                        borderLeftWidth: unico ? 3 : 1,
                        borderLeftColor: unico ? corJogador : 'var(--border)',
                        display: 'flex', alignItems: 'center', gap: '0.3rem',
                        minWidth: 0,
                      }}>
                        <span style={{
                          fontSize: '0.78rem',
                          color: nome ? 'var(--text)' : 'var(--text-sub)',
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                          flex: 1,
                          fontWeight: exclusivo ? 700 : 400,
                        }}>
                          {nome || '—'}
                        </span>
                        {exclusivo && nome && (
                          <span style={{
                            fontSize: '0.55rem', fontWeight: 700, padding: '1px 4px', borderRadius: '3px',
                            background: `${corJogador}22`, color: corJogador, flexShrink: 0,
                            textTransform: 'uppercase', letterSpacing: '0.04em',
                          }}>
                            só {a.perfil?.username?.slice(0, 4) ?? 'eu'}
                          </span>
                        )}
                        {unico && !exclusivo && nome && (
                          <span style={{
                            fontSize: '0.55rem', fontWeight: 700, padding: '1px 4px', borderRadius: '3px',
                            background: 'rgba(255,200,0,0.15)', color: '#ffc800', flexShrink: 0,
                            textTransform: 'uppercase', letterSpacing: '0.04em',
                          }}>
                            zona
                          </span>
                        )}
                      </div>
                    )
                  })}

                  {ultimaEtapa && (
                    <div style={{
                      padding: '0.45rem 0.4rem', fontSize: '0.72rem', fontWeight: 600, color: 'var(--lime)',
                      borderLeft: '1px solid var(--border)',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                      {realNome || '—'}
                    </div>
                  )}
                </div>
              </>
            )
          })}
        </div>

        {/* Camisolas */}
        {config.temCamisolas && (
          <div style={{ borderTop: '2px solid var(--border)', minWidth: cols === 3 ? 420 : 280 }}>
            {camisolaKeys.map(({ key, label }) => {
              const realVal = getCamisolaReal(key)
              const picks = apostas.map(a => getCamisola(a, key).trim().toLowerCase())
              const todosIguais = picks.every(p => p && p === picks[0])

              return (
                <div key={key} style={{
                  display: 'grid', gridTemplateColumns: gridCols,
                  borderBottom: key !== 'juventude' ? '1px solid var(--border)' : 'none',
                  background: 'var(--surface-2)',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', padding: '0.45rem 0.25rem' }}>
                    {label.split(' ')[0]}
                  </div>
                  {apostas.map((a, apostIdx) => {
                    const val = getCamisola(a, key)
                    const acertou = ultimaEtapa && val.trim() && val.trim().toLowerCase() === realVal.trim().toLowerCase()
                    const valLower = val.trim().toLowerCase()
                    const unicoCamisola = !todosIguais && val.trim() && picks.filter(p => p === valLower).length === 1

                    return (
                      <div key={a.id} style={{
                        padding: '0.45rem 0.5rem', fontSize: '0.75rem',
                        color: acertou ? 'var(--green)' : val ? 'var(--text)' : 'var(--text-sub)',
                        fontWeight: acertou || unicoCamisola ? 700 : 400,
                        borderLeft: unicoCamisola ? `3px solid ${CORES_JOGADOR[apostIdx % CORES_JOGADOR.length]}` : '1px solid var(--border)',
                        background: acertou ? 'rgba(68,204,136,0.1)' : undefined,
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        display: 'flex', alignItems: 'center', gap: '0.3rem',
                      }}>
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{val || '—'}</span>
                        {unicoCamisola && val && (
                          <span style={{
                            fontSize: '0.55rem', fontWeight: 700, padding: '1px 4px', borderRadius: '3px',
                            background: `${CORES_JOGADOR[apostIdx % CORES_JOGADOR.length]}22`,
                            color: CORES_JOGADOR[apostIdx % CORES_JOGADOR.length], flexShrink: 0,
                          }}>só</span>
                        )}
                      </div>
                    )
                  })}
                  {ultimaEtapa && (
                    <div style={{ padding: '0.45rem 0.4rem', fontSize: '0.72rem', fontWeight: 600, color: 'var(--lime)', borderLeft: '1px solid var(--border)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {realVal || '—'}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* Totais */}
        <div style={{
          display: 'grid', gridTemplateColumns: gridCols,
          borderTop: '2px solid var(--border)',
          background: 'rgba(200,244,0,0.04)',
          minWidth: cols === 3 ? 420 : 280,
        }}>
          <div style={{ padding: '0.7rem 0.25rem', fontSize: '0.6rem', color: 'var(--text-sub)', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>pts</div>
          {apostas.map((a) => (
            <div key={a.id} style={{ padding: '0.7rem 0.5rem', borderLeft: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 3 }}>
              <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '1.6rem', fontWeight: 900, color: 'var(--lime)' }}>{a.pontos_total}</span>
              <span style={{ fontSize: '0.6rem', color: 'var(--text-sub)' }}>pts</span>
            </div>
          ))}
          {ultimaEtapa && <div style={{ borderLeft: '1px solid var(--border)' }} />}
        </div>
      </div>
    )
  }

  if (modo === 'lista') {
    const todasOrdenadas = [apostaPrincipal, ...outrasApostas].sort((a, b) => b.pontos_total - a.pontos_total)

    return (
      <div className="card-flush animate-fade-up">
        <div style={{ padding: '1rem 1.25rem 0.875rem', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
          <div>
            <p style={{ fontSize: '0.68rem', color: 'var(--lime)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.2rem' }}>👥 Comparar</p>
            <h2 className="section-title" style={{ fontSize: '1.2rem' }}>Outras Apostas</h2>
          </div>
          {outrasApostas.length > 0 && (
            <button
              onClick={() => setModo('comparar_todos')}
              style={{
                padding: '0.45rem 0.875rem', borderRadius: '0.625rem', flexShrink: 0,
                fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer',
                border: '1px solid var(--lime)', background: 'rgba(200,244,0,0.1)',
                color: 'var(--lime)', fontFamily: 'DM Sans, sans-serif',
              }}
            >
              ⚡ Comparar todos
            </button>
          )}
        </div>
        <div>
          {outrasApostas.sort((a, b) => b.pontos_total - a.pontos_total).map((a, i) => {
            const rank = todasOrdenadas.findIndex(x => x.id === a.id) + 1
            const medals = ['🥇', '🥈', '🥉']
            return (
              <button
                key={a.id}
                onClick={() => { setApostaSelecionada(a); setModo('comparar_um') }}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: '0.75rem',
                  padding: '0.75rem 1.25rem',
                  borderBottom: i < outrasApostas.length - 1 ? '1px solid var(--border)' : 'none',
                  cursor: 'pointer', background: 'none', border: 'none', textAlign: 'left',
                  transition: 'background 0.12s',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.03)')}
                onMouseLeave={e => (e.currentTarget.style.background = '')}
              >
                <span style={{ fontSize: rank <= 3 ? '1rem' : '0.78rem', fontWeight: 800, color: rank <= 3 ? 'var(--lime)' : 'var(--text-dim)', fontFamily: 'Barlow Condensed, sans-serif', width: 28, textAlign: 'center', flexShrink: 0 }}>
                  {medals[rank - 1] ?? `#${rank}`}
                </span>
                <span style={{ flex: 1, fontSize: '0.9rem', fontWeight: 500, color: 'var(--text)', textAlign: 'left' }}>{a.perfil?.username}</span>
                <span style={{ fontSize: '0.68rem', color: 'var(--text-dim)', flexShrink: 0 }}>comparar →</span>
                <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '1.15rem', fontWeight: 800, color: rank <= 3 ? 'var(--lime)' : 'var(--text-dim)', flexShrink: 0 }}>
                  {a.pontos_total} <span style={{ fontSize: '0.65rem', color: 'var(--text-sub)' }}>pts</span>
                </span>
              </button>
            )
          })}
        </div>
      </div>
    )
  }

  const apostasParaComparar = modo === 'comparar_todos'
    ? [apostaPrincipal, ...outrasApostas].sort((a) => a.user_id === userId ? -1 : 1)
    : [apostaPrincipal, apostaSelecionada!]

  const titulo = modo === 'comparar_todos'
    ? 'Todos os jogadores'
    : `${apostaPrincipal.perfil?.username ?? 'Tu'} vs ${apostaSelecionada?.perfil?.username ?? ''}`

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }} className="animate-fade-up">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
        <div>
          <p style={{ fontSize: '0.68rem', color: 'var(--lime)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.2rem' }}>⚡ Comparação</p>
          <h2 className="section-title" style={{ fontSize: '1.2rem' }}>{titulo}</h2>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
          {modo === 'comparar_um' && outrasApostas.length > 1 && (
            <button
              onClick={() => setModo('comparar_todos')}
              style={{
                padding: '0.4rem 0.75rem', borderRadius: '0.625rem',
                fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer',
                border: '1px solid var(--lime)', background: 'rgba(200,244,0,0.1)',
                color: 'var(--lime)', fontFamily: 'DM Sans, sans-serif',
              }}
            >
              ⚡ Todos
            </button>
          )}
          <button
            onClick={() => { setModo('lista'); setApostaSelecionada(null) }}
            style={{
              padding: '0.4rem 0.75rem', borderRadius: '0.625rem',
              fontSize: '0.72rem', fontWeight: 600, cursor: 'pointer',
              border: '1px solid var(--border)', background: 'var(--surface-2)',
              color: 'var(--text-dim)', fontFamily: 'DM Sans, sans-serif',
            }}
          >
            ← Voltar
          </button>
        </div>
      </div>

      {renderComparacao(apostasParaComparar)}
    </div>
  )
}
