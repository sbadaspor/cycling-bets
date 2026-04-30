'use client'

import { useState } from 'react'

interface ApostaHistorica {
  id: string
  ano: number
  nome_prova: string
  categoria: string
  apostas_top: string[]
  resultado_real_top: string[]
  pontos_total: number
  camisola_sprint_apostada?: string
  camisola_sprint_real?: string
  camisola_montanha_apostada?: string
  camisola_montanha_real?: string
  camisola_juventude_apostada?: string
  camisola_juventude_real?: string
}

interface CiclistaStats {
  nome: string
  vezes_apostado: number
  vezes_acertou: number
  pontos_gerados: number
  taxa_acerto: number
  provas: string[]
}

interface Props {
  apostas: ApostaHistorica[]
}

export default function CiclistasHistoricosCard({ apostas }: Props) {
  const [vista, setVista] = useState<'rentaveis' | 'favoritos' | 'falhancos' | 'detalhe'>('rentaveis')
  const [provaDetalhe, setProvaDetalhe] = useState<ApostaHistorica | null>(null)

  if (apostas.length === 0) return null

  // Calcular stats por ciclista
  // REGRA: se o mesmo ciclista aparece no top E nas camisolas da mesma prova,
  // conta apenas como 1 aposta (mas pode gerar pontos de ambos)
  const statsMap = new Map<string, CiclistaStats>()

  for (const aposta of apostas) {
    // Conjunto de nomes já processados para esta prova (evita duplicados)
    const processadosNestaProva = new Set<string>()

    // Processar GC top
    for (const nome of aposta.apostas_top ?? []) {
      if (!nome?.trim()) continue
      const key = nome.trim().toLowerCase()
      if (!statsMap.has(key)) {
        statsMap.set(key, { nome: nome.trim(), vezes_apostado: 0, vezes_acertou: 0, pontos_gerados: 0, taxa_acerto: 0, provas: [] })
      }
      const realSet = new Set((aposta.resultado_real_top ?? []).map((n: string) => n.trim().toLowerCase()).filter(Boolean))
      const s = statsMap.get(key)!
      if (!processadosNestaProva.has(key)) {
        s.vezes_apostado++
        s.provas.push(`${aposta.nome_prova} ${aposta.ano}`)
        processadosNestaProva.add(key)
      }
      if (realSet.has(key)) {
        s.vezes_acertou++
        s.pontos_gerados++
      }
    }

    // Processar camisolas — não incrementa vezes_apostado se já estava no GC
    const pares = [
      { apostada: aposta.camisola_sprint_apostada, real: aposta.camisola_sprint_real },
      { apostada: aposta.camisola_montanha_apostada, real: aposta.camisola_montanha_real },
      { apostada: aposta.camisola_juventude_apostada, real: aposta.camisola_juventude_real },
    ]
    for (const { apostada, real } of pares) {
      if (!apostada?.trim()) continue
      const key = apostada.trim().toLowerCase()
      if (!statsMap.has(key)) {
        statsMap.set(key, { nome: apostada.trim(), vezes_apostado: 0, vezes_acertou: 0, pontos_gerados: 0, taxa_acerto: 0, provas: [] })
      }
      const s = statsMap.get(key)!
      // Só incrementar apostas se ainda não foi contabilizado nesta prova (não estava no GC)
      if (!processadosNestaProva.has(key)) {
        s.vezes_apostado++
        s.provas.push(`${aposta.nome_prova} ${aposta.ano}`)
        processadosNestaProva.add(key)
      }
      // Pontos de camisola são sempre contabilizados
      if (real && apostada.trim().toLowerCase() === real.trim().toLowerCase()) {
        s.vezes_acertou++
        s.pontos_gerados++
      }
    }
  }

  // Calcular taxa
  for (const s of statsMap.values()) {
    s.taxa_acerto = s.vezes_apostado > 0 ? Math.round((s.vezes_acertou / s.vezes_apostado) * 100) : 0
  }

  const todos = [...statsMap.values()]
  const rentaveis = [...todos].sort((a, b) => b.pontos_gerados - a.pontos_gerados || b.taxa_acerto - a.taxa_acerto).slice(0, 10)
  const favoritos = [...todos].sort((a, b) => b.vezes_apostado - a.vezes_apostado).slice(0, 10)
  const falhancos = [...todos].filter(s => s.vezes_apostado >= 2 && s.vezes_acertou === 0).sort((a, b) => b.vezes_apostado - a.vezes_apostado).slice(0, 10)

  const VISTAS = [
    { key: 'rentaveis', label: '💰 Mais rentáveis' },
    { key: 'favoritos', label: '❤️ Mais apostados' },
    { key: 'falhancos', label: '💀 Mais falhados' },
    { key: 'detalhe', label: '📋 Por prova' },
  ] as const

  const listaAtual = vista === 'rentaveis' ? rentaveis : vista === 'favoritos' ? favoritos : vista === 'falhancos' ? falhancos : []

  return (
    <div className="card-flush animate-fade-up" style={{ overflow: 'hidden' }}>
      <div style={{ padding: '0.875rem 1.25rem', borderBottom: '1px solid var(--border)', background: 'linear-gradient(135deg, rgba(200,244,0,0.05) 0%, transparent 60%)' }}>
        <p style={{ fontSize: '0.68rem', color: 'var(--lime)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.15rem' }}>🚴 Histórico</p>
        <h2 style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '1.2rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Análise de Ciclistas</h2>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', overflowX: 'auto', borderBottom: '1px solid var(--border)', scrollbarWidth: 'none' }}>
        {VISTAS.map(v => (
          <button key={v.key} onClick={() => setVista(v.key)} style={{
            padding: '0.625rem 0.875rem', border: 'none', background: 'transparent', cursor: 'pointer',
            fontSize: '0.72rem', fontWeight: 700, whiteSpace: 'nowrap',
            color: vista === v.key ? 'var(--lime)' : 'var(--text-dim)',
            borderBottom: `2px solid ${vista === v.key ? 'var(--lime)' : 'transparent'}`,
            transition: 'color 0.15s',
          }}>{v.label}</button>
        ))}
      </div>

      {/* Lista */}
      {vista !== 'detalhe' && (
        <div>
          {listaAtual.length === 0 ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-dim)', fontSize: '0.85rem' }}>
              {vista === 'falhancos' ? 'Sem ciclistas apostados 2+ vezes e nunca acertados.' : 'Sem dados.'}
            </div>
          ) : (
            listaAtual.map((s, i) => (
              <div key={s.nome} style={{ display: 'flex', alignItems: 'center', gap: '0.875rem', padding: '0.6rem 1.25rem', borderBottom: i < listaAtual.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
                <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '0.9rem', fontWeight: 900, width: 22, color: i < 3 ? 'var(--lime)' : 'var(--text-sub)', textAlign: 'center', flexShrink: 0 }}>
                  {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}`}
                </span>
                <span style={{ flex: 1, fontSize: '0.875rem', fontWeight: 500, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.nome}</span>
                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexShrink: 0 }}>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-sub)' }}>{s.vezes_acertou}/{s.vezes_apostado}</span>
                  <div style={{ width: 36, height: 4, background: 'var(--surface-2)', borderRadius: '999px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${s.taxa_acerto}%`, background: s.taxa_acerto >= 60 ? 'var(--lime)' : s.taxa_acerto >= 30 ? '#ff9500' : '#ff6b6b', borderRadius: '999px' }} />
                  </div>
                  <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '1rem', fontWeight: 900, color: vista === 'rentaveis' ? 'var(--lime)' : s.taxa_acerto >= 50 ? 'var(--lime)' : 'var(--text-dim)', minWidth: '2rem', textAlign: 'right' }}>
                    {vista === 'rentaveis' ? `${s.pontos_gerados}pt` : vista === 'falhancos' ? `${s.vezes_apostado}x` : `${s.taxa_acerto}%`}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Vista por prova */}
      {vista === 'detalhe' && (
        <div>
          {provaDetalhe ? (
            <div>
              <button onClick={() => setProvaDetalhe(null)} style={{ padding: '0.625rem 1.25rem', fontSize: '0.75rem', color: 'var(--text-dim)', background: 'none', border: 'none', cursor: 'pointer', borderBottom: '1px solid var(--border)', width: '100%', textAlign: 'left' }}>
                ← {provaDetalhe.nome_prova} {provaDetalhe.ano}
              </button>
              <div style={{ padding: '0.5rem 0' }}>
                {(provaDetalhe.apostas_top ?? []).map((nome, i) => {
                  if (!nome?.trim()) return null
                  const realSet = new Set((provaDetalhe.resultado_real_top ?? []).map(n => n.trim().toLowerCase()).filter(Boolean))
                  const acertou = realSet.has(nome.trim().toLowerCase())
                  const posReal = (provaDetalhe.resultado_real_top ?? []).findIndex(n => n.trim().toLowerCase() === nome.trim().toLowerCase()) + 1
                  return (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.45rem 1.25rem', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                      <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '0.78rem', fontWeight: 800, width: 20, textAlign: 'center', color: 'var(--text-sub)', flexShrink: 0 }}>{i + 1}</span>
                      <span style={{ flex: 1, fontSize: '0.82rem', color: acertou ? 'var(--text)' : 'var(--text-dim)' }}>{nome}</span>
                      {acertou ? (
                        <span style={{ fontSize: '0.72rem', color: '#44cc88', fontWeight: 700 }}>✅ {posReal}º real · +1pt</span>
                      ) : (
                        <span style={{ fontSize: '0.72rem', color: '#ff6b6b' }}>❌ fora do top</span>
                      )}
                    </div>
                  )
                })}
                {/* Camisolas */}
                {[
                  { label: '🟢 Sprint', apostada: provaDetalhe.camisola_sprint_apostada, real: provaDetalhe.camisola_sprint_real },
                  { label: '🔴 Montanha', apostada: provaDetalhe.camisola_montanha_apostada, real: provaDetalhe.camisola_montanha_real },
                  { label: '⚪ Juventude', apostada: provaDetalhe.camisola_juventude_apostada, real: provaDetalhe.camisola_juventude_real },
                ].filter(c => c.apostada).map(({ label, apostada, real }) => {
                  const acertou = apostada && real && apostada.trim().toLowerCase() === real.trim().toLowerCase()
                  return (
                    <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.45rem 1.25rem', borderTop: '1px solid var(--border)', background: 'rgba(255,255,255,0.01)' }}>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-sub)', width: 20 }}>🎽</span>
                      <span style={{ flex: 1, fontSize: '0.82rem', color: 'var(--text-dim)' }}>{label}: {apostada}</span>
                      {acertou ? <span style={{ fontSize: '0.72rem', color: '#44cc88', fontWeight: 700 }}>✅ +1pt</span> : <span style={{ fontSize: '0.72rem', color: 'var(--text-sub)' }}>Real: {real || '?'}</span>}
                    </div>
                  )
                })}
              </div>
            </div>
          ) : (
            <div>
              {apostas.sort((a, b) => b.ano - a.ano).map(a => (
                <button key={a.id} onClick={() => setProvaDetalhe(a)} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.7rem 1.25rem', borderBottom: '1px solid rgba(255,255,255,0.05)', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', gap: '1rem' }}>
                  <div>
                    <p style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--text)' }}>{a.nome_prova}</p>
                    <p style={{ fontSize: '0.7rem', color: 'var(--text-sub)' }}>{a.ano} · {a.apostas_top?.filter(n => n.trim()).length ?? 0} ciclistas</p>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexShrink: 0 }}>
                    <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '1.1rem', fontWeight: 900, color: 'var(--lime)' }}>{a.pontos_total}pts</span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-sub)' }}>→</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
