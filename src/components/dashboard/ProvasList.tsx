import Link from 'next/link'
import type { Prova } from '@/types'
import { categorizarProva, compararProvas } from '@/lib/provaStatus'

interface Props {
  provas: Prova[]
  userId?: string
}

export function ProvasList({ provas, userId }: Props) {
  const futuras = provas
    .map(categorizarProva)
    .filter(p => p.estado === 'futura')
    .sort(compararProvas)

  if (futuras.length === 0) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: '2rem 1.25rem' }}>
        <p style={{ color: 'var(--text-dim)', fontSize: '0.875rem' }}>Sem provas agendadas</p>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      {futuras.map((prova, i) => {
        const dias = prova.diasAteInicio
        const txtTempo = dias === 0 ? 'Hoje' : dias === 1 ? 'Amanhã' : `${dias}d`
        const urgente = dias <= 3

        return (
          <div
            key={prova.id}
            className={`card animate-fade-up delay-${Math.min(i + 1, 5)}`}
            style={{ padding: '1rem', position: 'relative', overflow: 'hidden' }}
          >
            {/* Accent strip */}
            <div style={{
              position: 'absolute', left: 0, top: 0, bottom: 0, width: 3,
              background: urgente ? 'var(--lime)' : 'var(--surface-2)',
              borderRadius: '1rem 0 0 1rem',
            }} />

            <div style={{ paddingLeft: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <p style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text)', lineHeight: 1.25, flex: 1 }}>
                  {prova.nome}
                </p>
                <span style={{
                  flexShrink: 0,
                  background: urgente ? 'rgba(200,244,0,0.12)' : 'var(--surface-2)',
                  color: urgente ? 'var(--lime)' : 'var(--text-dim)',
                  border: `1px solid ${urgente ? 'rgba(200,244,0,0.3)' : 'var(--border-hi)'}`,
                  padding: '0.2rem 0.55rem', borderRadius: '999px',
                  fontSize: '0.7rem', fontWeight: 700,
                  fontFamily: 'Barlow Condensed, sans-serif',
                  letterSpacing: '0.04em',
                }}>
                  {txtTempo}
                </span>
              </div>

              <p style={{ fontSize: '0.75rem', color: 'var(--text-sub)' }}>
                {new Date(prova.data_inicio).toLocaleDateString('pt-PT', { day: 'numeric', month: 'short' })}
                {' → '}
                {new Date(prova.data_fim).toLocaleDateString('pt-PT', { day: 'numeric', month: 'short', year: 'numeric' })}
              </p>

              {prova.descricao && (
                <p style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '0.35rem', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical' }}>
                  {prova.descricao}
                </p>
              )}

              {userId && (
                <div style={{ marginTop: '0.75rem' }}>
                  <Link href={`/apostas/${prova.id}`} className="btn-primary" style={{ fontSize: '0.82rem', padding: '0.45rem 1rem' }}>
                    Apostar →
                  </Link>
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
