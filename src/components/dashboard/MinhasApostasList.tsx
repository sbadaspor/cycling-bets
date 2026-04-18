'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import type { Prova } from '@/types'
import { categorizarProva, compararProvas, type CategoriaProva } from '@/lib/provaStatus'

interface DadosProva {
  prova: Prova
  temAposta: boolean
  pontos: number
  temStartlist: boolean
}

interface Props {
  dadosPorProva: DadosProva[]
  userId: string
}

type Filtro = 'todas' | 'a_decorrer' | 'futuras' | 'finalizadas'

export default function MinhasApostasList({ dadosPorProva, userId }: Props) {
  const [filtro, setFiltro] = useState<Filtro>('todas')

  const dadosCategorizados = useMemo(() => {
    return dadosPorProva
      .map(d => ({ ...d, cat: categorizarProva(d.prova) }))
      .sort((a, b) => compararProvas(a.cat, b.cat))
  }, [dadosPorProva])

  const contagens = useMemo(() => ({
    todas: dadosCategorizados.length,
    a_decorrer: dadosCategorizados.filter(d => d.cat.estado === 'a_decorrer').length,
    futuras: dadosCategorizados.filter(d => d.cat.estado === 'futura').length,
    finalizadas: dadosCategorizados.filter(d => d.cat.estado === 'finalizada').length,
  }), [dadosCategorizados])

  const filtrados = useMemo(() => {
    if (filtro === 'todas') return dadosCategorizados
    const map: Record<Exclude<Filtro, 'todas'>, CategoriaProva> = {
      a_decorrer: 'a_decorrer', futuras: 'futura', finalizadas: 'finalizada',
    }
    return dadosCategorizados.filter(d => d.cat.estado === map[filtro])
  }, [dadosCategorizados, filtro])

  const tabs: [Filtro, string, number][] = [
    ['todas', 'Todas', contagens.todas],
    ['a_decorrer', 'Ao vivo', contagens.a_decorrer],
    ['futuras', 'Futuras', contagens.futuras],
    ['finalizadas', 'Terminadas', contagens.finalizadas],
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

      {/* Filter tabs */}
      <div style={{
        display: 'flex', gap: '0.25rem',
        background: 'var(--surface)', border: '1px solid var(--border)',
        borderRadius: '0.875rem', padding: '0.25rem',
        width: 'fit-content', flexWrap: 'wrap',
      }}>
        {tabs.map(([f, label, count]) => (
          <button
            key={f}
            onClick={() => setFiltro(f)}
            style={{
              padding: '0.4rem 0.875rem', borderRadius: '0.625rem',
              fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer',
              border: 'none', transition: 'all 0.15s',
              background: filtro === f ? 'var(--lime)' : 'transparent',
              color: filtro === f ? '#0a0a0f' : 'var(--text-dim)',
              fontFamily: 'DM Sans, sans-serif',
            }}
          >
            {label}
            <span style={{
              marginLeft: '0.35rem', fontSize: '0.7rem',
              opacity: filtro === f ? 0.7 : 0.5,
            }}>
              {count}
            </span>
          </button>
        ))}
      </div>

      {/* List */}
      {filtrados.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem 1.25rem', color: 'var(--text-dim)' }}>
          <div style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>🏁</div>
          <p style={{ fontSize: '0.9rem' }}>Não há provas nesta categoria.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
          {filtrados.map((d, i) => {
            const { prova, cat, temAposta, pontos, temStartlist } = d

            let statusColor = 'var(--text-sub)'
            let statusLabel = ''
            if (cat.estado === 'a_decorrer') { statusLabel = '● Ao vivo'; statusColor = 'var(--green)' }
            else if (cat.estado === 'futura') {
              const dias = cat.diasAteInicio
              statusLabel = dias === 0 ? 'Hoje' : dias === 1 ? 'Amanhã' : `${dias} dias`
              statusColor = 'var(--blue)'
            } else { statusLabel = 'Finalizada'; statusColor = 'var(--text-sub)' }

            // Action
            let acao: { texto: string; href: string; type: 'primary' | 'secondary' | 'disabled' } | null = null
            if (cat.estado === 'futura') {
              if (!temStartlist) acao = { texto: 'Sem startlist', href: '#', type: 'disabled' }
              else if (temAposta) acao = { texto: 'Editar →', href: `/apostas/${prova.id}`, type: 'primary' }
              else acao = { texto: 'Apostar →', href: `/apostas/${prova.id}`, type: 'primary' }
            } else {
              if (temAposta) acao = { texto: 'Ver aposta', href: `/provas/${prova.id}/apostas/${userId}`, type: 'secondary' }
              else acao = { texto: 'Sem aposta', href: '#', type: 'disabled' }
            }

            return (
              <div
                key={prova.id}
                className={`animate-fade-up delay-${Math.min(i + 1, 5)}`}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  gap: '0.875rem', padding: '1rem 1.1rem',
                  background: 'var(--surface)', border: '1px solid var(--border)',
                  borderRadius: '0.875rem',
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.3rem' }}>
                    <span style={{
                      fontSize: '0.95rem', fontWeight: 600, color: 'var(--text)',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                      {prova.nome}
                    </span>
                    <span style={{ fontSize: '0.7rem', fontWeight: 700, color: statusColor, flexShrink: 0 }}>
                      {statusLabel}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <span style={{ fontSize: '0.73rem', color: 'var(--text-sub)' }}>
                      {new Date(prova.data_inicio).toLocaleDateString('pt-PT', { day: 'numeric', month: 'short' })}
                      {' → '}
                      {new Date(prova.data_fim).toLocaleDateString('pt-PT', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </span>
                    {temAposta && cat.estado !== 'futura' && (
                      <span style={{
                        fontSize: '0.72rem', fontWeight: 700,
                        color: 'var(--lime)',
                        fontFamily: 'Barlow Condensed, sans-serif',
                      }}>
                        {pontos} pts
                      </span>
                    )}
                  </div>
                </div>

                {acao && (
                  acao.type === 'disabled' ? (
                    <span style={{
                      padding: '0.4rem 0.875rem', borderRadius: '0.75rem',
                      fontSize: '0.78rem', fontWeight: 500,
                      background: 'var(--surface-2)', color: 'var(--text-sub)',
                      border: '1px solid var(--border)', whiteSpace: 'nowrap', flexShrink: 0,
                    }}>
                      {acao.texto}
                    </span>
                  ) : acao.type === 'primary' ? (
                    <Link href={acao.href} className="btn-primary" style={{ padding: '0.45rem 1rem', fontSize: '0.82rem', flexShrink: 0 }}>
                      {acao.texto}
                    </Link>
                  ) : (
                    <Link href={acao.href} className="btn-secondary" style={{ padding: '0.45rem 1rem', fontSize: '0.82rem', flexShrink: 0 }}>
                      {acao.texto}
                    </Link>
                  )
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
