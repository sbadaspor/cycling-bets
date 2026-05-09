'use client'

import { useRouter } from 'next/navigation'
import type { EtapaResultado } from '@/types'

interface Props {
  etapas: EtapaResultado[]
  etapaActivaNum: number | null
  provaId: string
  hoje: string
  etapasComResultado: number[]
}

export default function EtapaSelector({ etapas, etapaActivaNum, provaId, hoje, etapasComResultado }: Props) {
  const router = useRouter()
  const temResultadoSet = new Set(etapasComResultado)

  function getEstado(e: EtapaResultado): 'resultado' | 'hoje' | 'futura' {
    if (temResultadoSet.has(e.numero_etapa)) return 'resultado'
    if (e.data_etapa === hoje) return 'hoje'
    return 'futura'
  }

  return (
    <div style={{
      background: 'var(--surface)',
      border: '1px solid var(--border)',
      borderRadius: '1rem',
      padding: '0.75rem 1rem',
      overflowX: 'auto',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', minWidth: 'max-content' }}>
        <span style={{ fontSize: '0.65rem', color: 'var(--text-sub)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginRight: '0.5rem', flexShrink: 0 }}>
          Etapa
        </span>
        {etapas.map(e => {
          const estado = getEstado(e)
          const ativo = e.numero_etapa === etapaActivaNum

          const bg = ativo
            ? 'var(--lime)'
            : estado === 'resultado'
            ? 'rgba(200,244,0,0.1)'
            : estado === 'hoje'
            ? 'rgba(255,149,0,0.15)'
            : 'var(--surface-2)'

          const cor = ativo
            ? '#0a0a0f'
            : estado === 'resultado'
            ? 'var(--lime)'
            : estado === 'hoje'
            ? '#ff9500'
            : 'var(--text-sub)'

          const border = ativo
            ? 'transparent'
            : estado === 'resultado'
            ? 'rgba(200,244,0,0.25)'
            : estado === 'hoje'
            ? 'rgba(255,149,0,0.4)'
            : 'var(--border)'

          return (
            <button
              key={e.numero_etapa}
              onClick={() => router.push(`/provas/${provaId}?etapa=${e.numero_etapa}`)}
              title={`Etapa ${e.numero_etapa} · ${e.data_etapa}${estado === 'resultado' ? ' ✅' : estado === 'hoje' ? ' 🔴' : ' ⏳'}`}
              style={{
                width: 32, height: 32, borderRadius: '0.5rem', flexShrink: 0,
                background: bg, border: `1px solid ${border}`,
                color: cor, fontFamily: 'Barlow Condensed, sans-serif',
                fontSize: '0.78rem', fontWeight: 800, cursor: 'pointer',
                transition: 'all 0.15s', position: 'relative',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              {e.numero_etapa}
              {estado === 'hoje' && !ativo && (
                <span style={{
                  position: 'absolute', top: -3, right: -3,
                  width: 7, height: 7, borderRadius: '50%',
                  background: '#ff9500', border: '1px solid var(--surface)',
                }} />
              )}
            </button>
          )
        })}

        {/* Legenda */}
        <div style={{ display: 'flex', gap: '0.75rem', marginLeft: '0.75rem', paddingLeft: '0.75rem', borderLeft: '1px solid var(--border)', flexShrink: 0 }}>
          {[
            { cor: 'var(--lime)', label: 'resultado' },
            { cor: '#ff9500', label: 'hoje' },
            { cor: 'var(--text-sub)', label: 'por vir' },
          ].map(l => (
            <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: l.cor, flexShrink: 0 }} />
              <span style={{ fontSize: '0.62rem', color: 'var(--text-sub)', whiteSpace: 'nowrap' }}>{l.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
