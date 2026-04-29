'use client'

import type { Aposta, EtapaResultado } from '@/types'
import { calcularPontos, calcularCamisolas } from '@/lib/pontuacao'
import { getConfigCategoria } from '@/lib/categoriaConfig'

interface Props {
  aposta: Aposta
  ultimaEtapa: EtapaResultado | null
  ehProvaUser: boolean
}

export default function ApostaDetalhe({ aposta, ultimaEtapa, ehProvaUser }: Props) {
  const categoria = aposta.prova?.categoria
  const config = getConfigCategoria(categoria)
  const numPos = config.numPosicoes
  const isSimples = categoria === 'monumento' || categoria === 'prova_dia'

  const topAlto = 10
  const topBaixo = 20

  const resultado = ultimaEtapa?.classificacao_geral_top20 ?? Array(20).fill('')
  const adicionais: { posicao: number; nome: string }[] = Array.isArray(ultimaEtapa?.posicoes_adicionais)
    ? (ultimaEtapa!.posicoes_adicionais as { posicao: number; nome: string }[])
    : []
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
    ? calcularPontos(aposta.apostas_top20, resultado, camisolasAposta, camisolasReais, categoria)
    : null

  const camisolaBreakdown = ultimaEtapa && config.temCamisolas
    ? calcularCamisolas(camisolasAposta, camisolasReais)
    : []

  const posReal = new Map<string, number>()
  resultado.slice(0, numPos).forEach((c, i) => { if (c?.trim()) posReal.set(c.trim().toLowerCase(), i + 1) })
  adicionais.forEach(a => { if (a.nome?.trim()) posReal.set(a.nome.trim().toLowerCase(), a.posicao) })

  // Mapa de nome → tempo (da coluna dedicada tempos_classificacao)
  const tempoReal = new Map<string, string>()
  const temposClassificacao = (((ultimaEtapa as unknown as Record<string, unknown>)?.tempos_classificacao) ?? {}) as Record<string, string>
  Object.entries(temposClassificacao).forEach(([nome, tempo]) => {
    if (tempo) tempoReal.set(nome.toLowerCase(), tempo)
  })

  function dadosLinha(apostado: string, posApostada: number) {
    if (!ultimaEtapa || !apostado.trim()) return { pts: 0, posRealVal: null as number | null, color: 'var(--surface-2)' }
    const pr = posReal.get(apostado.trim().toLowerCase()) ?? null
    let pts = 0
    let color = 'var(--surface-2)'

    if (pr !== null) {
      if (isSimples) {
        const exato = posApostada === pr
        pts = exato ? 2 : 1
        color = exato ? 'rgba(68,204,136,0.15)' : 'rgba(68,204,136,0.08)'
      } else {
        const apostadoNoAlto = posApostada <= topAlto
        const apostadoNoBaixo = posApostada > topAlto && posApostada <= topBaixo
        const realNoAlto = pr <= topAlto
        const realNoBaixo = pr > topAlto && pr <= topBaixo

        if (apostadoNoAlto && realNoAlto) {
          pts = 3
          color = pr === posApostada ? 'rgba(68,204,136,0.15)' : 'rgba(68,204,136,0.08)'
        } else if (apostadoNoBaixo && realNoBaixo) {
          pts = 2
          color = pr === posApostada ? 'rgba(68,204,136,0.12)' : 'rgba(255,200,0,0.06)'
        } else if (apostadoNoBaixo && realNoAlto) {
          pts = 1
          color = 'rgba(255,200,0,0.06)'
        }
      }
    }
    return { pts, posRealVal: pr, color }
  }

  const statBoxStyle = (highlight = false) => ({
    borderRadius: '0.875rem', padding: '1rem',
    background: highlight ? 'rgba(200,244,0,0.08)' : 'var(--surface-2)',
    border: `1px solid ${highlight ? 'rgba(200,244,0,0.25)' : 'var(--border)'}`,
    textAlign: 'center' as const,
  })

  const col1Label = isSimples ? 'Acertos' : `Top 1-${topAlto}`
  const col1Sub = isSimples ? '1pt + 1pt exato' : '3 pts/acerto'
  const col2Label = isSimples ? null : `Top ${topAlto + 1}-${topBaixo}`
  const col2Sub = isSimples ? null : '2 pts + bónus'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>

      {/* Score summary */}
      <div className="card-flush animate-fade-up">
        <div style={{ padding: '1rem 1.25rem 0.875rem', borderBottom: '1px solid var(--border)', background: 'linear-gradient(135deg, rgba(200,244,0,0.05) 0%, transparent 60%)' }}>
          <p style={{ fontSize: '0.68rem', color: 'var(--lime)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.2rem' }}>🎯 Pontuação</p>
          <h2 className="section-title" style={{ fontSize: '1.2rem' }}>
            {ehProvaUser ? 'A tua pontuação' : `Pontuação de ${aposta.perfil?.username ?? 'utilizador'}`}
          </h2>
        </div>

        <div style={{ padding: '1rem 1.25rem' }}>
          {!ultimaEtapa ? (
            <div style={{ textAlign: 'center', padding: '1.5rem 0', color: 'var(--text-dim)' }}>
              <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>⏳</div>
              <p style={{ fontSize: '0.875rem' }}>A aguardar primeira atualização da prova.</p>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-sub)', marginTop: '0.35rem' }}>Os pontos são calculados quando o admin inserir a primeira etapa.</p>
            </div>
          ) : (
            <>
              <div style={{
                display: 'grid',
                gridTemplateColumns: isSimples
                  ? 'repeat(2, 1fr)'
                  : `repeat(${config.temCamisolas ? 4 : 3}, 1fr)`,
                gap: '0.625rem',
                marginBottom: '0.875rem'
              }}>
                <div style={statBoxStyle()}>
                  <div style={{ fontSize: '0.68rem', color: 'var(--text-dim)', marginBottom: '0.35rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{col1Label}</div>
                  <div style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '1.75rem', fontWeight: 900, color: 'var(--lime)' }}>{calc!.pontos_top10}</div>
                  <div style={{ fontSize: '0.65rem', color: 'var(--text-sub)', marginTop: '0.2rem' }}>{col1Sub}</div>
                </div>
                {!isSimples && col2Label && (
                  <div style={statBoxStyle()}>
                    <div style={{ fontSize: '0.68rem', color: 'var(--text-dim)', marginBottom: '0.35rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{col2Label}</div>
                    <div style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '1.75rem', fontWeight: 900, color: 'var(--text)' }}>{calc!.pontos_top20}</div>
                    <div style={{ fontSize: '0.65rem', color: 'var(--text-sub)', marginTop: '0.2rem' }}>{col2Sub}</div>
                  </div>
                )}
                {config.temCamisolas && (
                  <div style={statBoxStyle()}>
                    <div style={{ fontSize: '0.68rem', color: 'var(--text-dim)', marginBottom: '0.35rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>🎽</div>
                    <div style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '1.75rem', fontWeight: 900, color: 'var(--text)' }}>{calc!.pontos_camisolas}</div>
                    <div style={{ fontSize: '0.65rem', color: 'var(--text-sub)', marginTop: '0.2rem' }}>1 pt/acerto</div>
                  </div>
                )}
                <div style={statBoxStyle(true)}>
                  <div style={{ fontSize: '0.68rem', color: 'var(--lime)', marginBottom: '0.35rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Total</div>
                  <div style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '2.25rem', fontWeight: 900, color: 'var(--lime)' }}>{calc!.pontos_total}</div>
                  <div style={{ fontSize: '0.65rem', color: 'var(--lime)', opacity: 0.6, marginTop: '0.2rem' }}>pontos</div>
                </div>
              </div>
              <p style={{ fontSize: '0.72rem', color: 'var(--text-sub)', textAlign: 'center' }}>
                Calculado após Etapa {ultimaEtapa.numero_etapa} ({ultimaEtapa.data_etapa}){ultimaEtapa.is_final ? ' · Final' : ''}
              </p>
            </>
          )}
        </div>
      </div>

      {/* Picks */}
      <div className="card-flush animate-fade-up delay-1">
        <div style={{ padding: '1rem 1.25rem 0.875rem', borderBottom: '1px solid var(--border)' }}>
          <p style={{ fontSize: '0.68rem', color: 'var(--lime)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.2rem' }}>📋 Previsão</p>
          <h2 className="section-title" style={{ fontSize: '1.2rem' }}>Top {numPos} apostado</h2>
        </div>
        <div>
          {Array.from({ length: numPos }).map((_, idx) => {
            const apostado = aposta.apostas_top20[idx] ?? ''
            const posApostada = idx + 1
            const { pts, posRealVal: pr, color } = dadosLinha(apostado, posApostada)
            const isAlto = !isSimples && posApostada <= topAlto

            return (
              <div key={idx} style={{
                display: 'flex', alignItems: 'center', gap: '0.75rem',
                padding: '0.625rem 1.25rem',
                borderBottom: idx < numPos - 1 ? '1px solid var(--border)' : 'none',
                background: ultimaEtapa ? color : undefined,
              }}>
                <div style={{
                  width: 28, height: 28, flexShrink: 0, borderRadius: '0.4rem',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '0.72rem', fontWeight: 800,
                  fontFamily: 'Barlow Condensed, sans-serif',
                  background: isSimples || isAlto ? 'rgba(200,244,0,0.1)' : 'var(--surface-2)',
                  border: `1px solid ${isSimples || isAlto ? 'rgba(200,244,0,0.2)' : 'var(--border)'}`,
                  color: isSimples || isAlto ? 'var(--lime)' : 'var(--text-dim)',
                }}>{posApostada}</div>

                <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '0.88rem', color: apostado ? 'var(--text)' : 'var(--text-sub)' }}>
                    {apostado || '—'}
                  </span>
                  {ultimaEtapa && apostado && (
                    pr !== null ? (
                      <span style={{
                        fontSize: '0.7rem', fontWeight: 700, padding: '0.1rem 0.45rem', borderRadius: '999px',
                        background: pr === posApostada ? 'rgba(68,204,136,0.2)' : 'rgba(255,200,0,0.1)',
                        color: pr === posApostada ? 'var(--green)' : '#ffc800',
                        border: `1px solid ${pr === posApostada ? 'rgba(68,204,136,0.3)' : 'transparent'}`,
                      }}>
                        {pr === posApostada ? `✓ ${pr}º` : `→ ${pr}º`}
                      </span>
                    ) : (
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-sub)', background: 'var(--surface-2)', padding: '0.1rem 0.45rem', borderRadius: '999px' }}>fora</span>
                    )
                  )}
                  {/* Tempo ao líder */}
                  {ultimaEtapa && apostado && pr !== null && (() => {
                    const tempo = tempoReal.get(apostado.trim().toLowerCase())
                    if (!tempo) return null
                    return (
                      <span style={{
                        fontSize: '0.68rem', fontWeight: 700,
                        color: '#ff8c00',
                        background: 'rgba(255,140,0,0.12)',
                        padding: '0.1rem 0.45rem', borderRadius: '999px',
                        border: '1px solid rgba(255,140,0,0.3)',
                        fontVariantNumeric: 'tabular-nums',
                      }}>
                        {pr === 1 ? '🥇' : `+${tempo}`}
                      </span>
                    )
                  })()}
                </div>

                <div style={{ flexShrink: 0, textAlign: 'right', minWidth: 28 }}>
                  {ultimaEtapa ? (
                    <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '1rem', fontWeight: 800, color: pts > 0 ? 'var(--lime)' : 'var(--text-sub)' }}>
                      {pts > 0 ? `+${pts}` : '0'}
                    </span>
                  ) : (
                    <span style={{ color: 'var(--text-sub)', fontSize: '0.75rem' }}>—</span>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {ultimaEtapa && (
          <div style={{ padding: '0.625rem 1.25rem', background: 'var(--surface-2)', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.68rem', color: 'var(--text-sub)' }}>✓ posição exata</span>
            <span style={{ fontSize: '0.68rem', color: 'var(--text-sub)' }}>→ Nº está no ranking</span>
            <span style={{ fontSize: '0.68rem', color: 'var(--text-sub)' }}>fora = não classificado</span>
          </div>
        )}
      </div>

      {/* Jerseys */}
      {config.temCamisolas && (
        <div className="card-flush animate-fade-up delay-2">
          <div style={{ padding: '1rem 1.25rem 0.875rem', borderBottom: '1px solid var(--border)' }}>
            <p style={{ fontSize: '0.68rem', color: 'var(--lime)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.2rem' }}>🎽 Especiais</p>
            <h2 className="section-title" style={{ fontSize: '1.2rem' }}>Camisolas</h2>
          </div>
          <div style={{ padding: '1rem 1.25rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '0.75rem' }}>
            {[
              { tipo: 'sprint' as const, label: '🟢 Sprint', apostado: camisolasAposta.sprint, real: camisolasReais.sprint },
              { tipo: 'montanha' as const, label: '🔴 Montanha', apostado: camisolasAposta.montanha, real: camisolasReais.montanha },
              { tipo: 'juventude' as const, label: '⚪ Juventude', apostado: camisolasAposta.juventude, real: camisolasReais.juventude },
            ].map(c => {
              const bd = camisolaBreakdown.find(b => b.tipo === c.tipo)
              const acertou = bd?.acertou ?? false
              return (
                <div key={c.tipo} style={{
                  borderRadius: '0.875rem', padding: '0.875rem',
                  background: ultimaEtapa && acertou ? 'rgba(68,204,136,0.1)' : 'var(--surface-2)',
                  border: `1px solid ${ultimaEtapa && acertou ? 'rgba(68,204,136,0.3)' : 'var(--border)'}`,
                }}>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', marginBottom: '0.35rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{c.label}</div>
                  <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text)', marginBottom: ultimaEtapa ? '0.5rem' : 0 }}>
                    {c.apostado || <span style={{ color: 'var(--text-sub)' }}>sem aposta</span>}
                  </div>
                  {ultimaEtapa && (
                    <div style={{ paddingTop: '0.5rem', borderTop: '1px solid var(--border)', fontSize: '0.75rem' }}>
                      <span style={{ color: 'var(--text-dim)' }}>Real: </span>
                      <span style={{ color: 'var(--text)' }}>{c.real || '—'}</span>
                      {c.apostado && (
                        <span style={{ display: 'block', fontWeight: 800, color: acertou ? 'var(--green)' : 'var(--text-sub)', fontSize: '0.78rem', marginTop: '0.2rem' }}>
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
      )}
    </div>
  )
}
