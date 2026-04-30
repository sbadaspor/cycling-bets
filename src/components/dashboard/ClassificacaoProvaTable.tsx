'use client'

import Link from 'next/link'
import type { Aposta, EtapaResultado, Prova } from '@/types'
import { compararDesempate } from '@/lib/pontuacao'
import AnimatedPoints from '@/components/ui/AnimatedPoints'

interface Props {
  prova: Prova
  apostas: Aposta[]
  ultimaEtapa: EtapaResultado | null
  titulo?: string
}

export default function ClassificacaoProvaTable({ prova, apostas, ultimaEtapa, titulo }: Props) {
  const ordenadas = [...apostas].sort(compararDesempate)
  const tituloFinal = titulo ?? `Classificação — ${prova.nome}`

  const medals = ['🥇', '🥈', '🥉']

  return (
    <div className="card-flush animate-fade-up">
      {/* Header */}
      <div style={{
        padding: '1.1rem 1.25rem 0.9rem',
        borderBottom: '1px solid var(--border)',
        background: 'linear-gradient(135deg, rgba(200,244,0,0.06) 0%, transparent 60%)',
      }}>
        <div className="flex items-start justify-between gap-2 flex-wrap">
          <div>
            <p style={{ fontSize: '0.68rem', color: 'var(--lime)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.2rem' }}>
              🏆 Ao vivo
            </p>
            <h2 className="section-title" style={{ fontSize: '1.25rem', lineHeight: 1.1 }}>{tituloFinal}</h2>
          </div>
          {ultimaEtapa && (
            <span style={{ fontSize: '0.68rem', color: 'var(--text-dim)', background: 'var(--surface-2)', padding: '0.25rem 0.6rem', borderRadius: '999px', border: '1px solid var(--border-hi)', whiteSpace: 'nowrap', marginTop: '0.25rem' }}>
              Etapa {ultimaEtapa.numero_etapa}{ultimaEtapa.is_final ? ' · Final' : ''}
            </span>
          )}
        </div>
      </div>

      {/* Body */}
      {ordenadas.length === 0 ? (
        <div style={{ padding: '2.5rem 1.25rem', textAlign: 'center', color: 'var(--text-dim)' }}>
          <div style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>🚴</div>
          <p style={{ fontSize: '0.9rem' }}>Ainda não há apostas nesta prova.</p>
        </div>
      ) : !ultimaEtapa ? (
        <div style={{ padding: '2.5rem 1.25rem', textAlign: 'center', color: 'var(--text-dim)' }}>
          <div style={{ fontSize: '1.75rem', marginBottom: '0.75rem' }}>⏳</div>
          <p style={{ fontSize: '0.875rem' }}>A aguardar primeira etapa. Os pontos serão calculados em breve.</p>
        </div>
      ) : (
        <div>
          {ordenadas.map((a, idx) => {
            const rank = idx + 1
            const isTop3 = rank <= 3
            const pontos = a.pontos_total ?? 0

            return (
              <Link
                key={a.id}
                href={`/provas/${prova.id}/apostas/${a.user_id}`}
                className="table-row-alt"
                style={{
                  display: 'flex', alignItems: 'center', gap: '0.875rem',
                  padding: '0.85rem 1.25rem',
                  borderBottom: '1px solid var(--border)',
                  transition: 'background 0.12s',
                  textDecoration: 'none',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.04)')}
                onMouseLeave={e => (e.currentTarget.style.background = '')}
              >
                {/* Medalha / Rank */}
                <div style={{
                  width: 22, flexShrink: 0, textAlign: 'center',
                  fontSize: isTop3 ? '1rem' : '0.72rem',
                  fontWeight: 700,
                  color: isTop3 ? 'var(--lime)' : 'var(--text-sub)',
                  fontFamily: 'Barlow Condensed, sans-serif',
                }}>
                  {medals[idx] ?? rank}
                </div>

                {/* Avatar */}
                <div style={{
                  width: 38, height: 38, borderRadius: '50%', flexShrink: 0, overflow: 'hidden',
                  background: a.perfil?.avatar_url ? 'transparent' : 'rgba(200,244,0,0.12)',
                  border: `1.5px solid ${isTop3 ? 'rgba(200,244,0,0.35)' : 'rgba(255,255,255,0.08)'}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '0.8rem', fontWeight: 900, color: 'var(--lime)',
                  fontFamily: 'Barlow Condensed, sans-serif',
                }}>
                  {a.perfil?.avatar_url
                    ? <img src={a.perfil.avatar_url} alt={a.perfil.username} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : (a.perfil?.username?.[0] ?? '?').toUpperCase()
                  }
                </div>

                {/* Nome */}
                <span style={{
                  flex: 1, fontSize: '0.95rem', fontWeight: isTop3 ? 600 : 500,
                  color: isTop3 ? 'var(--lime)' : 'var(--text)',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  {a.perfil?.full_name || a.perfil?.username || 'utilizador'}
                </span>

                {/* Points breakdown — hidden on very small screens */}
                <div className="hidden sm:flex items-center gap-3" style={{ color: 'var(--text-dim)', fontSize: '0.78rem' }}>
                  {a.pontos_top10 != null && <span>T10: {a.pontos_top10}</span>}
                  {a.pontos_top20 != null && <span>T20: {a.pontos_top20}</span>}
                  {a.pontos_camisolas != null && <span>🎽 {a.pontos_camisolas}</span>}
                </div>

                {/* Total animado */}
                <AnimatedPoints value={pontos} isTop3={isTop3} />
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
