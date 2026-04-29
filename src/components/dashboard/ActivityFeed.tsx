import Link from 'next/link'
import type { ActivityItem } from '@/lib/queries'

interface Props {
  items: ActivityItem[]
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'agora'
  if (mins < 60) return `${mins}min`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h`
  const days = Math.floor(hours / 24)
  return `${days}d`
}

export default function ActivityFeed({ items }: Props) {
  if (items.length === 0) return null

  return (
    <div className="card-flush" style={{ marginTop: '0' }}>
      <div style={{
        padding: '0.875rem 1.25rem 0.6rem',
        borderBottom: '1px solid var(--border)',
      }}>
        <p style={{
          fontSize: '0.68rem', color: 'var(--text-dim)', fontWeight: 700,
          textTransform: 'uppercase', letterSpacing: '0.1em', margin: 0,
        }}>
          🕐 Atividade recente
        </p>
      </div>

      <div>
        {items.map((item, idx) => (
          <Link
            key={`${item.userId}-${item.createdAt}`}
            href={`/provas/${item.provaId}`}
            style={{
              display: 'flex', alignItems: 'center', gap: '0.75rem',
              padding: '0.625rem 1.25rem',
              borderBottom: idx < items.length - 1 ? '1px solid var(--border)' : 'none',
              textDecoration: 'none',
              transition: 'background 0.12s',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.03)')}
            onMouseLeave={e => (e.currentTarget.style.background = '')}
          >
            {/* Avatar */}
            <div style={{
              width: 28, height: 28, borderRadius: '50%', flexShrink: 0, overflow: 'hidden',
              background: item.avatarUrl ? 'transparent' : 'rgba(200,244,0,0.1)',
              border: '1px solid rgba(200,244,0,0.15)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '0.7rem', fontWeight: 900, color: 'var(--lime)',
              fontFamily: 'Barlow Condensed, sans-serif',
            }}>
              {item.avatarUrl
                ? <img src={item.avatarUrl} alt={item.username} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : item.username[0]?.toUpperCase()
              }
            </div>

            {/* Texto */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text)', fontWeight: 600 }}>
                {item.username}
              </span>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>
                {' '}apostou em{' '}
              </span>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-dim)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {item.provaNome}
              </span>
            </div>

            {/* Tempo */}
            <span style={{
              fontSize: '0.68rem', color: 'var(--text-sub)',
              flexShrink: 0, fontVariantNumeric: 'tabular-nums',
            }}>
              {timeAgo(item.createdAt)}
            </span>
          </Link>
        ))}
      </div>
    </div>
  )
}
