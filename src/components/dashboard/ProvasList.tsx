import React from 'react'
import Link from 'next/link'
import type { Prova, CategoriaProvaTipo } from '@/types'
import { categorizarProva, compararProvas } from '@/lib/provaStatus'

interface Props {
  provas: Prova[]
  userId?: string
  provasComAposta?: Set<string>
}

const CATEGORIA_LABEL: Record<CategoriaProvaTipo, string> = {
  grande_volta:  'Grande Volta',
  prova_semana:  'Prova da Semana',
  monumento:     'Monumento',
  prova_dia:     'Prova de um dia',
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('pt-PT', { day: 'numeric', month: 'short', year: 'numeric' })
}

function countdown(dias: number): string {
  if (dias <= 0) return 'Hoje'
  if (dias === 1) return '1 dia'
  return `${dias} dias`
}

export function ProvasList({ provas, userId, provasComAposta = new Set() }: Props) {
  const futuras = provas
    .map(categorizarProva)
    .filter(p => p.estado === 'futura')
    .sort(compararProvas)

  if (futuras.length === 0) {
    return (
      <section style={{ background: '#fff', border: '1px solid #E9E4D9', borderRadius: 16, padding: 20 }}>
        <div style={{ textAlign: 'center', padding: '1.5rem 0', color: '#A79F8E', fontSize: 14 }}>
          Sem provas agendadas
        </div>
      </section>
    )
  }

  return (
    <section style={{ background: '#fff', border: '1px solid #E9E4D9', borderRadius: 16, padding: 20 }}>
      <div style={{
        fontFamily: "'JetBrains Mono', monospace", fontSize: 11, fontWeight: 600,
        letterSpacing: '0.16em', textTransform: 'uppercase', color: '#A79F8E',
        marginBottom: 14,
      }}>
        Próximas provas
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {futuras.map(prova => {
          const dias = prova.diasAteInicio
          const jaApostou = provasComAposta.has(prova.id)
          const tag = prova.categoria ? CATEGORIA_LABEL[prova.categoria] : 'Prova'

          return (
            <div
              key={prova.id}
              style={{ border: '1px solid #ECE8DE', borderRadius: 13, padding: 16, background: '#FCFBF7' }}
            >
              {/* Tag categoria */}
              <span style={{
                display: 'inline-block',
                fontFamily: "'JetBrains Mono', monospace", fontSize: 10, fontWeight: 600,
                letterSpacing: '0.1em', textTransform: 'uppercase',
                color: '#857E6F', background: '#F1ECE1',
                padding: '4px 8px', borderRadius: 6,
              }}>
                {tag}
              </span>

              {/* Nome */}
              <div style={{ font: "700 16px 'Archivo', sans-serif", color: '#16140F', margin: '11px 0 3px' }}>
                {prova.nome}
              </div>

              {/* Datas */}
              <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: '#A79F8E', letterSpacing: '0.02em' }}>
                {formatDate(prova.data_inicio)} → {formatDate(prova.data_fim)}
              </div>

              {/* Countdown + botão */}
              <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: 15 }}>
                <div>
                  <div style={{ font: "700 17px 'JetBrains Mono', monospace", color: '#16140F', letterSpacing: '-0.01em' }}>
                    {countdown(dias)}
                  </div>
                  <div style={{ font: "500 11px 'Archivo', sans-serif", color: '#A79F8E', marginTop: 2 }}>
                    para fechar apostas
                  </div>
                </div>

                {userId && (
                  <Link
                    href={`/apostas/${prova.id}`}
                    style={{
                      padding: '10px 16px', borderRadius: 10,
                      background: jaApostou ? '#F4F0E6' : '#16140F',
                      color: jaApostou ? '#857E6F' : '#fff',
                      font: "700 13px 'Archivo', sans-serif",
                      textDecoration: 'none', whiteSpace: 'nowrap',
                      border: jaApostou ? '1px solid #E9E4D9' : 'none',
                    }}
                  >
                    {jaApostou ? '✏️ Editar' : 'Apostar →'}
                  </Link>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
