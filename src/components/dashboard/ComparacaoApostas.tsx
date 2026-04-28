'use client'

import { useState } from 'react'
import type { Aposta, EtapaResultado } from '@/types'
import { getConfigCategoria } from '@/lib/categoriaConfig'

interface Props {
  apostaPrincipal: Aposta
  outrasApostas: Aposta[]
  ultimaEtapa: EtapaResultado | null
  userId: string
}

type Modo = 'lista' | 'comparar_um' | 'comparar_todos'

export default function ComparacaoApostas({ apostaPrincipal, outrasApostas, ultimaEtapa, userId }: Props) {
  const [modo, setModo] = useState<Modo>('lista')
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

    return (
      <div className="card-flush" style={{ overflowX: 'auto' }}>
        {/* Cabeçalho */}
        <div style={{ display: 'grid', gridTemplateColumns: gridCols, borderBottom: '2px solid var(--border)', background: 'var(--surface-2)', minWidth: cols === 3 ? 420 : 280 }}>
          <div style={{ padding: '0.55rem 0.25rem', fontSize: '0.65rem', color: 'var(--text-sub)', textAlign: 'center' }}>#</div>
          {apostas.map((a) => (
            <div key={a.id} style={{
              ...thStyle,
              color: a.user_id === userId ? 'var(--lime)' : 'var(--text)',
            }}>
              {a.perfil?.username ?? '—'}{a.user_id === userId ? ' 👤' : ''}
            </div>
          ))}
          {ultimaEtapa && (
            <div style={{ ...thStyle, color: 'var(--lime)' }}>Real</div>
          )}
        </div>

        {/* Linhas de picks */}
        <div style={{ minWidth: cols === 3 ? 420 : 280 }}>
          {Array.from({ length: numPos }).map((_, idx) => {
            const posApostada = idx + 1
            const isAlto = !isSimples && posApostada <= 10
            const realNome = resultado[idx] ?? ''
            const picks = apostas.map(a => (a.apostas_top20[idx] ?? '').trim())
            const todosIguais = picks.every(p => p && p.toLowerCase() === picks[0].toLowerCase())

            return (
              <div key={idx} style={{
                display: 'grid',
                gridTemplateColumns: gridCols,
                borderBottom: idx < numPos - 1 ? '1px solid var(--border)' : 'none',
                background: todosIguais && picks[0] ? 'rgba(68,136,255,0.04)' : undefined,
              }}>
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '0.68rem', fontWeight: 800,
                  fontFamily: 'Barlow Condensed, sans-serif',
                  color: isSimples || isAlto ? 'var(--lime)' : 'var(--text-sub)',
                  padding: '0.45rem 0.25rem',
                }}>
                  {posApostada}
                </div>
                {apostas.map((a) => {
                  const nome = a.apostas_top20[idx] ?? ''
                  const bg = getPontosCor(nome, posApostada)
                  return (
                    <div key={a.id} style={{
                      padding: '0.45rem 0.5rem',
                      fontSize: '0.78rem',
                      color: nome ? 'var(--text)' : 'var(--text-sub)',
                      borderLeft: '1px solid var(--border)',
                      background: bg || undefined,
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                      {nome || '—'}
                    </div>
                  )
                })}
                {ultimaEtapa && (
                  <div style={{
                    padding: '0.45rem 0.4rem',
                    fontSize: '0.72rem', fontWeight: 600, color: 'var(--lime)',
                    borderLeft: '1px solid var(--border)',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    {realNome || '—'}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Camisolas */}
        {config.temCamisolas && (
          <div style={{ borderTop: '2px solid var(--border)', minWidth: cols === 3 ? 420 : 280 }}>
            {camisolaKeys.map(({ key, label }) => {
              const realVal = getCamisolaReal(key)
              return (
                <div key={key} style={{
                  display: 'grid', gridTemplateColumns: gridCols,
                  borderBottom: key !== 'juventude' ? '1px solid var(--border)' : 'none',
                  background: 'var(--surface-2)',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', padding: '0.45rem 0.25rem' }}>
                    {label.split(' ')[0]}
                  </div>
                  {apostas.map((a) => {
                    const val = getCamisola(a, key)
                    const acertou = ultimaEtapa && val.trim() && val.trim().toLowerCase() === realVal.trim().toLowerCase()
                    return (
                      <div key={a.id} style={{
                        padding: '0.45rem 0.5rem', fontSize: '0.75rem',
                        color: acertou ? 'var(--green)' : val ? 'var(--text)' : 'var(--text-sub)',
                        fontWeight: acertou ? 700 : 400,
                        borderLeft: '1px solid var(--border)',
                        background: acertou ? 'rgba(68,204,136,0.1)' : undefined,
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>
                        {val || '—'}
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
          <div style={{ padding: '0.7rem 0.25rem', fontSize: '0.6rem', color: 'var(--text-sub)', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            pts
          </div>
          {apostas.map((a) => (
            <div key={a.id} style={{ padding: '0.7rem 0.5rem', borderLeft: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 3 }}>
              <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '1.6rem', fontWeight: 900, color: 'var(--lime)' }}>
                {a.pontos_total}
              </span>
              <span style={{ fontSize: '0.6rem', color: 'var(--text-sub)' }}>pts</span>
            </div>
          ))}
          {ultimaEtapa && <div style={{ borderLeft: '1px solid var(--border)' }} />}
        </div>
      </div>
    )
  }

  // Lista de outras apostas
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
                <span style={{ flex: 1, fontSize: '0.9rem', fontWeight: 500, color: 'var(--text)', textAlign: 'left' }}>
                  {a.perfil?.username}
                </span>
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

  // Modo comparação
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
