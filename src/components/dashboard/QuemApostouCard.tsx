'use client'

import { useState } from 'react'
import type { Aposta, Ciclista } from '@/types'

interface Props {
  apostas: Aposta[]
  ciclistas: Ciclista[]
  numPosicoes: number
}

export default function QuemApostouCard({ apostas, ciclistas, numPosicoes }: Props) {
  const [expanded, setExpanded] = useState(false)

  // Mapear ciclista → quem apostou e em que posição
  const mapa = new Map<string, Array<{ username: string; posicao: number; avatarUrl: string | null }>>()

  for (const aposta of apostas) {
    const username = aposta.perfil?.username ?? '?'
    const avatarUrl = aposta.perfil?.avatar_url ?? null
    const top = aposta.apostas_top20?.slice(0, numPosicoes) ?? []
    top.forEach((nome, idx) => {
      if (!nome?.trim()) return
      if (!mapa.has(nome)) mapa.set(nome, [])
      mapa.get(nome)!.push({ username, posicao: idx + 1, avatarUrl })
    })
  }

  // Ordenar por número de apostadores (mais apostados primeiro)
  const sorted = [...mapa.entries()]
    .sort((a, b) => b[1].length - a[1].length)
    .filter(([, bets]) => bets.length > 1) // só os apostados por mais de 1

  const unanimes = sorted.filter(([, b]) => b.length === apostas.length)
  const divergentes = [...mapa.entries()].filter(([, b]) => b.length === 1)

  const exibidos = expanded ? sorted : sorted.slice(0, 6)

  if (sorted.length === 0) return null

  return (
    <div className="card-flush animate-fade-up" style={{ overflow: 'hidden' }}>
      <div style={{ padding: '0.875rem 1.25rem', borderBottom: '1px solid var(--border)', background: 'linear-gradient(135deg, rgba(200,244,0,0.05) 0%, transparent 60%)' }}>
        <p style={{ fontSize: '0.68rem', color: 'var(--lime)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.15rem' }}>🎯 Consenso do grupo</p>
        <h2 style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '1.2rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Quem apostou em quem</h2>
      </div>

      {unanimes.length > 0 && (
        <div style={{ padding: '0.625rem 1.25rem', background: 'rgba(200,244,0,0.05)', borderBottom: '1px solid var(--border)' }}>
          <p style={{ fontSize: '0.72rem', color: 'var(--lime)', fontWeight: 700, marginBottom: '0.4rem' }}>👥 Todos os {apostas.length} apostaram:</p>
          <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
            {unanimes.map(([nome, bets]) => (
              <div key={nome} style={{ background: 'rgba(200,244,0,0.1)', border: '1px solid rgba(200,244,0,0.2)', borderRadius: '0.5rem', padding: '0.25rem 0.6rem', fontSize: '0.75rem', color: 'var(--lime)', fontWeight: 600 }}>
                {nome}
                <span style={{ color: 'rgba(200,244,0,0.6)', marginLeft: '0.3rem', fontSize: '0.65rem' }}>
                  ({bets.map(b => `${b.posicao}º`).join(' · ')})
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div>
        {exibidos.filter(([, b]) => b.length < apostas.length).map(([nome, bets], i, arr) => (
          <div key={nome} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.55rem 1.25rem', borderBottom: i < arr.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
            <span style={{ fontSize: '0.82rem', flex: 1, color: 'var(--text)', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{nome}</span>
            <div style={{ display: 'flex', gap: '0.3rem', flexShrink: 0 }}>
              {bets.map(b => (
                <div key={b.username} title={`${b.username} — ${b.posicao}º`} style={{
                  width: 24, height: 24, borderRadius: '50%',
                  background: b.avatarUrl ? 'transparent' : 'rgba(200,244,0,0.12)',
                  border: '1.5px solid rgba(255,255,255,0.1)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '0.6rem', fontWeight: 900, color: 'var(--lime)',
                  fontFamily: 'Barlow Condensed, sans-serif', overflow: 'hidden',
                }}>
                  {b.avatarUrl ? <img src={b.avatarUrl} alt={b.username} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : b.username[0]?.toUpperCase()}
                </div>
              ))}
            </div>
            <span style={{ fontSize: '0.65rem', color: 'var(--text-sub)', fontFamily: 'Barlow Condensed, sans-serif', minWidth: '2.5rem', textAlign: 'right' }}>
              {bets.map(b => `${b.posicao}º`).join(' · ')}
            </span>
          </div>
        ))}
      </div>

      {divergentes.length > 0 && (
        <div style={{ padding: '0.625rem 1.25rem', borderTop: '1px solid var(--border)', background: 'rgba(255,255,255,0.01)' }}>
          <p style={{ fontSize: '0.72rem', color: 'var(--text-sub)', marginBottom: '0.4rem' }}>🎲 Apostas únicas ({divergentes.length}):</p>
          <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
            {divergentes.slice(0, 8).map(([nome, bets]) => (
              <span key={nome} style={{ background: 'var(--surface-2)', border: '1px solid var(--border-hi)', borderRadius: '0.4rem', padding: '0.15rem 0.5rem', fontSize: '0.68rem', color: 'var(--text-dim)' }}>
                {nome} <span style={{ color: 'var(--text-sub)' }}>({bets[0].username})</span>
              </span>
            ))}
            {divergentes.length > 8 && <span style={{ fontSize: '0.68rem', color: 'var(--text-sub)', alignSelf: 'center' }}>+{divergentes.length - 8} mais</span>}
          </div>
        </div>
      )}

      {sorted.length > 6 && (
        <button onClick={() => setExpanded(!expanded)} style={{ width: '100%', padding: '0.625rem', background: 'var(--surface-2)', border: 'none', borderTop: '1px solid var(--border)', color: 'var(--text-dim)', fontSize: '0.78rem', cursor: 'pointer', fontWeight: 600 }}>
          {expanded ? 'Ver menos ↑' : `Ver todos os ${sorted.length} ciclistas ↓`}
        </button>
      )}
    </div>
  )
}
