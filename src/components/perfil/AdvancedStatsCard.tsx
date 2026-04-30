'use client'

import type { ResultadoApp } from '@/components/perfil/PerfilSections'

interface AdvancedStats {
  taxaAcertoTop10: number
  taxaAcertoTop20: number
  melhorCiclista: string | null
  piorCiclista: string | null
  melhorProva: ResultadoApp | null
  piorProva: ResultadoApp | null
  mediaPontos: number
}

interface Props {
  resultados: ResultadoApp[]
  // apostas com detalhes de ciclistas (passado da DB)
  ciclistasStats?: Array<{
    nome: string
    apostado: number
    acertou: number
    pontosGerados: number
  }>
}

export default function AdvancedStatsCard({ resultados, ciclistasStats = [] }: Props) {
  if (resultados.length === 0) return null

  const mediaPontos = resultados.length > 0
    ? Math.round(resultados.reduce((s, r) => s + r.pontosTotal, 0) / resultados.length * 10) / 10
    : 0

  const melhorProva = [...resultados].sort((a, b) => b.pontosTotal - a.pontosTotal)[0] ?? null
  const piorProva = [...resultados].sort((a, b) => a.pontosTotal - b.pontosTotal)[0] ?? null

  const melhorCiclista = ciclistasStats.length > 0
    ? [...ciclistasStats].sort((a, b) => b.pontosGerados - a.pontosGerados)[0]?.nome ?? null
    : null

  return (
    <div className="card-flush animate-fade-up" style={{ overflow: 'hidden' }}>
      <div style={{ padding: '0.875rem 1.25rem', borderBottom: '1px solid var(--border)' }}>
        <p style={{ fontSize: '0.68rem', color: 'var(--lime)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.15rem' }}>📈 Análise</p>
        <h2 style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '1.2rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Stats Avançadas</h2>
      </div>

      <div style={{ padding: '0.5rem 1.25rem' }}>
        {/* Média de pontos */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.7rem 0', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-dim)' }}>Média de pontos por prova</span>
          <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '1.2rem', fontWeight: 800, color: 'var(--lime)' }}>{mediaPontos}</span>
        </div>

        {/* Melhor prova */}
        {melhorProva && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.7rem 0', borderBottom: '1px solid rgba(255,255,255,0.07)', gap: '1rem' }}>
            <div>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-dim)' }}>🏆 Melhor prova</span>
              <p style={{ fontSize: '0.72rem', color: 'var(--text-sub)', marginTop: '0.1rem' }}>{melhorProva.nome} {melhorProva.ano}</p>
            </div>
            <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '1.2rem', fontWeight: 800, color: 'var(--lime)', flexShrink: 0 }}>{melhorProva.pontosTotal}pts</span>
          </div>
        )}

        {/* Pior prova */}
        {piorProva && piorProva.provaId !== melhorProva?.provaId && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.7rem 0', borderBottom: '1px solid rgba(255,255,255,0.07)', gap: '1rem' }}>
            <div>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-dim)' }}>💀 Pior prova</span>
              <p style={{ fontSize: '0.72rem', color: 'var(--text-sub)', marginTop: '0.1rem' }}>{piorProva.nome} {piorProva.ano}</p>
            </div>
            <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '1.2rem', fontWeight: 800, color: '#ff6b6b', flexShrink: 0 }}>{piorProva.pontosTotal}pts</span>
          </div>
        )}

        {/* Ciclista mais rentável */}
        {melhorCiclista && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.7rem 0', gap: '1rem' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-dim)' }}>🚴 Ciclista mais rentável</span>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--lime)', textAlign: 'right', flexShrink: 0 }}>{melhorCiclista}</span>
          </div>
        )}
      </div>

      {/* Histórico de provas */}
      {resultados.length > 0 && (
        <div style={{ borderTop: '1px solid var(--border)' }}>
          <div style={{ padding: '0.625rem 1.25rem', background: 'var(--surface-2)' }}>
            <p style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Histórico de provas</p>
          </div>
          {resultados.map((r, i) => (
            <div key={r.provaId} style={{ display: 'flex', alignItems: 'center', gap: '0.875rem', padding: '0.6rem 1.25rem', borderBottom: i < resultados.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
              <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '1.1rem', fontWeight: 900, width: 24, textAlign: 'center', color: r.posicao === 1 ? 'var(--lime)' : 'var(--text-sub)' }}>
                {r.posicao === 1 ? '🥇' : r.posicao === 2 ? '🥈' : r.posicao === 3 ? '🥉' : `${r.posicao}º`}
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: '0.82rem', fontWeight: 500, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.nome}</p>
                <p style={{ fontSize: '0.68rem', color: 'var(--text-sub)' }}>{r.ano} · {r.totalParticipantes} jogadores</p>
              </div>
              <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '1.1rem', fontWeight: 800, color: r.posicao === 1 ? 'var(--lime)' : 'var(--text)', flexShrink: 0 }}>{r.pontosTotal}pts</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
