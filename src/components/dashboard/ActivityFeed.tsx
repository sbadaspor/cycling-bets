'use client'

import Link from 'next/link'
import type { ActivityItem } from '@/lib/queries'

interface Props {
  items: ActivityItem[]
}

const PLAYER_COLORS = ['#E0451F', '#2563EB', '#16A34A', '#E8488B', '#EAB308']

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'agora'
  if (mins < 60) return `${mins}min`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h`
  return `${Math.floor(hours / 24)}d`
}

export default function ActivityFeed({ items }: Props) {
  if (items.length === 0) return null

  return (
    <section style={{ background: '#fff', border: '1px solid #E9E4D9', borderRadius: 16, padding: 20 }}>
      <div style={{
        fontFamily: "'JetBrains Mono', monospace", fontSize: 11, fontWeight: 600,
        letterSpacing: '0.16em', textTransform: 'uppercase', color: '#A79F8E',
        marginBottom: 14,
      }}>
        Atividade recente
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {items.map((item, idx) => {
          const nome = item.fullName || item.username
          const cor = PLAYER_COLORS[idx % PLAYER_COLORS.length]
          return (
            <Link
              key={`${item.userId}-${item.createdAt}`}
              href={`/provas/${item.provaId}`}
              style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '11px 6px', borderRadius: 10,
                textDecoration: 'none', transition: 'background 0.12s',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = '#FBFAF5')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              {/* Avatar */}
              <div style={{
                width: 34, height: 34, borderRadius: '50%', flexShrink: 0, overflow: 'hidden',
                background: item.avatarUrl ? 'transparent' : cor,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                font: "700 11px 'Archivo', sans-serif", color: '#fff',
              }}>
                {item.avatarUrl
                  ? <img src={item.avatarUrl} alt={nome} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : nome[0]?.toUpperCase()
                }
              </div>

              {/* Texto */}
              <div style={{ flex: 1, font: "500 13px 'Archivo', sans-serif", color: '#6B665B', lineHeight: 1.45 }}>
                <span style={{ fontWeight: 700, color: '#16140F' }}>{nome}</span>
                {' '}apostou em{' '}
                <span style={{ fontWeight: 600, color: '#16140F' }}>{item.provaNome}</span>
              </div>

              {/* Tempo */}
              <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: '#B3AC9B', whiteSpace: 'nowrap', flexShrink: 0 }}>
                {timeAgo(item.createdAt)}
              </div>
            </Link>
          )
        })}
      </div>
    </section>
  )
}
