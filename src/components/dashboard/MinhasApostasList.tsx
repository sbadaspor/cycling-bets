'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import type { Prova } from '@/types'
import { categorizarProva, compararProvas, type CategoriaProva } from '@/lib/provaStatus'

interface DadosProva { prova: Prova; temAposta: boolean; pontos: number; temStartlist: boolean }
interface Props { dadosPorProva: DadosProva[]; userId: string }
type Filtro = 'todas' | 'a_decorrer' | 'futuras' | 'finalizadas'

export default function MinhasApostasList({ dadosPorProva, userId }: Props) {
  const [filtro, setFiltro] = useState<Filtro>('todas')

  const dadosCategorizados = useMemo(() =>
    dadosPorProva.map(d => ({ ...d, cat: categorizarProva(d.prova) }))
      .sort((a, b) => compararProvas(a.cat, b.cat))
  , [dadosPorProva])

  const contagens = useMemo(() => ({
    todas: dadosCategorizados.length,
    a_decorrer: dadosCategorizados.filter(d => d.cat.estado === 'a_decorrer').length,
    futuras: dadosCategorizados.filter(d => d.cat.estado === 'futura').length,
    finalizadas: dadosCategorizados.filter(d => d.cat.estado === 'finalizada').length,
  }), [dadosCategorizados])

  const filtrados = useMemo(() => {
    if (filtro === 'todas') return dadosCategorizados
    const map: Record<Exclude<Filtro, 'todas'>, CategoriaProva> = { a_decorrer: 'a_decorrer', futuras: 'futura', finalizadas: 'finalizada' }
    return dadosCategorizados.filter(d => d.cat.estado === map[filtro])
  }, [dadosCategorizados, filtro])

  const tabs: [Filtro, string, number][] = [
    ['todas', 'Todas', contagens.todas],
    ['a_decorrer', 'Ao vivo', contagens.a_decorrer],
    ['futuras', 'Futuras', contagens.futuras],
    ['finalizadas', 'Terminadas', contagens.finalizadas],
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, background: '#fff', border: '1px solid #E9E4D9', borderRadius: 12, padding: 4, width: 'fit-content', flexWrap: 'wrap' }}>
        {tabs.map(([f, label, count]) => (
          <button
            key={f}
            onClick={() => setFiltro(f)}
            style={{
              padding: '7px 14px', borderRadius: 8, fontSize: 13, fontWeight: 600,
              cursor: 'pointer', border: 'none', transition: 'all 0.15s',
              background: filtro === f ? '#16140F' : 'transparent',
              color: filtro === f ? '#fff' : '#857E6F',
              fontFamily: "'Archivo', sans-serif",
            }}
          >
            {label}
            <span style={{ marginLeft: 5, fontSize: 11, opacity: 0.65 }}>({count})</span>
          </button>
        ))}
      </div>

      {/* List */}
      {filtrados.length === 0 ? (
        <div style={{ background: '#fff', border: '1px solid #E9E4D9', borderRadius: 16, padding: '3rem 1.5rem', textAlign: 'center' }}>
          <div style={{ fontSize: 28, marginBottom: 10 }}>🏁</div>
          <p style={{ font: "500 14px 'Archivo', sans-serif", color: '#A79F8E', margin: 0 }}>Não há provas nesta categoria.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {filtrados.map((d) => {
            const { prova, cat, temAposta, pontos, temStartlist } = d

            let statusColor = '#A79F8E'
            let statusLabel = ''
            let statusDot = false
            if (cat.estado === 'a_decorrer') { statusLabel = 'Ao vivo'; statusColor = '#16A34A'; statusDot = true }
            else if (cat.estado === 'futura') {
              const dias = cat.diasAteInicio
              statusLabel = dias === 0 ? 'Hoje' : dias === 1 ? 'Amanhã' : `Em ${dias} dias`
              statusColor = '#2563EB'
            } else { statusLabel = 'Finalizada' }

            let acao: { texto: string; href: string; type: 'primary' | 'secondary' | 'disabled' } | null = null
            if (cat.estado === 'futura') {
              if (!temStartlist) acao = { texto: 'Sem startlist', href: '#', type: 'disabled' }
              else if (temAposta) acao = { texto: '✏️ Editar', href: `/apostas/${prova.id}`, type: 'secondary' }
              else acao = { texto: 'Apostar →', href: `/apostas/${prova.id}`, type: 'primary' }
            } else {
              if (temAposta) acao = { texto: 'Ver aposta', href: `/provas/${prova.id}/apostas/${userId}`, type: 'secondary' }
              else acao = { texto: 'Sem aposta', href: '#', type: 'disabled' }
            }

            return (
              <div
                key={prova.id}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  gap: 14, padding: '16px 18px',
                  background: '#fff', border: '1px solid #E9E4D9', borderRadius: 14,
                  transition: 'border-color 0.15s',
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                    <span style={{ font: "600 15px 'Archivo', sans-serif", color: '#16140F', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {prova.nome}
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, fontWeight: 600, color: statusColor, flexShrink: 0 }}>
                      {statusDot && <span style={{ width: 6, height: 6, borderRadius: '50%', background: statusColor, display: 'inline-block' }} />}
                      {statusLabel}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: '#A79F8E' }}>
                      {new Date(prova.data_inicio).toLocaleDateString('pt-PT', { day: 'numeric', month: 'short' })}
                      {' → '}
                      {new Date(prova.data_fim).toLocaleDateString('pt-PT', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </span>
                    {temAposta && cat.estado !== 'futura' && (
                      <span style={{ font: "800 14px 'Archivo', sans-serif", color: '#16140F' }}>
                        {pontos} pts
                      </span>
                    )}
                  </div>
                </div>

                {acao && (
                  acao.type === 'disabled' ? (
                    <span style={{ padding: '8px 14px', borderRadius: 9, fontSize: 13, fontWeight: 500, background: '#F4F0E6', color: '#A79F8E', border: '1px solid #E9E4D9', whiteSpace: 'nowrap', flexShrink: 0 }}>
                      {acao.texto}
                    </span>
                  ) : acao.type === 'primary' ? (
                    <Link href={acao.href} style={{ padding: '8px 16px', borderRadius: 9, background: '#16140F', color: '#fff', font: "700 13px 'Archivo', sans-serif", textDecoration: 'none', whiteSpace: 'nowrap', flexShrink: 0 }}>
                      {acao.texto}
                    </Link>
                  ) : (
                    <Link href={acao.href} style={{ padding: '8px 14px', borderRadius: 9, border: '1px solid #E3DDD0', background: 'transparent', font: "600 13px 'Archivo', sans-serif", color: '#16140F', textDecoration: 'none', whiteSpace: 'nowrap', flexShrink: 0 }}>
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
