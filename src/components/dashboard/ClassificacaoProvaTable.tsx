'use client'

import Link from 'next/link'
import type { Aposta, EtapaResultado, Prova } from '@/types'
import { calcularPontos } from '@/lib/pontuacao'
import type { CategoriaProvaTipo } from '@/types'
import { nomeExibir, inicialAvatar } from '@/lib/perfil'

// Cor fixa por posição no ranking
const PLAYER_COLORS = ['#E0451F', '#2563EB', '#16A34A', '#E8488B', '#EAB308']

interface Props {
  prova: Prova
  apostas: Aposta[]
  ultimaEtapa: EtapaResultado | null
  titulo?: string
}

export default function ClassificacaoProvaTable({ prova, apostas, ultimaEtapa, titulo }: Props) {
  const apostasComPontos = apostas.map(aposta => {
    if (!ultimaEtapa) return { ...aposta, pontosCalc: aposta.pontos_total }
    const calc = calcularPontos(
      aposta.apostas_top20,
      ultimaEtapa.classificacao_geral_top20,
      { sprint: aposta.camisola_sprint ?? '', montanha: aposta.camisola_montanha ?? '', juventude: aposta.camisola_juventude ?? '' },
      { sprint: ultimaEtapa.camisola_sprint ?? '', montanha: ultimaEtapa.camisola_montanha ?? '', juventude: ultimaEtapa.camisola_juventude ?? '' },
      prova.categoria as CategoriaProvaTipo
    )
    return { ...aposta, pontosCalc: calc.pontos_total, pontosTop10Calc: calc.pontos_top10, pontosTop20Calc: calc.pontos_top20, pontosCamisolasCalc: calc.pontos_camisolas }
  })

  const ordenadas = [...apostasComPontos].sort((a, b) => b.pontosCalc - a.pontosCalc)
  const tituloFinal = titulo ?? prova.nome
  const isAoVivo = prova.status !== 'finalizada' && !!ultimaEtapa
  const isFinalizada = prova.status === 'finalizada'

  return (
    <section style={{ background: '#fff', border: '1px solid #E9E4D9', borderRadius: 16, padding: 22 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
          {isAoVivo && (
            <>
              <span style={{
                width: 7, height: 7, borderRadius: '50%', background: '#E0451F', flexShrink: 0,
                animation: 'vpPulse 1.4s ease-in-out infinite', display: 'inline-block',
              }} />
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, fontWeight: 600, letterSpacing: '0.16em', textTransform: 'uppercase', color: '#E0451F' }}>
                Ao vivo
              </span>
            </>
          )}
          <Link href={`/provas/${prova.id}`} style={{ textDecoration: 'none' }}>
            <h2 style={{ font: "700 18px 'Archivo', sans-serif", color: '#16140F', margin: isAoVivo ? '0 0 0 6px' : 0 }}>
              Classificação · {tituloFinal}
            </h2>
          </Link>
        </div>
        {ultimaEtapa && (
          <span style={{
            fontFamily: "'JetBrains Mono', monospace", fontSize: 11, fontWeight: 600,
            letterSpacing: '0.06em', color: '#857E6F',
            background: '#F4F0E6', border: '1px solid #E9E4D9',
            padding: '5px 10px', borderRadius: 7,
          }}>
            Etapa {ultimaEtapa.numero_etapa}{ultimaEtapa.is_final ? ' · Final' : ''}
          </span>
        )}
        {isFinalizada && !ultimaEtapa && (
          <span style={{
            fontFamily: "'JetBrains Mono', monospace", fontSize: 11, fontWeight: 600,
            letterSpacing: '0.06em', color: '#857E6F',
            background: '#F4F0E6', border: '1px solid #E9E4D9',
            padding: '5px 10px', borderRadius: 7,
          }}>
            Finalizada
          </span>
        )}
      </div>

      {/* Rows */}
      {ordenadas.length === 0 ? (
        <div style={{ padding: '2rem 0', textAlign: 'center', color: '#A79F8E', fontSize: 14 }}>
          Ainda não há apostas nesta prova.
        </div>
      ) : !ultimaEtapa ? (
        <div style={{ padding: '2rem 0', textAlign: 'center', color: '#A79F8E', fontSize: 14 }}>
          A aguardar primeira etapa.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {ordenadas.map((a, idx) => {
            const cor = PLAYER_COLORS[idx] ?? '#A79F8E'
            const inicial = inicialAvatar(a.perfil)
            const nome = nomeExibir(a.perfil)
            const pontos = a.pontosCalc
            const isLider = idx === 0

            return (
              <Link
                key={a.id}
                href={`/provas/${prova.id}/apostas/${a.user_id}`}
                style={{
                  display: 'flex', alignItems: 'center', gap: 15,
                  padding: '15px 16px', borderRadius: 12,
                  background: '#fff', border: '1px solid #ECE8DE',
                  textDecoration: 'none', transition: 'background 0.15s, border-color 0.15s',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = '#FBFAF5'; e.currentTarget.style.borderColor = '#E0DACB' }}
                onMouseLeave={e => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.borderColor = '#ECE8DE' }}
              >
                {/* Barra lateral colorida */}
                <div style={{ width: 4, height: 38, borderRadius: 4, background: cor, flexShrink: 0 }} />

                {/* Rank */}
                <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 14, fontWeight: 700, color: '#B3AC9B', width: 16, textAlign: 'center', flexShrink: 0 }}>
                  {idx + 1}
                </div>

                {/* Avatar */}
                <div style={{
                  width: 40, height: 40, borderRadius: '50%', flexShrink: 0, overflow: 'hidden',
                  background: a.perfil?.avatar_url ? 'transparent' : cor,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  font: "700 13px 'Archivo', sans-serif", color: '#fff',
                }}>
                  {a.perfil?.avatar_url
                    ? <img src={a.perfil.avatar_url} alt={nome} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : inicial
                  }
                </div>

                {/* Nome + sub */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ font: "700 16px 'Archivo', sans-serif", color: '#16140F', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {nome}
                  </div>
                  <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginTop: 3, fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: '#A79F8E', letterSpacing: '0.03em' }}>
                    <span>T10 {('pontosTop10Calc' in a ? (a as any).pontosTop10Calc : a.pontos_top10)}</span>
                    <span>T20 {('pontosTop20Calc' in a ? (a as any).pontosTop20Calc : a.pontos_top20)}</span>
                    {isLider && isAoVivo && <span style={{ color: '#E0451F', textTransform: 'uppercase', letterSpacing: '0.1em' }}>● Líder</span>}
                  </div>
                </div>

                {/* Pontos */}
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <span style={{ font: "800 27px 'Archivo', sans-serif", color: '#16140F', letterSpacing: '-0.02em' }}>
                    {pontos}
                  </span>
                  <span style={{ font: "600 12px 'Archivo', sans-serif", color: '#A79F8E', marginLeft: 3 }}>
                    pts
                  </span>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </section>
  )
}
