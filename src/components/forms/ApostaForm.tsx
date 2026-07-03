'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { Aposta, Ciclista, Prova } from '@/types'
import CyclistAutocomplete from './CyclistAutocomplete'
import { getConfigCategoria } from '@/lib/categoriaConfig'
import Confetti from '@/components/ui/Confetti'

interface Props {
  prova: Prova
  apostaExistente?: Aposta | null
  ciclistas: Ciclista[]
}

const S = {
  card: { background: '#fff', border: '1px solid #E9E4D9', borderRadius: 18, marginBottom: 20 } as React.CSSProperties,
  cardHeader: { padding: '20px 22px 16px', borderBottom: '1px solid #F1EDE3' } as React.CSSProperties,
  cardBody: { padding: '16px 22px 20px' } as React.CSSProperties,
  eyebrow: { fontFamily: "'JetBrains Mono', monospace", fontSize: 11, fontWeight: 600, letterSpacing: '0.16em', textTransform: 'uppercase' as const, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 },
  cardTitle: { font: "700 20px 'Archivo', sans-serif", color: '#16140F', margin: 0 } as React.CSSProperties,
  cardDesc: { font: "400 13px 'Archivo', sans-serif", color: '#A79F8E', margin: '5px 0 0' } as React.CSSProperties,
}

