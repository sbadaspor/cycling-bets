'use client'

import { useRef } from 'react'
import type { ResultadoApp } from '@/components/perfil/PerfilSections'

interface Props {
  username: string
  avatarUrl?: string | null
  resultados: ResultadoApp[]
  pontosTotal: number
  rankGeral: number | null
}

export default function CartaoEpoca({ username, avatarUrl, resultados, pontosTotal, rankGeral }: Props) {
  const cardRef = useRef<HTMLDivElement>(null)

  const melhorProva = [...resultados].sort((a, b) => b.pontosTotal - a.pontosTotal)[0]
  const vitorias = resultados.filter(r => r.posicao === 1).length
  const inicial = username?.[0]?.toUpperCase() ?? '?'
  const ano = new Date().getFullYear()

  const rankEmoji = rankGeral === 1 ? '🥇' : rankGeral === 2 ? '🥈' : rankGeral === 3 ? '🥉' : `#${rankGeral}`

  return (
    <div className="card-flush animate-fade-up" style={{ overflow: 'hidden' }}>
      <div style={{ padding: '0.875rem 1.25rem', borderBottom: '1px solid var(--border)' }}>
        <p style={{ fontSize: '0.68rem', color: 'var(--lime)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.15rem' }}>🃏 Cartão</p>
        <h2 style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '1.2rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Temporada {ano}</h2>
      </div>

      {/* Card visual */}
      <div ref={cardRef} style={{
        margin: '1.25rem',
        background: 'linear-gradient(135deg, #0f0f1a 0%, #1a1a2e 50%, #0f0f1a 100%)',
        borderRadius: '1rem', padding: '1.5rem',
        border: '1px solid rgba(200,244,0,0.2)',
        boxShadow: '0 0 40px rgba(200,244,0,0.06)',
        position: 'relative', overflow: 'hidden',
      }}>
        {/* Decoração de fundo */}
        <div style={{ position: 'absolute', top: -30, right: -30, width: 120, height: 120, borderRadius: '50%', background: 'rgba(200,244,0,0.04)', border: '1px solid rgba(200,244,0,0.08)' }} />
        <div style={{ position: 'absolute', bottom: -20, left: -20, width: 80, height: 80, borderRadius: '50%', background: 'rgba(200,244,0,0.03)' }} />

        {/* Header do cartão */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem', marginBottom: '1.25rem', position: 'relative' }}>
          <div style={{
            width: 52, height: 52, borderRadius: '50%', flexShrink: 0,
            background: avatarUrl ? 'transparent' : 'rgba(200,244,0,0.12)',
            border: '2px solid rgba(200,244,0,0.3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '1.25rem', fontWeight: 900, color: '#c8f400',
            fontFamily: 'Barlow Condensed, sans-serif', overflow: 'hidden',
          }}>
            {avatarUrl ? <img src={avatarUrl} alt={username} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : inicial}
          </div>
          <div>
            <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '1.5rem', fontWeight: 900, color: '#ffffff', textTransform: 'uppercase', letterSpacing: '0.04em', lineHeight: 1 }}>{username}</p>
            <p style={{ fontSize: '0.7rem', color: '#c8f400', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginTop: '0.2rem' }}>VeloApostas {ano}</p>
          </div>
        </div>

        {/* Stats grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem', marginBottom: '1rem', position: 'relative' }}>
          {[
            { label: 'Rank', value: rankEmoji, color: '#c8f400' },
            { label: 'Pontos', value: pontosTotal, color: '#ffffff' },
            { label: 'Vitórias', value: vitorias, color: vitorias > 0 ? '#c8f400' : '#6a6a86' },
          ].map(stat => (
            <div key={stat.label} style={{ textAlign: 'center', background: 'rgba(255,255,255,0.04)', borderRadius: '0.625rem', padding: '0.625rem 0.5rem' }}>
              <div style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '1.5rem', fontWeight: 900, color: stat.color, lineHeight: 1, marginBottom: '0.25rem' }}>{stat.value}</div>
              <div style={{ fontSize: '0.6rem', color: '#6a6a86', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700 }}>{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Melhor prova */}
        {melhorProva && (
          <div style={{ background: 'rgba(200,244,0,0.06)', border: '1px solid rgba(200,244,0,0.15)', borderRadius: '0.625rem', padding: '0.625rem 0.875rem', position: 'relative' }}>
            <p style={{ fontSize: '0.6rem', color: '#c8f400', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.2rem' }}>🏆 Melhor prova</p>
            <p style={{ fontSize: '0.82rem', color: '#ffffff', fontWeight: 600 }}>{melhorProva.nome} {melhorProva.ano}</p>
            <p style={{ fontSize: '0.72rem', color: '#c8f400' }}>{melhorProva.pontosTotal}pts · {melhorProva.posicao}º lugar</p>
          </div>
        )}

        {/* Provas jogadas */}
        <div style={{ marginTop: '0.875rem', display: 'flex', gap: '0.35rem', flexWrap: 'wrap', position: 'relative' }}>
          {resultados.slice(0, 8).map(r => (
            <div key={r.provaId} title={`${r.nome}: ${r.posicao}º — ${r.pontosTotal}pts`} style={{
              width: 8, height: 8, borderRadius: '50%',
              background: r.posicao === 1 ? '#c8f400' : r.posicao <= 3 ? 'rgba(200,244,0,0.5)' : 'rgba(255,255,255,0.2)',
            }} />
          ))}
          {resultados.length > 8 && <span style={{ fontSize: '0.6rem', color: '#6a6a86', alignSelf: 'center' }}>+{resultados.length - 8}</span>}
        </div>
      </div>

      {/* Botão partilhar */}
      <div style={{ padding: '0 1.25rem 1.25rem' }}>
        <button
          onClick={() => {
            if (navigator.share) {
              navigator.share({
                title: `${username} — VeloApostas ${ano}`,
                text: `Temporada ${ano}: ${pontosTotal}pts · ${vitorias} vitória${vitorias !== 1 ? 's' : ''}`,
                url: window.location.href,
              }).catch(() => {})
            } else {
              navigator.clipboard.writeText(window.location.href).then(() => alert('Link copiado!')).catch(() => {})
            }
          }}
          style={{
            width: '100%', padding: '0.75rem',
            background: 'rgba(200,244,0,0.1)', border: '1px solid rgba(200,244,0,0.25)',
            borderRadius: '0.75rem', color: 'var(--lime)', fontWeight: 700,
            fontSize: '0.875rem', cursor: 'pointer',
          }}
        >
          📤 Partilhar cartão
        </button>
      </div>
    </div>
  )
}
