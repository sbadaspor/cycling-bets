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
type Vista = 'posicoes' | 'ciclistas'

const CORES_JOGADOR = ['#c8f400', '#3b9eff', '#ff9500', '#a78bfa', '#ff4d6d']

function nomeJogador(a: Aposta): string {
  return a.perfil?.full_name?.trim() || a.perfil?.username || '—'
}

export default function ComparacaoApostas({ apostaPrincipal, outrasApostas, ultimaEtapa, userId, initialModo = 'lista' }: Props) {
  const [modo, setModo] = useState<Modo>(initialModo)
  const [apostaSelecionada, setApostaSelecionada] = useState<Aposta | null>(null)
  const [vista, setVista] = useState<Vista>('posicoes')
  // null = sem filtro activo; string = userId do jogador cujos diferenciais estão em destaque
  const [filtroJogador, setFiltroJogador] = useState<string | null>(null)

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
    if (posApostada <= 10 && pr <= 10) return 'rgba(68,204,136,0.2)'
    if (posApostada > 10 && pr > 10) return 'rgba(68,204,136,0.12)'
    if (posApostada > 10 && pr <= 10) return 'rgba(255,200,0,0.08)'
    return ''
  }

  function getZona(posIdx: number): 'alto' | 'baixo' {
    if (isSimples) return 'alto'
    return posIdx < 10 ? 'alto' : 'baixo'
  }

  function getUnicidade(apostas: Aposta[], apostIdx: number, posIdx: number) {
    const aposta = apostas[apostIdx]
    const nome = (aposta.apostas_top20[posIdx] ?? '').trim().toLowerCase()
    if (!nome) return { unico: false, exclusivo: false, corJogador: '' }
    const zona = getZona(posIdx)
    const outrosNaZona = apostas
      .filter((_, i) => i !== apostIdx)
      .some(outra => outra.apostas_top20.some((n, i) => n?.trim().toLowerCase() === nome && getZona(i) === zona))
    const outrosEmQualquerLugar = apostas
      .filter((_, i) => i !== apostIdx)
      .some(outra => outra.apostas_top20.some(n => n?.trim().toLowerCase() === nome))
    return {
      unico: !outrosNaZona,
      exclusivo: !outrosEmQualquerLugar,
      corJogador: CORES_JOGADOR[apostIdx % CORES_JOGADOR.length],
    }
  }

  // Calcula diferenciais por zona para cada jogador
  function calcularDiferenciais(apostas: Aposta[]) {
    return apostas.map((_, apostIdx) => {
      let top10 = 0
      let top20 = 0
      for (let posIdx = 0; posIdx < numPos; posIdx++) {
        const { unico } = getUnicidade(apostas, apostIdx, posIdx)
        if (!unico) continue
        if (getZona(posIdx) === 'alto') top10++
        else top20++
      }
      return { top10, top20 }
    })
  }

  // ============================================================
  // VISTA 1 — Por Posições
  // ============================================================
  function renderVistaPosicoes(apostas: Aposta[]) {
    const cols = apostas.length
    const gridCols = `36px repeat(${cols}, 1fr)${ultimaEtapa ? ' 72px' : ''}`
    const diferenciais = calcularDiferenciais(apostas)

    const thStyle: React.CSSProperties = {
      padding: '0.55rem 0.5rem',
      fontSize: '0.68rem', fontWeight: 700,
      borderLeft: '1px solid var(--border)',
      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
      textAlign: 'center' as const,
    }

    return (
      <div className="card-flush" style={{ overflowX: 'auto' }}>

        {/* Badges de diferenciais clicáveis */}
        <div style={{ padding: '0.6rem 0.75rem', borderBottom: '1px solid var(--border)', background: 'rgba(255,255,255,0.02)', display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ fontSize: '0.65rem', color: 'var(--text-sub)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginRight: '0.25rem' }}>Diferenciais:</span>
          {apostas.map((a, i) => {
            const { top10, top20 } = diferenciais[i]
            const total = top10 + top20
            const isAtivo = filtroJogador === a.user_id
            const cor = CORES_JOGADOR[i % CORES_JOGADOR.length]

            return (
              <button
                key={a.id}
                onClick={() => setFiltroJogador(isAtivo ? null : a.user_id)}
                title={`Clica para destacar os diferenciais de ${nomeJogador(a)}`}
                style={{
                  display: 'flex', alignItems: 'center', gap: '0.4rem',
                  padding: '0.3rem 0.6rem', borderRadius: '999px', cursor: 'pointer',
                  border: isAtivo ? `1px solid ${cor}` : '1px solid rgba(255,255,255,0.1)',
                  background: isAtivo ? `${cor}18` : 'rgba(255,255,255,0.04)',
                  transition: 'all 0.15s',
                }}
              >
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: cor, flexShrink: 0 }} />
                <span style={{ fontSize: '0.72rem', fontWeight: 600, color: isAtivo ? cor : 'var(--text-dim)' }}>
                  {nomeJogador(a)}
                </span>
                {total > 0 ? (
                  <span style={{ display: 'flex', gap: '0.2rem' }}>
                    {top10 > 0 && (
                      <span style={{ fontSize: '0.62rem', fontWeight: 700, padding: '1px 5px', borderRadius: '4px', background: isAtivo ? `${cor}30` : 'rgba(200,244,0,0.1)', color: isAtivo ? cor : 'var(--lime)' }}>
                        T10: {top10}
                      </span>
                    )}
                    {top20 > 0 && !isSimples && (
                      <span style={{ fontSize: '0.62rem', fontWeight: 700, padding: '1px 5px', borderRadius: '4px', background: isAtivo ? `${cor}30` : 'rgba(255,255,255,0.07)', color: isAtivo ? cor : 'var(--text-dim)' }}>
                        T20: {top20}
                      </span>
                    )}
                  </span>
                ) : (
                  <span style={{ fontSize: '0.62rem', color: 'var(--text-sub)', fontStyle: 'italic' }}>0</span>
                )}
                {isAtivo && (
                  <span style={{ fontSize: '0.6rem', color: cor, fontWeight: 700 }}>✕</span>
                )}
              </button>
            )
          })}
          {filtroJogador && (
            <span style={{ fontSize: '0.65rem', color: 'var(--text-sub)', marginLeft: '0.25rem', fontStyle: 'italic' }}>
              a mostrar só os diferenciais · clica novamente para limpar
            </span>
          )}
        </div>

        {/* Cabeçalho */}
        <div style={{ display: 'grid', gridTemplateColumns: gridCols, borderBottom: '2px solid var(--border)', background: 'var(--surface-2)', minWidth: cols === 3 ? 420 : 280 }}>
          <div style={{ padding: '0.55rem 0.25rem', fontSize: '0.65rem', color: 'var(--text-sub)', textAlign: 'center' }}>#</div>
          {apostas.map((a, i) => (
            <div key={a.id} style={{ ...thStyle, color: a.user_id === userId ? CORES_JOGADOR[0] : 'var(--text)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.3rem' }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: CORES_JOGADOR[i % CORES_JOGADOR.length], flexShrink: 0 }} />
                {nomeJogador(a)}{a.user_id === userId ? ' 👤' : ''}
              </div>
            </div>
          ))}
          {ultimaEtapa && <div style={{ ...thStyle, color: 'var(--lime)' }}>Real</div>}
        </div>

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
            const isSeparador = !isSimples && posApostada === 11

            // Se há filtro activo, verificar se esta linha tem um diferencial do jogador filtrado
            const linhaTemDiferencialFiltrado = filtroJogador
              ? apostas.some((a, apostIdx) => {
                  if (a.user_id !== filtroJogador) return false
                  return getUnicidade(apostas, apostIdx, posIdx).unico
                })
              : false

            // Com filtro activo, esconder linhas sem diferencial do jogador seleccionado
            if (filtroJogador && !linhaTemDiferencialFiltrado) return null

            return (
              <>
                {isSeparador && (
                  <div key="sep" style={{ padding: '0.2rem 0.5rem', background: 'rgba(255,255,255,0.02)', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)' }}>
                    <span style={{ fontSize: '0.6rem', fontWeight: 700, color: 'var(--text-sub)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>▼ Top 11–20 — 2pts por acerto</span>
                  </div>
                )}
                <div
                  key={posIdx}
                  style={{
                    display: 'grid', gridTemplateColumns: gridCols,
                    borderBottom: posIdx < numPos - 1 ? '1px solid var(--border)' : 'none',
                    background: linhaTemDiferencialFiltrado
                      ? 'rgba(255,255,255,0.03)'
                      : todosIguais && picks[0] ? 'rgba(68,136,255,0.04)' : undefined,
                  }}
                >
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

                    // Quando há filtro, células de outros jogadores ficam a meia opacidade
                    const estaNoFiltro = filtroJogador === a.user_id
                    const opacidade = filtroJogador && !estaNoFiltro ? 0.35 : 1

                    return (
                      <div key={a.id} style={{
                        padding: '0.35rem 0.5rem',
                        borderLeft: unico ? `3px solid ${corJogador}` : '1px solid var(--border)',
                        background: bg || undefined,
                        display: 'flex', alignItems: 'center', gap: '0.3rem', minWidth: 0,
                        opacity: opacidade,
                        transition: 'opacity 0.15s',
                      }}>
                        <span style={{
                          fontSize: '0.78rem',
                          color: nome ? 'var(--text)' : 'var(--text-sub)',
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                          flex: 1, fontWeight: exclusivo ? 700 : 400,
                        }}>
                          {nome || '—'}
                        </span>
                        {exclusivo && nome && (
                          <span style={{ fontSize: '0.55rem', fontWeight: 700, padding: '1px 4px', borderRadius: '3px', background: `${corJogador}22`, color: corJogador, flexShrink: 0, textTransform: 'uppercase' }}>
                            só {nomeJogador(a).split(' ')[0]}
                          </span>
                        )}
                        {unico && !exclusivo && nome && (
                          <span style={{ fontSize: '0.55rem', fontWeight: 700, padding: '1px 4px', borderRadius: '3px', background: 'rgba(255,200,0,0.15)', color: '#ffc800', flexShrink: 0, textTransform: 'uppercase' }}>
                            zona
                          </span>
                        )}
                      </div>
                    )
                  })}
                  {ultimaEtapa && (
                    <div style={{ padding: '0.45rem 0.4rem', fontSize: '0.72rem', fontWeight: 600, color: 'var(--lime)', borderLeft: '1px solid var(--border)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {realNome || '—'}
                    </div>
                  )}
                </div>
              </>
            )
          })}
        </div>

        {/* Camisolas */}
        {config.temCamisolas && !filtroJogador && (
          <div style={{ borderTop: '2px solid var(--border)', minWidth: cols === 3 ? 420 : 280 }}>
            {camisolaKeys.map(({ key, label }) => {
              const realVal = getCamisolaReal(key)
              const picks = apostas.map(a => getCamisola(a, key).trim().toLowerCase())
              const todosIguais = picks.every(p => p && p === picks[0])
              return (
                <div key={key} style={{ display: 'grid', gridTemplateColumns: gridCols, borderBottom: key !== 'juventude' ? '1px solid var(--border)' : 'none', background: 'var(--surface-2)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', padding: '0.45rem 0.25rem' }}>
                    {label.split(' ')[0]}
                  </div>
                  {apostas.map((a, apostIdx) => {
                    const val = getCamisola(a, key)
                    const acertou = ultimaEtapa && val.trim() && val.trim().toLowerCase() === realVal.trim().toLowerCase()
                    const unicoCamisola = !todosIguais && val.trim() && picks.filter(p => p === val.trim().toLowerCase()).length === 1
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
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', flex: 1 }}>{val || '—'}</span>
                        {unicoCamisola && val && (
                          <span style={{ fontSize: '0.55rem', fontWeight: 700, padding: '1px 4px', borderRadius: '3px', background: `${CORES_JOGADOR[apostIdx % CORES_JOGADOR.length]}22`, color: CORES_JOGADOR[apostIdx % CORES_JOGADOR.length], flexShrink: 0 }}>só</span>
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
        {!filtroJogador && (
          <div style={{ display: 'grid', gridTemplateColumns: gridCols, borderTop: '2px solid var(--border)', background: 'rgba(200,244,0,0.04)', minWidth: cols === 3 ? 420 : 280 }}>
            <div style={{ padding: '0.7rem 0.25rem', fontSize: '0.6rem', color: 'var(--text-sub)', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>pts</div>
            {apostas.map((a) => (
              <div key={a.id} style={{ padding: '0.7rem 0.5rem', borderLeft: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 3 }}>
                <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '1.6rem', fontWeight: 900, color: 'var(--lime)' }}>{a.pontos_total}</span>
                <span style={{ fontSize: '0.6rem', color: 'var(--text-sub)' }}>pts</span>
              </div>
            ))}
            {ultimaEtapa && <div style={{ borderLeft: '1px solid var(--border)' }} />}
          </div>
        )}
      </div>
    )
  }

  // ============================================================
  // VISTA 2 — Por Ciclistas
  // ============================================================
  function renderVistaCiclistas(apostas: Aposta[]) {
    type EntradaCiclista = {
      nome: string
      nomeLower: string
      posicoes: (number | null)[]
    }

    const mapaConhecidos = new Map<string, EntradaCiclista>()
    const ordem: string[] = []

    for (let posIdx = 0; posIdx < numPos; posIdx++) {
      for (const aposta of apostas) {
        const nome = (aposta.apostas_top20[posIdx] ?? '').trim()
        if (!nome) continue
        const key = nome.toLowerCase()
        if (!mapaConhecidos.has(key)) {
          mapaConhecidos.set(key, { nome, nomeLower: key, posicoes: apostas.map(() => null) })
          ordem.push(key)
        }
      }
    }

    for (let posIdx = 0; posIdx < numPos; posIdx++) {
      apostas.forEach((aposta, apostIdx) => {
        const nome = (aposta.apostas_top20[posIdx] ?? '').trim()
        if (!nome) return
        const entry = mapaConhecidos.get(nome.toLowerCase())
        if (entry) entry.posicoes[apostIdx] = posIdx + 1
      })
    }

    const ciclistas = ordem.map(k => mapaConhecidos.get(k)!)
    const ciclistasAlto = ciclistas.filter(c => c.posicoes.some(p => p !== null && (isSimples ? true : p <= 10)))
    const ciclistasBaixo = !isSimples
      ? ciclistas.filter(c => c.posicoes.some(p => p !== null && p > 10))
      : []

    const gridCols = `1fr ${apostas.map(() => '56px').join(' ')}${ultimaEtapa ? ' 56px' : ''}`

    function renderLinhaCiclista(c: EntradaCiclista, idx: number, total: number) {
      const pr = ultimaEtapa
        ? ultimaEtapa.classificacao_geral_top20.findIndex(n => n?.trim().toLowerCase() === c.nomeLower) + 1 || null
        : null

      const zonasPresentes = new Set(c.posicoes.filter(Boolean).map(p => (isSimples || p! <= 10) ? 'alto' : 'baixo'))
      const haZonaDivergente = zonasPresentes.size > 1
      const numApostaram = c.posicoes.filter(p => p !== null).length
      const exclusivo = numApostaram === 1

      return (
        <div key={c.nomeLower} style={{
          display: 'grid', gridTemplateColumns: gridCols,
          borderBottom: idx < total - 1 ? '1px solid var(--border)' : 'none',
          background: haZonaDivergente ? 'rgba(255,200,0,0.04)' : exclusivo ? 'rgba(255,255,255,0.01)' : 'rgba(68,136,255,0.04)',
          alignItems: 'center',
        }}>
          <div style={{ padding: '0.5rem 0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            {haZonaDivergente && <span title="Apostado em zonas diferentes" style={{ fontSize: '0.65rem', color: '#ffc800', fontWeight: 700, flexShrink: 0 }}>⚡</span>}
            <span style={{ fontSize: '0.82rem', fontWeight: exclusivo ? 700 : 500, color: pr ? 'var(--text)' : 'var(--text-dim)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
              {c.nome}
            </span>
            {pr && (
              <span style={{ fontSize: '0.65rem', color: pr <= 10 ? 'var(--lime)' : 'var(--text-sub)', fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 800, flexShrink: 0 }}>
                #{pr}
              </span>
            )}
          </div>
          {c.posicoes.map((pos, apostIdx) => {
            if (pos === null) {
              return (
                <div key={apostIdx} style={{ padding: '0.5rem 0.25rem', textAlign: 'center', borderLeft: '1px solid var(--border)' }}>
                  <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.12)' }}>—</span>
                </div>
              )
            }
            const zona = isSimples ? 'alto' : pos <= 10 ? 'alto' : 'baixo'
            const cor = CORES_JOGADOR[apostIdx % CORES_JOGADOR.length]
            return (
              <div key={apostIdx} style={{ padding: '0.4rem 0.25rem', textAlign: 'center', borderLeft: `2px solid ${cor}`, background: zona === 'alto' ? `${cor}18` : `${cor}0d`, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1px' }}>
                <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '1rem', fontWeight: 900, color: cor, lineHeight: 1 }}>{pos}º</span>
                <span style={{ fontSize: '0.55rem', fontWeight: 700, color: cor, opacity: 0.7, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  {zona === 'alto' ? (isSimples ? 'top' : 't10') : 't20'}
                </span>
              </div>
            )
          })}
          {ultimaEtapa && (
            <div style={{ padding: '0.5rem 0.25rem', textAlign: 'center', borderLeft: '1px solid var(--border)' }}>
              {pr
                ? <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '0.9rem', fontWeight: 800, color: pr <= 10 ? 'var(--lime)' : 'var(--text-sub)' }}>{pr}º</span>
                : <span style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.15)' }}>—</span>
              }
            </div>
          )}
        </div>
      )
    }

    return (
      <div className="card-flush" style={{ overflowX: 'auto' }}>
        <div style={{ padding: '0.5rem 0.75rem', borderBottom: '1px solid var(--border)', background: 'rgba(255,255,255,0.02)', display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
          {apostas.map((a, i) => (
            <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <div style={{ width: 3, height: 16, borderRadius: 2, background: CORES_JOGADOR[i % CORES_JOGADOR.length] }} />
              <span style={{ fontSize: '0.72rem', color: CORES_JOGADOR[i % CORES_JOGADOR.length], fontWeight: 600 }}>
                {nomeJogador(a)}{a.user_id === userId ? ' 👤' : ''}
              </span>
            </div>
          ))}
          <span style={{ fontSize: '0.65rem', color: 'var(--text-sub)', marginLeft: 'auto' }}>⚡ = zonas diferentes</span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: gridCols, borderBottom: '2px solid var(--border)', background: 'var(--surface-2)' }}>
          <div style={{ padding: '0.5rem 0.75rem', fontSize: '0.65rem', color: 'var(--text-sub)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Ciclista</div>
          {apostas.map((a, i) => (
            <div key={a.id} style={{ padding: '0.5rem 0.25rem', borderLeft: `2px solid ${CORES_JOGADOR[i % CORES_JOGADOR.length]}`, textAlign: 'center', fontSize: '0.65rem', fontWeight: 700, color: CORES_JOGADOR[i % CORES_JOGADOR.length], textTransform: 'uppercase', letterSpacing: '0.04em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {nomeJogador(a).split(' ')[0]}
            </div>
          ))}
          {ultimaEtapa && (
            <div style={{ padding: '0.5rem 0.25rem', borderLeft: '1px solid var(--border)', textAlign: 'center', fontSize: '0.65rem', fontWeight: 700, color: 'var(--lime)', textTransform: 'uppercase' }}>Real</div>
          )}
        </div>

        {ciclistasAlto.length > 0 && (
          <>
            <div style={{ padding: '0.2rem 0.75rem', background: 'rgba(200,244,0,0.04)', borderBottom: '1px solid var(--border)' }}>
              <span style={{ fontSize: '0.6rem', fontWeight: 700, color: 'var(--lime)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>▲ Top {isSimples ? numPos : 10} — {isSimples ? '1-2' : '3'}pts por acerto</span>
            </div>
            {ciclistasAlto.map((c, i) => renderLinhaCiclista(c, i, ciclistasAlto.length))}
          </>
        )}

        {ciclistasBaixo.length > 0 && (
          <>
            <div style={{ padding: '0.2rem 0.75rem', background: 'rgba(255,255,255,0.02)', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)' }}>
              <span style={{ fontSize: '0.6rem', fontWeight: 700, color: 'var(--text-sub)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>▼ Top 11–20 — 2pts por acerto</span>
            </div>
            {ciclistasBaixo.map((c, i) => renderLinhaCiclista(c, i, ciclistasBaixo.length))}
          </>
        )}

        {config.temCamisolas && (
          <div style={{ borderTop: '2px solid var(--border)' }}>
            <div style={{ padding: '0.2rem 0.75rem', background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid var(--border)' }}>
              <span style={{ fontSize: '0.6rem', fontWeight: 700, color: 'var(--text-sub)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Camisolas — 1pt cada</span>
            </div>
            {camisolaKeys.map(({ key, label }) => {
              const realVal = getCamisolaReal(key)
              const vals = apostas.map(a => getCamisola(a, key).trim())
              const gridColsCam = `1fr ${apostas.map(() => '56px').join(' ')}${ultimaEtapa ? ' 56px' : ''}`
              return (
                <div key={key} style={{ display: 'grid', gridTemplateColumns: gridColsCam, borderBottom: key !== 'juventude' ? '1px solid var(--border)' : 'none', background: 'var(--surface-2)', alignItems: 'center' }}>
                  <div style={{ padding: '0.45rem 0.75rem', fontSize: '0.75rem', color: 'var(--text-dim)' }}>{label}</div>
                  {vals.map((val, apostIdx) => {
                    const acertou = ultimaEtapa && val && val.toLowerCase() === realVal.toLowerCase()
                    const cor = CORES_JOGADOR[apostIdx % CORES_JOGADOR.length]
                    return (
                      <div key={apostIdx} style={{ padding: '0.45rem 0.25rem', textAlign: 'center', borderLeft: val ? `2px solid ${cor}` : '1px solid var(--border)', background: acertou ? 'rgba(68,204,136,0.12)' : val ? `${cor}0d` : undefined, overflow: 'hidden' }}>
                        <span style={{ fontSize: '0.68rem', fontWeight: acertou ? 700 : 500, color: acertou ? 'var(--green)' : val ? cor : 'rgba(255,255,255,0.15)', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {val || '—'}
                        </span>
                      </div>
                    )
                  })}
                  {ultimaEtapa && (
                    <div style={{ padding: '0.45rem 0.25rem', borderLeft: '1px solid var(--border)', textAlign: 'center' }}>
                      <span style={{ fontSize: '0.68rem', fontWeight: 600, color: 'var(--lime)', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{realVal || '—'}</span>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: gridCols, borderTop: '2px solid var(--border)', background: 'rgba(200,244,0,0.04)' }}>
          <div style={{ padding: '0.7rem 0.75rem', fontSize: '0.72rem', color: 'var(--text-sub)', fontWeight: 700 }}>Total</div>
          {apostas.map((a, i) => (
            <div key={a.id} style={{ padding: '0.6rem 0.25rem', borderLeft: `2px solid ${CORES_JOGADOR[i % CORES_JOGADOR.length]}`, display: 'flex', flexDirection: 'column', alignItems: 'center', background: `${CORES_JOGADOR[i % CORES_JOGADOR.length]}0d` }}>
              <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '1.4rem', fontWeight: 900, color: CORES_JOGADOR[i % CORES_JOGADOR.length], lineHeight: 1 }}>{a.pontos_total}</span>
              <span style={{ fontSize: '0.55rem', color: 'var(--text-sub)' }}>pts</span>
            </div>
          ))}
          {ultimaEtapa && <div style={{ borderLeft: '1px solid var(--border)' }} />}
        </div>
      </div>
    )
  }

  // ============================================================
  // RENDER PRINCIPAL
  // ============================================================
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
            <button onClick={() => setModo('comparar_todos')} style={{ padding: '0.45rem 0.875rem', borderRadius: '0.625rem', flexShrink: 0, fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer', border: '1px solid var(--lime)', background: 'rgba(200,244,0,0.1)', color: 'var(--lime)', fontFamily: 'DM Sans, sans-serif' }}>
              ⚡ Comparar todos
            </button>
          )}
        </div>
        <div>
          {outrasApostas.sort((a, b) => b.pontos_total - a.pontos_total).map((a, i) => {
            const rank = todasOrdenadas.findIndex(x => x.id === a.id) + 1
            const medals = ['🥇', '🥈', '🥉']
            return (
              <button key={a.id} onClick={() => { setApostaSelecionada(a); setModo('comparar_um') }}
                style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1.25rem', borderBottom: i < outrasApostas.length - 1 ? '1px solid var(--border)' : 'none', cursor: 'pointer', background: 'none', border: 'none', textAlign: 'left', transition: 'background 0.12s' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.03)')}
                onMouseLeave={e => (e.currentTarget.style.background = '')}>
                <span style={{ fontSize: rank <= 3 ? '1rem' : '0.78rem', fontWeight: 800, color: rank <= 3 ? 'var(--lime)' : 'var(--text-dim)', fontFamily: 'Barlow Condensed, sans-serif', width: 28, textAlign: 'center', flexShrink: 0 }}>
                  {medals[rank - 1] ?? `#${rank}`}
                </span>
                <span style={{ flex: 1, fontSize: '0.9rem', fontWeight: 500, color: 'var(--text)', textAlign: 'left' }}>{nomeJogador(a)}</span>
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
    : `${nomeJogador(apostaPrincipal)} vs ${nomeJogador(apostaSelecionada!)}`

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }} className="animate-fade-up">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', flexWrap: 'wrap' }}>
        <div>
          <p style={{ fontSize: '0.68rem', color: 'var(--lime)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.2rem' }}>⚡ Comparação</p>
          <h2 className="section-title" style={{ fontSize: '1.2rem' }}>{titulo}</h2>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', borderRadius: '0.5rem', overflow: 'hidden', border: '1px solid var(--border)' }}>
            <button
              onClick={() => { setVista('posicoes'); setFiltroJogador(null) }}
              style={{ padding: '0.35rem 0.7rem', fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer', border: 'none', background: vista === 'posicoes' ? 'rgba(200,244,0,0.15)' : 'var(--surface-2)', color: vista === 'posicoes' ? 'var(--lime)' : 'var(--text-dim)', fontFamily: 'DM Sans, sans-serif' }}>
              📋 Posições
            </button>
            <button
              onClick={() => { setVista('ciclistas'); setFiltroJogador(null) }}
              style={{ padding: '0.35rem 0.7rem', fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer', border: 'none', borderLeft: '1px solid var(--border)', background: vista === 'ciclistas' ? 'rgba(200,244,0,0.15)' : 'var(--surface-2)', color: vista === 'ciclistas' ? 'var(--lime)' : 'var(--text-dim)', fontFamily: 'DM Sans, sans-serif' }}>
              🚴 Ciclistas
            </button>
          </div>
          {modo === 'comparar_um' && outrasApostas.length > 1 && (
            <button onClick={() => setModo('comparar_todos')} style={{ padding: '0.4rem 0.75rem', borderRadius: '0.625rem', fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer', border: '1px solid var(--lime)', background: 'rgba(200,244,0,0.1)', color: 'var(--lime)', fontFamily: 'DM Sans, sans-serif' }}>
              ⚡ Todos
            </button>
          )}
          <button onClick={() => { setModo('lista'); setApostaSelecionada(null); setFiltroJogador(null) }} style={{ padding: '0.4rem 0.75rem', borderRadius: '0.625rem', fontSize: '0.72rem', fontWeight: 600, cursor: 'pointer', border: '1px solid var(--border)', background: 'var(--surface-2)', color: 'var(--text-dim)', fontFamily: 'DM Sans, sans-serif' }}>
            ← Voltar
          </button>
        </div>
      </div>

      {vista === 'posicoes'
        ? renderVistaPosicoes(apostasParaComparar)
        : renderVistaCiclistas(apostasParaComparar)
      }
    </div>
  )
}
