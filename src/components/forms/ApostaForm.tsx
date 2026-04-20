'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { Aposta, Ciclista, Prova } from '@/types'
import CyclistAutocomplete from './CyclistAutocomplete'
import { getConfigCategoria } from '@/lib/categoriaConfig'

interface Props {
  prova: Prova
  apostaExistente?: Aposta | null
  ciclistas: Ciclista[]
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
    setPosicoes(prev => {
      const novo = [...prev]
      novo[idx] = valor
      return novo
    })
  }

  // Troca dois ciclistas de posição
  const moverCiclista = (idx: number, direcao: 'cima' | 'baixo') => {
    const outro = direcao === 'cima' ? idx - 1 : idx + 1
    if (outro < 0 || outro >= numPos) return
    setPosicoes(prev => {
      const novo = [...prev]
      ;[novo[idx], novo[outro]] = [novo[outro], novo[idx]]
      return novo
    })
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
      setSucesso(true)
      setTimeout(() => router.push('/'), 2000)
    } catch {
      setErro('Erro de rede. Tenta novamente.')
    } finally {
      setLoading(false)
    }
  }

  if (sucesso) {
    return (
      <div className="card animate-fade-up" style={{ textAlign: 'center', padding: '3.5rem 1.25rem' }}>
        <div style={{ fontSize: '3.5rem', marginBottom: '1rem' }}>🎉</div>
        <h2 style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '1.75rem', fontWeight: 800, color: 'var(--lime)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.5rem' }}>
          {apostaExistente ? 'Aposta atualizada!' : 'Aposta submetida!'}
        </h2>
        <p style={{ color: 'var(--text-dim)', fontSize: '0.875rem' }}>A redirecionar para o dashboard...</p>
      </div>
    )
  }

  const preenchidos = posicoes.filter(c => c.trim() && nomesValidos.has(c.trim())).length
  const completo = preenchidos === numPos
  const usadosPorPosicao = (idx: number) =>
    posicoes.filter((c, i) => i !== idx && c.trim() && nomesValidos.has(c.trim()))

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>

      {erro && (
        <div className="animate-fade-up" style={{
          background: 'rgba(255,68,68,0.08)', border: '1px solid rgba(255,68,68,0.25)',
          borderRadius: '0.875rem', padding: '0.875rem 1rem',
          fontSize: '0.85rem', color: 'var(--red)',
        }}>
          ⚠️ {erro}
        </div>
      )}

      <div className="card-flush animate-fade-up">
        <div style={{ padding: '1rem 1.25rem 0.875rem', borderBottom: '1px solid var(--border)', background: 'linear-gradient(135deg, rgba(200,244,0,0.05) 0%, transparent 60%)' }}>
          <p style={{ fontSize: '0.68rem', color: 'var(--lime)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.2rem' }}>
            🏆 Previsão
          </p>
          <h2 className="section-title" style={{ fontSize: '1.2rem', marginBottom: '0.2rem' }}>Top {numPos}</h2>
          <p style={{ fontSize: '0.78rem', color: 'var(--text-dim)' }}>
            Escreve e escolhe da lista · usa ↑↓ para reordenar
          </p>
        </div>

        <div style={{ padding: '0.875rem 1.25rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {posicoes.map((ciclista, idx) => {
            const highlight = numPos === 10 ? idx < 5 : idx < 10
            const valido = ciclista.trim() && nomesValidos.has(ciclista.trim())
            const invalido = ciclista.trim() && !nomesValidos.has(ciclista.trim())

            return (
              <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>

                {/* Botões ↑↓ */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2, flexShrink: 0 }}>
                  <button
                    onClick={() => moverCiclista(idx, 'cima')}
                    disabled={idx === 0}
                    title="Mover para cima"
                    style={{
                      width: 22, height: 22, padding: 0, border: 'none', borderRadius: 4,
                      background: idx === 0 ? 'transparent' : 'var(--surface-2)',
                      color: idx === 0 ? 'transparent' : 'var(--text-dim)',
                      cursor: idx === 0 ? 'default' : 'pointer',
                      fontSize: '0.7rem', lineHeight: 1,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}
                  >▲</button>
                  <button
                    onClick={() => moverCiclista(idx, 'baixo')}
                    disabled={idx === numPos - 1}
                    title="Mover para baixo"
                    style={{
                      width: 22, height: 22, padding: 0, border: 'none', borderRadius: 4,
                      background: idx === numPos - 1 ? 'transparent' : 'var(--surface-2)',
                      color: idx === numPos - 1 ? 'transparent' : 'var(--text-dim)',
                      cursor: idx === numPos - 1 ? 'default' : 'pointer',
                      fontSize: '0.7rem', lineHeight: 1,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}
                  >▼</button>
                </div>

                {/* Número de posição */}
                <div style={{
                  width: 32, height: 32, borderRadius: '0.5rem', flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '0.8rem', fontWeight: 800,
                  fontFamily: 'Barlow Condensed, sans-serif',
                  background: valido
                    ? 'rgba(200,244,0,0.12)'
                    : highlight ? 'var(--surface-2)' : 'var(--bg)',
                  border: `1px solid ${valido ? 'rgba(200,244,0,0.3)' : invalido ? 'rgba(255,68,68,0.4)' : 'var(--border)'}`,
                  color: valido ? 'var(--lime)' : highlight ? 'var(--text-dim)' : 'var(--text-sub)',
                }}>
                  {idx + 1}
                </div>

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

      {config.temCamisolas && (
        <div className="card-flush animate-fade-up delay-1">
          <div style={{ padding: '1rem 1.25rem 0.875rem', borderBottom: '1px solid var(--border)' }}>
            <p style={{ fontSize: '0.68rem', color: 'var(--lime)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.2rem' }}>
              🎽 Classificações especiais
            </p>
            <h2 className="section-title" style={{ fontSize: '1.2rem', marginBottom: '0.2rem' }}>Camisolas</h2>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-dim)' }}>Opcional — 1 ponto por acerto</p>
          </div>
          <div style={{ padding: '0.875rem 1.25rem', display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
            {[
              { label: '🟢 Camisola Sprint',    value: camisolaSprint,    set: setCamisolaSprint },
              { label: '🔴 Camisola Montanha',  value: camisolaMontanha,  set: setCamisolaMontanha },
              { label: '⚪ Camisola Juventude', value: camisolaJuventude, set: setCamisolaJuventude },
            ].map(({ label, value, set }) => (
              <div key={label}>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-dim)', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {label}
                </label>
                <CyclistAutocomplete ciclistas={ciclistas} value={value} onChange={set} placeholder="Nome do ciclista" />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Progresso */}
      <div className="card animate-fade-up delay-2" style={{ padding: '1rem 1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.625rem' }}>
          <span style={{ fontSize: '0.78rem', color: 'var(--text-dim)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Progresso
          </span>
          <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '1rem', fontWeight: 800, color: completo ? 'var(--lime)' : 'var(--text-dim)' }}>
            {preenchidos}/{numPos}
          </span>
        </div>
        <div style={{ height: 6, background: 'var(--surface-2)', borderRadius: 3, overflow: 'hidden' }}>
          <div style={{
            height: '100%', borderRadius: 3,
            width: `${(preenchidos / numPos) * 100}%`,
            background: completo ? 'var(--lime)' : 'var(--surface-2)',
            border: completo ? 'none' : '1px solid var(--border-hi)',
            boxShadow: completo ? '0 0 12px var(--lime-glow)' : 'none',
            transition: 'width 0.3s ease, background 0.3s ease',
          }} />
        </div>
      </div>

      <button
        onClick={handleSubmit}
        disabled={loading}
        className="btn-primary animate-fade-up delay-3"
        style={{ width: '100%', padding: '0.9rem', fontSize: '1.05rem' }}
      >
        {loading ? '⏳ A submeter...' : apostaExistente ? '💾 Atualizar Aposta' : '🚀 Submeter Aposta'}
      </button>
    </div>
  )
}
