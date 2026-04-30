'use client'

import type { EtapaResultado, Aposta } from '@/types'
import { calcularPontos, calcularCamisolas } from '@/lib/pontuacao'
import type { CategoriaProvaTipo } from '@/types'
import { getConfigCategoria } from '@/lib/categoriaConfig'

interface Props {
  etapas: EtapaResultado[]
  apostas: Aposta[]
  categoria?: CategoriaProvaTipo
}

export default function MomentoDaVirada({ etapas, apostas, categoria }: Props) {
  if (etapas.length < 2 || apostas.length < 2) return null

  const config = getConfigCategoria(categoria)

  // Calcular pontos acumulados por jogador em cada etapa
  type Snapshot = { userId: string; username: string; pontosAcum: number; lider: boolean }
  const timeline: Array<{ etapa: EtapaResultado; snapshots: Snapshot[] }> = []

  const acumulados: Record<string, number> = {}
  apostas.forEach(a => { acumulados[a.user_id] = 0 })

  for (const etapa of etapas) {
    for (const aposta of apostas) {
      const r = calcularPontos(
        aposta.apostas_top20 ?? [],
        etapa.classificacao_geral_top20 ?? [],
        {
          sprint: aposta.camisola_sprint ?? '',
          montanha: aposta.camisola_montanha ?? '',
          juventude: aposta.camisola_juventude ?? '',
        },
        {
          sprint: etapa.camisola_sprint ?? '',
          montanha: etapa.camisola_montanha ?? '',
          juventude: etapa.camisola_juventude ?? '',
        },
        categoria
      )
      acumulados[aposta.user_id] = (acumulados[aposta.user_id] ?? 0) + r.pontos_total
    }

    const snapshots = apostas.map(a => ({
      userId: a.user_id,
      username: a.perfil?.username ?? '?',
      pontosAcum: acumulados[a.user_id] ?? 0,
      lider: false,
    })).sort((a, b) => b.pontosAcum - a.pontosAcum)

    snapshots.forEach((s, i) => { s.lider = i === 0 })
    timeline.push({ etapa, snapshots })
  }

  // Encontrar a etapa que mudou o líder
  let etapaDaVirada: typeof timeline[0] | null = null
  for (let i = 1; i < timeline.length; i++) {
    const liderAntes = timeline[i - 1].snapshots[0]?.userId
    const liderDepois = timeline[i].snapshots[0]?.userId
    if (liderAntes !== liderDepois) {
      etapaDaVirada = timeline[i]
      break
    }
  }

  const ultima = timeline[timeline.length - 1]

  return (
    <div className="card-flush animate-fade-up" style={{ overflow: 'hidden' }}>
      <div style={{ padding: '0.875rem 1.25rem', borderBottom: '1px solid var(--border)', background: 'linear-gradient(135deg, rgba(200,244,0,0.05) 0%, transparent 60%)' }}>
        <p style={{ fontSize: '0.68rem', color: 'var(--lime)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.15rem' }}>⚡ Análise</p>
        <h2 style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '1.2rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Linha do Tempo</h2>
      </div>

      {/* Classificação final */}
      <div style={{ padding: '0.875rem 1.25rem', borderBottom: '1px solid var(--border)' }}>
        <p style={{ fontSize: '0.72rem', color: 'var(--text-dim)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.5rem' }}>
          Classificação final
        </p>
        {ultima.snapshots.map((s, i) => (
          <div key={s.userId} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.4rem 0', borderBottom: i < ultima.snapshots.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
            <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '1rem', fontWeight: 900, width: 24, textAlign: 'center', color: i === 0 ? 'var(--lime)' : 'var(--text-sub)' }}>
              {i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉'}
            </span>
            <span style={{ flex: 1, fontSize: '0.875rem', fontWeight: 600, color: i === 0 ? 'var(--lime)' : 'var(--text)' }}>{s.username}</span>
            <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '1.1rem', fontWeight: 800, color: i === 0 ? 'var(--lime)' : 'var(--text)' }}>{s.pontosAcum}pts</span>
          </div>
        ))}
      </div>

      {/* Etapa decisiva */}
      {etapaDaVirada && (
        <div style={{ padding: '0.875rem 1.25rem', background: 'rgba(255,149,0,0.05)', borderBottom: '1px solid rgba(255,149,0,0.15)' }}>
          <p style={{ fontSize: '0.72rem', color: '#ff9500', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.35rem' }}>
            🔄 Etapa {etapaDaVirada.etapa.numero_etapa} — mudança de liderança
          </p>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>
            <span style={{ color: 'var(--lime)', fontWeight: 700 }}>{etapaDaVirada.snapshots[0].username}</span>
            {' '}passou para a frente com{' '}
            <span style={{ color: 'var(--lime)', fontWeight: 700 }}>{etapaDaVirada.snapshots[0].pontosAcum}pts</span>
          </p>
        </div>
      )}

      {/* Timeline visual por etapa */}
      <div style={{ padding: '0.875rem 1.25rem' }}>
        <p style={{ fontSize: '0.72rem', color: 'var(--text-dim)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.75rem' }}>
          Evolução etapa a etapa
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {timeline.map(({ etapa, snapshots }) => (
            <div key={etapa.id} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-sub)', width: 28, flexShrink: 0 }}>
                {etapa.is_final ? '🏁' : `E${etapa.numero_etapa}`}
              </span>
              <div style={{ flex: 1, display: 'flex', gap: '0.4rem' }}>
                {snapshots.map((s, i) => {
                  const maxPts = Math.max(...snapshots.map(x => x.pontosAcum), 1)
                  const pct = Math.max(8, Math.round((s.pontosAcum / maxPts) * 100))
                  return (
                    <div key={s.userId} style={{ flex: 1 }}>
                      <div style={{ height: 6, background: 'var(--surface-2)', borderRadius: '999px', overflow: 'hidden' }}>
                        <div style={{
                          height: '100%', width: `${pct}%`,
                          background: i === 0 ? 'var(--lime)' : i === 1 ? 'var(--blue)' : '#ff9500',
                          borderRadius: '999px', transition: 'width 0.4s ease',
                        }} />
                      </div>
                      <p style={{ fontSize: '0.6rem', color: i === 0 ? 'var(--lime)' : 'var(--text-sub)', marginTop: '0.2rem', fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700 }}>
                        {s.username} {s.pontosAcum}
                      </p>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
