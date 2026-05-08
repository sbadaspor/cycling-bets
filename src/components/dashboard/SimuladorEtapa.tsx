'use client'

import { useState, useCallback } from 'react'
import type { Aposta, EtapaResultado } from '@/types'
import { calcularPontos } from '@/lib/pontuacao'
import type { CategoriaProvaTipo } from '@/types'
import { nomeExibir } from '@/lib/perfil'

interface Props {
  apostas: Aposta[]
  ultimaEtapa: EtapaResultado
  categoria?: CategoriaProvaTipo
}

const CORES = ['#c8f400', '#3b9eff', '#ff9500', '#a78bfa', '#ff4d6d']

// Calcula pontos para uma lista de apostas contra uma classificação hipotética
function simularPontos(
  apostas: Aposta[],
  classificacaoHipotetica: string[],
  camisolasHipoteticas: { sprint: string; montanha: string; juventude: string },
  categoria?: CategoriaProvaTipo
) {
  return apostas.map(aposta => {
    const calc = calcularPontos(
      aposta.apostas_top20,
      classificacaoHipotetica,
      {
        sprint: aposta.camisola_sprint ?? '',
        montanha: aposta.camisola_montanha ?? '',
        juventude: aposta.camisola_juventude ?? '',
      },
      camisolasHipoteticas,
      categoria
    )
    return {
      userId: aposta.user_id,
      nome: nomeExibir(aposta.perfil, '?'),
      pontosActuais: aposta.pontos_total,
      pontosSimulados: calc.pontos_total,
      delta: calc.pontos_total - aposta.pontos_total,
    }
  })
}