export function ApostaForm({ prova, apostaExistente, ciclistas }: Props) {
  const router = useRouter()
  const config = getConfigCategoria(prova.categoria)
  const numPos = config.numPosicoes

  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [sucesso, setSucesso] = useState(false)

  const [posicoes, setPosicoes] = useState<string[]>(() => {
    const arr = Array(numPos).fill('')
    if (apostaExistente?.apostas_top20) {
      for (let i = 0; i < Math.min(numPos, apostaExistente.apostas_top20.length); i++) {
        arr[i] = apostaExistente.apostas_top20[i] ?? ''
      }
    }
    return arr
  })
  const [camisolaSprint, setCamisolaSprint] = useState(apostaExistente?.camisola_sprint ?? '')
  const [camisolaMontanha, setCamisolaMontanha] = useState(apostaExistente?.camisola_montanha ?? '')
  const [camisolaJuventude, setCamisolaJuventude] = useState(apostaExistente?.camisola_juventude ?? '')

  const nomesValidos = new Set(ciclistas.map(c => c.nome))

  const handleCiclistaChange = (idx: number, valor: string) => {
    setPosicoes(prev => { const novo = [...prev]; novo[idx] = valor; return novo })
  }

  const moverCiclista = (idx: number, dir: 'cima' | 'baixo') => {
    const outro = dir === 'cima' ? idx - 1 : idx + 1
    if (outro < 0 || outro >= numPos) return
    setPosicoes(prev => { const novo = [...prev];[novo[idx], novo[outro]] = [novo[outro], novo[idx]]; return novo })
  }

  const handleSubmit = async () => {
    setErro(null)
    const vazios = posicoes.filter(c => !c.trim())
    if (vazios.length > 0) { setErro(`Preenche todos os ${numPos} lugares. Faltam ${vazios.length}.`); return }
    const invalidos = posicoes.filter(c => !nomesValidos.has(c.trim()))
    if (invalidos.length > 0) { setErro(`${invalidos.length} ciclista(s) não estão na startlist.`); return }
    const nomes = posicoes.map(c => c.trim())
    const duplicados = nomes.filter((n, idx) => nomes.indexOf(n) !== idx)
    if (duplicados.length > 0) { setErro('Há ciclistas repetidos na tua aposta.'); return }
    if (config.temCamisolas) {
      const preenchidas = [camisolaSprint, camisolaMontanha, camisolaJuventude].map(c => c.trim()).filter(Boolean)
      const invalidas = preenchidas.filter(c => !nomesValidos.has(c))
      if (invalidas.length > 0) { setErro('Ciclista de camisola não está na startlist.'); return }
    }

    const apostasTop20 = [...posicoes]
    while (apostasTop20.length < 20) apostasTop20.push('')

    setLoading(true)
    try {
      const res = await fetch('/api/apostas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prova_id: prova.id,
          apostas_top20: apostasTop20,
          camisola_sprint: config.temCamisolas ? camisolaSprint.trim() : '',
          camisola_montanha: config.temCamisolas ? camisolaMontanha.trim() : '',
          camisola_juventude: config.temCamisolas ? camisolaJuventude.trim() : '',
        }),
      })
      const data = await res.json()
      if (!res.ok) { setErro(data.error ?? 'Erro ao submeter aposta'); return }
      if (navigator.vibrate) navigator.vibrate([100, 50, 100])
      setSucesso(true)
      setTimeout(() => router.push('/'), 2500)
    } catch {
      setErro('Erro de rede. Tenta novamente.')
    } finally {
      setLoading(false)
    }
  }

  if (sucesso) {
    return (
      <>
        <Confetti active={true} />
        <div style={{ ...S.card, textAlign: 'center', padding: '3.5rem 1.5rem', marginBottom: 0 }}>
          <div style={{ fontSize: '3.5rem', marginBottom: 16 }}>🎉</div>
          <h2 style={{ font: "800 24px 'Archivo', sans-serif", color: '#16140F', margin: '0 0 8px', letterSpacing: '-0.01em' }}>
            {apostaExistente ? 'Aposta atualizada!' : 'Aposta submetida!'}
          </h2>
          <p style={{ font: "400 14px 'Archivo', sans-serif", color: '#857E6F' }}>A redirecionar para o início...</p>
        </div>
      </>
    )
  }

  const preenchidos = posicoes.filter(c => c.trim() && nomesValidos.has(c.trim())).length
  const completo = preenchidos === numPos
  const usadosPorPosicao = (idx: number) => posicoes.filter((c, i) => i !== idx && c.trim() && nomesValidos.has(c.trim()))

  return (
    <div>
      {/* Erro */}
      {erro && (
        <div style={{ background: 'rgba(224,69,31,0.06)', border: '1px solid rgba(224,69,31,0.2)', borderRadius: 12, padding: '12px 16px', font: "400 13px 'Archivo', sans-serif", color: '#E0451F', marginBottom: 16 }}>
          ⚠️ {erro}
        </div>
      )}

      {/* Top 20 */}
      <div style={S.card}>
        <div style={S.cardHeader}>
          <div style={{ ...S.eyebrow, color: '#E0451F' }}>
            <span>🏆</span>PREVISÃO
          </div>
          <h2 style={S.cardTitle}>Top {numPos}</h2>
          <p style={S.cardDesc}>Escreve e escolhe da lista · usa ↑↓ para reordenar</p>
        </div>
        <div style={{ ...S.cardBody, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {posicoes.map((ciclista, idx) => {
            const valido = ciclista.trim() && nomesValidos.has(ciclista.trim())
            return (
              <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                {/* Reorder */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 1, width: 18, flexShrink: 0 }}>
                  <button
                    onClick={() => moverCiclista(idx, 'cima')} disabled={idx === 0}
                    style={{ background: 'none', border: 'none', padding: 1, cursor: idx === 0 ? 'default' : 'pointer', color: '#B3AC9B', lineHeight: 0, opacity: idx === 0 ? 0.3 : 1 }}
                  >
                    <svg width="11" height="11" viewBox="0 0 16 16"><path d="M3.5 10L8 5.5 12.5 10" stroke="currentColor" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>
                  </button>
                  <button
                    onClick={() => moverCiclista(idx, 'baixo')} disabled={idx === numPos - 1}
                    style={{ background: 'none', border: 'none', padding: 1, cursor: idx === numPos - 1 ? 'default' : 'pointer', color: '#B3AC9B', lineHeight: 0, opacity: idx === numPos - 1 ? 0.3 : 1 }}
                  >
                    <svg width="11" height="11" viewBox="0 0 16 16"><path d="M3.5 6l4.5 4.5L12.5 6" stroke="currentColor" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>
                  </button>
                </div>

                {/* Rank badge */}
                <div style={{
                  width: 30, height: 30, borderRadius: 8, flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  font: "700 13px 'JetBrains Mono', monospace",
                  background: valido ? '#FBF2ED' : '#F4F0E6',
                  color: valido ? '#E0451F' : '#B3AC9B',
                  transition: 'background 0.15s, color 0.15s',
                }}>
                  {idx + 1}
                </div>

                {/* Autocomplete */}
                <div style={{ flex: 1 }}>
                  <CyclistAutocomplete
                    ciclistas={ciclistas}
                    value={ciclista}
                    onChange={val => handleCiclistaChange(idx, val)}
                    placeholder={`${idx + 1}.º ciclista`}
                    usados={usadosPorPosicao(idx)}
                  />
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Camisolas */}
      {config.temCamisolas && (
        <div style={S.card}>
          <div style={S.cardHeader}>
            <div style={{ ...S.eyebrow, color: '#2563EB' }}>
              <span>🎽</span>CLASSIFICAÇÕES ESPECIAIS
            </div>
            <h2 style={S.cardTitle}>Camisolas</h2>
            <p style={S.cardDesc}>Opcional — 1 ponto por acerto</p>
          </div>
          <div style={{ ...S.cardBody, display: 'flex', flexDirection: 'column', gap: 16 }}>
            {[
              { label: 'Sprint', cor: '#16A34A', dot: '#16A34A', value: camisolaSprint, set: setCamisolaSprint },
              { label: 'Montanha', cor: '#E0451F', dot: '#E0451F', value: camisolaMontanha, set: setCamisolaMontanha },
              { label: 'Juventude', cor: '#EAB308', dot: '#EAB308', value: camisolaJuventude, set: setCamisolaJuventude },
            ].map(({ label, dot, value, set }) => (
              <div key={label}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 8 }}>
                  <span style={{ width: 9, height: 9, borderRadius: '50%', background: dot, display: 'inline-block', flexShrink: 0 }} />
                  <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#6B665B' }}>{label}</span>
                </div>
                <CyclistAutocomplete ciclistas={ciclistas} value={value} onChange={set} placeholder="Nome do ciclista" />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Barra sticky de progresso + submeter */}
      <div style={{ position: 'sticky', bottom: 0, paddingTop: 6 }}>
        <div style={{ background: '#fff', border: '1px solid #E9E4D9', borderRadius: '14px 14px 0 0', padding: '14px 20px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 600, fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#A79F8E' }}>Progresso</span>
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, fontSize: 13, color: completo ? '#16140F' : '#A79F8E' }}>{preenchidos}/{numPos}</span>
        </div>
        <div style={{ background: '#fff', borderLeft: '1px solid #E9E4D9', borderRight: '1px solid #E9E4D9', padding: '8px 20px 16px' }}>
          <div style={{ height: 6, borderRadius: 3, background: '#F1ECE1', overflow: 'hidden' }}>
            <div style={{ height: '100%', borderRadius: 3, background: '#16140F', width: `${(preenchidos / numPos) * 100}%`, transition: 'width 0.2s ease' }} />
          </div>
        </div>
        <button
          onClick={handleSubmit}
          disabled={loading}
          style={{
            width: '100%', border: 'none', padding: 17,
            borderRadius: '0 0 14px 14px',
            background: loading ? '#857E6F' : '#16140F',
            color: '#fff', font: "700 15px 'Archivo', sans-serif",
            cursor: loading ? 'not-allowed' : 'pointer',
            transition: 'background 0.15s',
          }}
          onMouseEnter={e => { if (!loading) e.currentTarget.style.background = '#E0451F' }}
          onMouseLeave={e => { if (!loading) e.currentTarget.style.background = '#16140F' }}
        >
          {loading ? '⏳ A submeter...' : apostaExistente ? '💾 Atualizar Aposta' : '🚀 Submeter Aposta'}
        </button>
      </div>
    </div>
  )
}
