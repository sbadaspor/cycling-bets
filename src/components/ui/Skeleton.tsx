'use client'

interface SkeletonProps {
  height?: number | string
  width?: number | string
  borderRadius?: string
  style?: React.CSSProperties
}

export function Skeleton({ height = 20, width = '100%', borderRadius = '0.5rem', style }: SkeletonProps) {
  return (
    <div style={{
      height, width, borderRadius,
      background: 'linear-gradient(90deg, rgba(255,255,255,0.04) 25%, rgba(255,255,255,0.09) 50%, rgba(255,255,255,0.04) 75%)',
      backgroundSize: '200% 100%',
      animation: 'shimmer 1.6s infinite',
      ...style,
    }} />
  )
}

export function ClassificacaoSkeleton() {
  return (
    <div className="card-flush" style={{ overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ padding: '1.1rem 1.25rem 0.9rem', borderBottom: '1px solid var(--border)' }}>
        <Skeleton height={12} width={80} style={{ marginBottom: '0.5rem' }} />
        <Skeleton height={22} width={220} />
      </div>
      {/* Rows */}
      {[1, 2, 3].map(i => (
        <div key={i} style={{
          display: 'flex', alignItems: 'center', gap: '0.875rem',
          padding: '0.85rem 1.25rem', borderBottom: '1px solid var(--border)',
        }}>
          <Skeleton height={20} width={22} borderRadius='50%' />
          <Skeleton height={38} width={38} borderRadius='50%' />
          <Skeleton height={16} width={`${60 + i * 10}%`} />
          <Skeleton height={24} width={40} />
        </div>
      ))}
    </div>
  )
}

export function ProvasListSkeleton() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      {[1, 2].map(i => (
        <div key={i} className="card" style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
          <Skeleton height={12} width={90} />
          <Skeleton height={18} width={160} />
          <Skeleton height={10} width={120} />
          <Skeleton height={2} width='100%' />
          <Skeleton height={32} width={120} borderRadius='0.5rem' />
        </div>
      ))}
    </div>
  )
}