export default function SimuladorEtapa({ apostas, ultimaEtapa, categoria }: Props) {
  const numPos = categoria === 'monumento' || categoria === 'prova_dia' ? 10 : 20
  const isSimples = categoria === 'monumento' || categoria === 'prova_dia'
  const temCamisolas = categoria === 'grande_volta' || categoria === 'prova_semana'

  // Estado do simulador — começa com a classificação actual
  const [classificacao, setClassificacao] = useState<string[]>(
    [...(ultimaEtapa.classificacao_geral_top20 ?? [])].slice(0, numPos).concat(
      Array(Math.max(0, numPos - (ultimaEtapa.classificacao_geral_top20?.length ?? 0))).fill('')
    )
  )
  const [camisolas, setCamisolas] = useState({
    sprint: ultimaEtapa.camisola_sprint ?? '',
    montanha: ultimaEtapa.camisola_montanha ?? '',
    juventude: ultimaEtapa.camisola_juventude ?? '',
  })
  const [editandoPos, setEditandoPos] = useState<number | null>(null)
  const [mostrarSimulador, setMostrarSimulador] = useState(false)

  // Todos os ciclistas que aparecem nas apostas — para sugestões no autocomplete
  const todosCiclistas = [...new Set(
    apostas.flatMap(a => a.apostas_top20.filter(Boolean).map(n => n.trim()))
  )].sort()

  const resultadoActual = apostas
    .map(a => ({ userId: a.user_id, nome: nomeExibir(a.perfil, '?'), pontos: a.pontos_total }))
    .sort((a, b) => b.pontos - a.pontos)

  const resultadoSimulado = simularPontos(apostas, classificacao, camisolas, categoria)
    .sort((a, b) => b.pontosSimulados - a.pontosSimulados)

  // Detectar mudanças de posição no ranking
  const rankActual = new Map(resultadoActual.map((r, i) => [r.userId, i + 1]))
  const rankSimulado = new Map(resultadoSimulado.map((r, i) => [r.userId, i + 1]))

  function updatePos(idx: number, valor: string) {
    setClassificacao(prev => {
      const novo = [...prev]
      novo[idx] = valor
      return novo
    })
  }

  function resetar() {
    setClassificacao(
      [...(ultimaEtapa.classificacao_geral_top20 ?? [])].slice(0, numPos).concat(
        Array(Math.max(0, numPos - (ultimaEtapa.classificacao_geral_top20?.length ?? 0))).fill('')
      )
    )
    setCamisolas({
      sprint: ultimaEtapa.camisola_sprint ?? '',
      montanha: ultimaEtapa.camisola_montanha ?? '',
      juventude: ultimaEtapa.camisola_juventude ?? '',
    })
  }

  // Verificar se há diferenças face ao actual
  const temAlteracoes = classificacao.some(
    (c, i) => c !== (ultimaEtapa.classificacao_geral_top20?.[i] ?? '')
  ) || camisolas.sprint !== (ultimaEtapa.camisola_sprint ?? '')
    || camisolas.montanha !== (ultimaEtapa.camisola_montanha ?? '')
    || camisolas.juventude !== (ultimaEtapa.camisola_juventude ?? '')

  return (
    <div className="card-flush animate-fade-up" style={{ overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ padding: '0.875rem 1.25rem', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
        <div>
          <p style={{ fontSize: '0.68rem', color: 'var(--lime)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.15rem' }}>🔮 Simulador</p>
          <h2 style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '1.2rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>E se amanhã...?</h2>
        </div>
        <button
          onClick={() => setMostrarSimulador(s => !s)}
          style={{
            padding: '0.45rem 0.875rem', borderRadius: '0.625rem', cursor: 'pointer',
            fontSize: '0.75rem', fontWeight: 700, flexShrink: 0,
            border: mostrarSimulador ? '1px solid var(--lime)' : '1px solid var(--border-hi)',
            background: mostrarSimulador ? 'rgba(200,244,0,0.1)' : 'var(--surface-2)',
            color: mostrarSimulador ? 'var(--lime)' : 'var(--text-dim)',
          }}
        >
          {mostrarSimulador ? '▲ Fechar' : '▼ Abrir simulador'}
        </button>
      </div>

      {/* Preview sempre visível — impacto actual */}
      <div style={{ padding: '0.75rem 1.25rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap', borderBottom: mostrarSimulador ? '1px solid var(--border)' : 'none' }}>
        {resultadoActual.map((r, i) => {
          const cor = CORES[apostas.findIndex(a => a.user_id === r.userId) % CORES.length]
          return (
            <div key={r.userId} style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', background: 'var(--surface-2)', borderRadius: '0.5rem', padding: '0.35rem 0.625rem', border: '1px solid var(--border)' }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: cor, flexShrink: 0 }} />
              <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>{r.nome.split(' ')[0]}</span>
              <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '0.9rem', fontWeight: 800, color: i === 0 ? 'var(--lime)' : 'var(--text)' }}>{r.pontos}pts</span>
            </div>
          )
        })}
        <span style={{ fontSize: '0.72rem', color: 'var(--text-sub)', alignSelf: 'center', marginLeft: '0.25rem' }}>← classificação actual</span>
      </div>

      {mostrarSimulador && (
        <>
          {/* Instrução */}
          <div style={{ padding: '0.625rem 1.25rem', background: 'rgba(200,244,0,0.04)', borderBottom: '1px solid var(--border)' }}>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
              Altera a classificação abaixo e vê como os pontos mudariam. Útil para perceber o que está em jogo na próxima etapa.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 0 }}>

            {/* Classificação editável */}
            <div>
              {!isSimples && (
                <div style={{ padding: '0.25rem 1.25rem', background: 'rgba(200,244,0,0.04)', borderBottom: '1px solid var(--border)' }}>
                  <span style={{ fontSize: '0.6rem', fontWeight: 700, color: 'var(--lime)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>▲ Top 10 — 3pts</span>
                </div>
              )}

              {Array.from({ length: numPos }).map((_, idx) => {
                const posApostada = idx + 1
                const isAlto = !isSimples && posApostada <= 10
                const valor = classificacao[idx] ?? ''
                const isSeparador = !isSimples && posApostada === 11

                // Quem apostou este ciclista?
                const apostadoresDeste = apostas.filter(a =>
                  a.apostas_top20.some(n => n?.trim().toLowerCase() === valor.trim().toLowerCase())
                )

                return (
                  <div key={idx}>
                    {isSeparador && (
                      <div style={{ padding: '0.25rem 1.25rem', background: 'rgba(255,255,255,0.02)', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)' }}>
                        <span style={{ fontSize: '0.6rem', fontWeight: 700, color: 'var(--text-sub)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>▼ Top 11–20 — 2pts</span>
                      </div>
                    )}
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: '0.625rem',
                      padding: '0.35rem 1.25rem',
                      borderBottom: idx < numPos - 1 ? '1px solid var(--border)' : 'none',
                      background: editandoPos === idx ? 'rgba(200,244,0,0.04)' : undefined,
                    }}>
                      <span style={{
                        fontFamily: 'Barlow Condensed, sans-serif', fontSize: '0.75rem', fontWeight: 800,
                        color: isSimples || isAlto ? 'var(--lime)' : 'var(--text-sub)',
                        width: 20, textAlign: 'right', flexShrink: 0,
                      }}>{posApostada}</span>

                      <div style={{ flex: 1, position: 'relative' }}>
                        <input
                          type="text"
                          value={valor}
                          onChange={e => updatePos(idx, e.target.value)}
                          onFocus={() => setEditandoPos(idx)}
                          onBlur={() => setEditandoPos(null)}
                          list="simulador-ciclistas"
                          placeholder={`${posApostada}º lugar`}
                          style={{
                            width: '100%', background: 'var(--surface-2)',
                            border: '1px solid var(--border-hi)', borderRadius: '0.4rem',
                            padding: '0.3rem 0.5rem', fontSize: '0.8rem', color: 'var(--text)',
                            outline: 'none', fontFamily: 'DM Sans, sans-serif',
                          }}
                        />
                      </div>

                      {/* Avatares dos apostadores deste ciclista */}
                      {valor.trim() && apostadoresDeste.length > 0 && (
                        <div style={{ display: 'flex', gap: '2px', flexShrink: 0 }}>
                          {apostadoresDeste.map(a => {
                            const cor = CORES[apostas.indexOf(a) % CORES.length]
                            return (
                              <div key={a.user_id} title={nomeExibir(a.perfil)} style={{
                                width: 20, height: 20, borderRadius: '50%', flexShrink: 0,
                                background: a.perfil?.avatar_url ? 'transparent' : `${cor}22`,
                                border: `1.5px solid ${cor}`,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: '0.55rem', fontWeight: 900, color: cor,
                                fontFamily: 'Barlow Condensed, sans-serif', overflow: 'hidden',
                              }}>
                                {a.perfil?.avatar_url
                                  ? <img src={a.perfil.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                  : nomeExibir(a.perfil, '?')[0]?.toUpperCase()
                                }
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}

              <datalist id="simulador-ciclistas">
                {todosCiclistas.map(c => <option key={c} value={c} />)}
              </datalist>
            </div>

            {/* Camisolas */}
            {temCamisolas && (
              <div style={{ borderTop: '2px solid var(--border)' }}>
                <div style={{ padding: '0.25rem 1.25rem', background: 'var(--surface-2)', borderBottom: '1px solid var(--border)' }}>
                  <span style={{ fontSize: '0.6rem', fontWeight: 700, color: 'var(--text-sub)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Camisolas</span>
                </div>
                {[
                  { key: 'sprint' as const, label: '🟢 Sprint' },
                  { key: 'montanha' as const, label: '🔴 Montanha' },
                  { key: 'juventude' as const, label: '⚪ Juventude' },
                ].map(({ key, label }) => (
                  <div key={key} style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', padding: '0.35rem 1.25rem', borderBottom: key !== 'juventude' ? '1px solid var(--border)' : 'none' }}>
                    <span style={{ fontSize: '0.75rem', width: 20, textAlign: 'right', flexShrink: 0 }}>{label.split(' ')[0]}</span>
                    <input
                      type="text"
                      value={camisolas[key]}
                      onChange={e => setCamisolas(prev => ({ ...prev, [key]: e.target.value }))}
                      list="simulador-ciclistas"
                      placeholder="Ciclista"
                      style={{
                        flex: 1, background: 'var(--surface-2)',
                        border: '1px solid var(--border-hi)', borderRadius: '0.4rem',
                        padding: '0.3rem 0.5rem', fontSize: '0.8rem', color: 'var(--text)',
                        outline: 'none', fontFamily: 'DM Sans, sans-serif',
                      }}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Resultado da simulação */}
          <div style={{ borderTop: '2px solid var(--border)', background: 'rgba(200,244,0,0.03)' }}>
            <div style={{ padding: '0.625rem 1.25rem', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <p style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--lime)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                {temAlteracoes ? '🔮 Resultado simulado' : 'Resultado actual'}
              </p>
              {temAlteracoes && (
                <button
                  onClick={resetar}
                  style={{ fontSize: '0.7rem', color: 'var(--text-sub)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}
                >
                  Repor original
                </button>
              )}
            </div>

            {resultadoSimulado.map((r, idx) => {
              const corJogador = CORES[apostas.findIndex(a => a.user_id === r.userId) % CORES.length]
              const rankAnt = rankActual.get(r.userId) ?? 0
              const rankNovo = rankSimulado.get(r.userId) ?? 0
              const subiu = rankNovo < rankAnt
              const desceu = rankNovo > rankAnt

              return (
                <div key={r.userId} style={{
                  display: 'flex', alignItems: 'center', gap: '0.875rem',
                  padding: '0.75rem 1.25rem',
                  borderBottom: idx < resultadoSimulado.length - 1 ? '1px solid var(--border)' : 'none',
                  background: subiu ? 'rgba(68,204,136,0.05)' : desceu ? 'rgba(255,68,68,0.04)' : undefined,
                }}>
                  {/* Posição */}
                  <span style={{
                    fontFamily: 'Barlow Condensed, sans-serif', fontSize: idx < 3 ? '1rem' : '0.82rem',
                    fontWeight: 900, width: 24, textAlign: 'center', flexShrink: 0,
                    color: idx === 0 ? 'var(--lime)' : 'var(--text-sub)',
                  }}>
                    {['🥇', '🥈', '🥉'][idx] ?? `${idx + 1}º`}
                  </span>

                  {/* Indicador de movimento */}
                  {temAlteracoes && (
                    <span style={{
                      fontSize: '0.75rem', width: 16, textAlign: 'center', flexShrink: 0,
                      color: subiu ? 'var(--green)' : desceu ? 'var(--red)' : 'transparent',
                    }}>
                      {subiu ? '▲' : desceu ? '▼' : '–'}
                    </span>
                  )}

                  {/* Avatar + nome */}
                  <div style={{ width: 28, height: 28, borderRadius: '50%', flexShrink: 0, overflow: 'hidden', background: `${corJogador}22`, border: `1.5px solid ${corJogador}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.65rem', fontWeight: 900, color: corJogador, fontFamily: 'Barlow Condensed, sans-serif' }}>
                    {apostas.find(a => a.user_id === r.userId)?.perfil?.avatar_url
                      ? <img src={apostas.find(a => a.user_id === r.userId)!.perfil!.avatar_url!} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      : r.nome[0]?.toUpperCase()
                    }
                  </div>

                  <span style={{ flex: 1, fontSize: '0.9rem', fontWeight: 600, color: idx === 0 ? 'var(--lime)' : 'var(--text)' }}>
                    {r.nome}
                  </span>

                  {/* Pontos actuais → simulados */}
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.35rem', flexShrink: 0 }}>
                    {temAlteracoes && (
                      <>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-sub)', textDecoration: 'line-through' }}>{r.pontosActuais}</span>
                        <span style={{ fontSize: '0.72rem', color: 'var(--text-sub)' }}>→</span>
                      </>
                    )}
                    <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '1.25rem', fontWeight: 900, color: idx === 0 ? 'var(--lime)' : 'var(--text)' }}>
                      {r.pontosSimulados}
                    </span>
                    <span style={{ fontSize: '0.62rem', color: 'var(--text-sub)' }}>pts</span>
                    {temAlteracoes && r.delta !== 0 && (
                      <span style={{
                        fontSize: '0.72rem', fontWeight: 700, padding: '1px 5px', borderRadius: '4px',
                        background: r.delta > 0 ? 'rgba(68,204,136,0.15)' : 'rgba(255,68,68,0.15)',
                        color: r.delta > 0 ? 'var(--green)' : 'var(--red)',
                      }}>
                        {r.delta > 0 ? `+${r.delta}` : r.delta}
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
