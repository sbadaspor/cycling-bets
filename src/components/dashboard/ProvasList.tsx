'use client'

import type { LeaderboardEntry } from '@/types'

interface Props {
  entries: LeaderboardEntry[]
  currentUserId?: string
}

export function LeaderboardTable({ entries, currentUserId }: Props) {
  if (entries.length === 0) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: '3rem 1.25rem' }}>
        <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>🏁</div>
        <p style={{ color: 'var(--text-dim)', fontSize: '0.9rem' }}>Ainda não há classificação geral.</p>
        <p style={{ color: 'var(--text-sub)', fontSize: '0.8rem', marginTop: '0.35rem' }}>Aparece depois das provas ficarem finalizadas.</p>
      </div>
    )
  }

  const medals = ['🥇', '🥈', '🥉']

  return (
    <div className="card-flush animate-fade-up">
      {/* Header */}
      <div style={{ padding: '1rem 1.25rem 0.85rem', borderBottom: '1px solid var(--border)' }}>
        <p style={{ fontSize: '0.68rem', color: 'var(--lime)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.15rem' }}>
          ⚡ Classificação Geral
        </p>
        <h2 className="section-title" style={{ fontSize: '1.2rem' }}>Leaderboard</h2>
      </div>

      {/* Column headers */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '2rem 1fr auto auto',
        gap: '0.5rem',
        padding: '0.6rem 1.25rem',
        borderBottom: '1px solid var(--border)',
        background: 'var(--surface-2)',
      }}>
        <span style={{ fontSize: '0.68rem', color: 'var(--text-sub)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>#</span>
        <span style={{ fontSize: '0.68rem', color: 'var(--text-sub)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Jogador</span>
        <span style={{ fontSize: '0.68rem', color: 'var(--text-sub)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', textAlign: 'right' }} className="hidden sm:block">Provas</span>
        <span style={{ fontSize: '0.68rem', color: 'var(--text-sub)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', textAlign: 'right' }}>Pts</span>
      </div>

      {/* Rows */}
      {entries.map((entry, idx) => {
        const isMe = entry.perfil.id === currentUserId
        const rank = entry.rank
        const isTop3 = rank <= 3
        const initial = entry.perfil.username?.[0]?.toUpperCase() ?? '?'

        return (
          <div
            key={entry.perfil.id}
            className="table-row-alt"
            style={{
              display: 'grid',
              gridTemplateColumns: '2rem 1fr auto auto',
              gap: '0.5rem',
              alignItems: 'center',
              padding: '0.85rem 1.25rem',
              borderBottom: '1px solid var(--border)',
              background: isMe ? 'rgba(200,244,0,0.05)' : undefined,
              transition: 'background 0.12s',
            }}
          >
            {/* Rank */}
            <span style={{
              fontSize: isTop3 ? '1.1rem' : '0.8rem',
              fontWeight: 800,
              color: isTop3 ? 'var(--lime)' : 'var(--text-dim)',
              fontFamily: 'Barlow Condensed, sans-serif',
            }}>
              {medals[idx] ?? rank}
            </span>

            {/* Player */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', overflow: 'hidden' }}>
              <div style={{
                width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
                background: isMe ? 'rgba(200,244,0,0.15)' : 'var(--surface-2)',
                border: `1.5px solid ${isMe ? 'rgba(200,244,0,0.35)' : 'var(--border-hi)'}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '0.75rem', fontWeight: 700,
                color: isMe ? 'var(--lime)' : 'var(--text-dim)',
                fontFamily: 'Barlow Condensed, sans-serif',
              }}>
                {initial}
              </div>
              <div style={{ overflow: 'hidden' }}>
                <p style={{
                  fontSize: '0.9rem', fontWeight: isMe ? 600 : 500,
                  color: isMe ? 'var(--lime)' : 'var(--text)',
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                }}>
                  {entry.perfil.username}
                  {isMe && <span style={{ fontSize: '0.7rem', color: 'var(--lime)', marginLeft: '4px', opacity: 0.7 }}>tu</span>}
                </p>
                {entry.perfil.full_name && (
                  <p style={{ fontSize: '0.72rem', color: 'var(--text-sub)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {entry.perfil.full_name}
                  </p>
                )}
              </div>
            </div>

            {/* Provas */}
            <span className="hidden sm:block" style={{ fontSize: '0.78rem', color: 'var(--text-dim)', textAlign: 'right' }}>
              {entry.apostas?.calculadas ?? 0}
            </span>

            {/* Points */}
            <div style={{ textAlign: 'right' }}>
              <span style={{
                fontFamily: 'Barlow Condensed, sans-serif',
                fontSize: '1.35rem', fontWeight: 800,
                color: isTop3 ? 'var(--lime)' : isMe ? 'var(--lime)' : 'var(--text)',
              }}>
                {entry.pontos_total}
              </span>
              <span style={{ fontSize: '0.62rem', color: 'var(--text-sub)', marginLeft: '2px' }}>pts</span>
            </div>
          </div>
        )
      })}

      {/* Footer */}
      <div style={{ padding: '0.6rem 1.25rem', background: 'var(--surface-2)' }}>
        <p style={{ fontSize: '0.68rem', color: 'var(--text-sub)' }}>
          Pontos = Top-10 + Top-20 + Camisolas
        </p>
      </div>
    </div>
  )
}

