'use client'

import { useState, useRef } from 'react'
import type { Ciclista } from '@/types'

interface ParsedCyclist {
  posicao: number
  nome: string
  tempo: string
  matched: boolean
}

interface Props {
  ciclistas: Ciclista[]
  numPosicoes: number
  onAplicar: (params: {
    posicoes: string[]
    todosOsCiclistas: Array<{ posicao: number; nome: string; tempo: string }>
  }) => void
  onCancelar: () => void
}

export default function CsvResultsParser({ ciclistas, numPosicoes, onAplicar, onCancelar }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [cyclists, setCyclists] = useState<ParsedCyclist[]>([])
  const [fileName, setFileName] = useState<string | null>(null)

  const nomesValidos = new Set(ciclistas.map(c => c.nome))

  function parseCsv(text: string): ParsedCyclist[] {
    const lines = text.trim().split('\n').filter(l => l.trim())
    const result: ParsedCyclist[] = []

    // Detectar se tem header (primeira linha com "posicao" ou "pos" ou texto não numérico)
    let startIdx = 0
    const firstCell = lines[0]?.split(',')[0]?.trim().toLowerCase() ?? ''
    if (isNaN(Number(firstCell))) startIdx = 1

    for (let i = startIdx; i < lines.length; i++) {
      const cols = lines[i].split(',').map(c => c.trim().replace(/^"|"$/g, ''))
      if (cols.length < 2) continue

      const posicao = parseInt(cols[0])
      if (isNaN(posicao)) continue

      const nome = cols[1]?.trim() ?? ''
      const tempo = cols[2]?.trim() ?? ''

      if (!nome) continue

      result.push({
        posicao,
        nome,
        tempo,
        matched: nomesValidos.has(nome),
      })
    }

    return result.sort((a, b) => a.posicao - b.posicao)
  }

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.name.endsWith('.csv') && !file.type.includes('csv') && !file.type.includes('text')) {
      setErro('Por favor selecciona um ficheiro .csv')
      return
    }
    setFileName(file.name)
    setErro(null)

    const reader = new FileReader()
    reader.onload = (ev) => {
      const text = ev.target?.result as string
      try {
        const parsed = parseCsv(text)
        if (parsed.length === 0) {
          setErro('Não foi possível extrair dados do CSV. Verifica o formato: posicao,nome,tempo')
          return
        }
        setCyclists(parsed)
      } catch {
        setErro('Erro ao processar o ficheiro CSV.')
      }
    }
    reader.readAsText(file)
  }

  function updateNome(idx: number, nome: string) {
    setCyclists(prev => prev.map((c, i) => i === idx ? { ...c, nome, matched: nomesValidos.has(nome) } : c))
  }

  function updateTempo(idx: number, tempo: string) {
    setCyclists(prev => prev.map((c, i) => i === idx ? { ...c, tempo } : c))
  }

  function aplicar() {
    onAplicar({
      posicoes: cyclists.slice(0, numPosicoes).map(c => c.nome),
      todosOsCiclistas: cyclists.map(c => ({ posicao: c.posicao, nome: c.nome, tempo: c.tempo })),
    })
  }

  const numInvalidosTop = cyclists.slice(0, numPosicoes).filter(c => c.nome && !nomesValidos.has(c.nome)).length
  const totalMatched = cyclists.filter(c => c.matched).length

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
        <div>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text)', margin: 0 }}>📄 Importar resultados por CSV</h3>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-dim)', margin: '0.25rem 0 0' }}>
            Formato esperado: <code style={{ background: 'var(--surface-2)', padding: '1px 5px', borderRadius: 4, fontSize: '0.75rem' }}>posicao,nome,tempo</code>
          </p>
        </div>
        <button onClick={onCancelar} style={{ fontSize: '0.8rem', color: 'var(--text-dim)', background: 'none', border: 'none', cursor: 'pointer' }}>
          ← Voltar ao formulário
        </button>
      </div>

      {/* Dropzone */}
      {cyclists.length === 0 && (
        <div
          onClick={() => inputRef.current?.click()}
          style={{
            border: `2px dashed ${fileName ? 'rgba(200,244,0,0.4)' : 'var(--border-hi)'}`,
            borderRadius: '1rem', cursor: 'pointer', padding: '2.5rem 1.5rem',
            textAlign: 'center', background: 'var(--surface-2)',
          }}
        >
          <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>📄</div>
          <p style={{ color: 'var(--text)', fontWeight: 600, margin: 0 }}>
            {fileName ? fileName : 'Clica para seleccionar o ficheiro CSV'}
          </p>
          <p style={{ color: 'var(--text-dim)', fontSize: '0.8rem', margin: '0.25rem 0 0' }}>
            Ficheiro .csv com colunas: posicao, nome, tempo
          </p>
          <input ref={inputRef} type="file" accept=".csv,text/csv,text/plain" onChange={onFileChange} style={{ display: 'none' }} />
        </div>
      )}

      {erro && (
        <div style={{ background: 'rgba(255,68,68,0.08)', border: '1px solid rgba(255,68,68,0.3)', borderRadius: '0.75rem', padding: '0.875rem 1rem', fontSize: '0.85rem', color: '#ff6b6b' }}>
          ⚠️ {erro}
        </div>
      )}

      {/* Resultados */}
      {cyclists.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Stats */}
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <div style={{ padding: '0.5rem 1rem', borderRadius: '0.625rem', background: 'rgba(68,204,136,0.1)', border: '1px solid rgba(68,204,136,0.25)', fontSize: '0.8rem', color: '#44cc88' }}>
              ✓ {totalMatched} de {cyclists.length} reconhecidos
            </div>
            {numInvalidosTop > 0 && (
              <div style={{ padding: '0.5rem 1rem', borderRadius: '0.625rem', background: 'rgba(255,200,0,0.1)', border: '1px solid rgba(255,200,0,0.25)', fontSize: '0.8rem', color: '#ffcc00' }}>
                ⚠️ {numInvalidosTop} no Top-{numPosicoes} precisam correcção
              </div>
            )}
            <div style={{ padding: '0.5rem 1rem', borderRadius: '0.625rem', background: 'var(--surface-2)', border: '1px solid var(--border-hi)', fontSize: '0.8rem', color: 'var(--text-dim)' }}>
              {cyclists.length} ciclistas importados
            </div>
            <button
              onClick={() => { setCyclists([]); setFileName(null); setErro(null) }}
              style={{ padding: '0.5rem 1rem', borderRadius: '0.625rem', background: 'var(--surface-2)', border: '1px solid var(--border-hi)', fontSize: '0.8rem', color: 'var(--text-dim)', cursor: 'pointer' }}
            >
              🔄 Novo ficheiro
            </button>
          </div>

          {/* Tabela editável */}
          <div style={{ background: 'var(--surface-1)', border: '1px solid var(--border)', borderRadius: '1rem', overflow: 'hidden' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '2rem 1fr 5rem', gap: '0.5rem', padding: '0.625rem 1rem', background: 'var(--surface-2)', borderBottom: '1px solid var(--border)', fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              <span>Pos</span><span>Ciclista</span><span>Tempo</span>
            </div>
            <div style={{ maxHeight: '480px', overflowY: 'auto' }}>
              {cyclists.map((c, idx) => {
                const isTop = c.posicao <= numPosicoes
                const isValid = !c.nome || nomesValidos.has(c.nome)
                return (
                  <div key={idx} style={{ display: 'grid', gridTemplateColumns: '2rem 1fr 5rem', gap: '0.5rem', alignItems: 'center', padding: '0.4rem 1rem', borderBottom: '1px solid var(--border)', background: !isValid && isTop ? 'rgba(255,200,0,0.04)' : isTop ? 'transparent' : 'rgba(255,255,255,0.01)' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 800, textAlign: 'center', color: isTop ? 'rgba(200,244,0,0.85)' : 'var(--text-sub)' }}>
                      {c.posicao}
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <input
                        type="text" value={c.nome}
                        onChange={e => updateNome(idx, e.target.value)}
                        list="startlist-datalist-csv"
                        style={{ flex: 1, background: isValid ? 'var(--surface-2)' : 'rgba(255,200,0,0.08)', border: `1px solid ${isValid ? 'var(--border-hi)' : 'rgba(255,200,0,0.4)'}`, borderRadius: '0.4rem', padding: '0.3rem 0.5rem', fontSize: '0.8rem', color: 'var(--text)', outline: 'none' }}
                      />
                      <span style={{ fontSize: '0.8rem' }}>{!isValid ? '⚠️' : c.nome ? '✅' : ''}</span>
                    </div>
                    <input
                      type="text" value={c.tempo}
                      onChange={e => updateTempo(idx, e.target.value)}
                      placeholder="0:00"
                      style={{ background: 'var(--surface-2)', border: '1px solid var(--border-hi)', borderRadius: '0.4rem', padding: '0.3rem 0.5rem', fontSize: '0.8rem', color: 'var(--text-dim)', outline: 'none', textAlign: 'center' }}
                    />
                  </div>
                )
              })}
            </div>
          </div>

          <datalist id="startlist-datalist-csv">
            {ciclistas.map(c => <option key={c.id} value={c.nome} />)}
          </datalist>

          {/* Botão aplicar */}
          <button
            onClick={aplicar}
            style={{ padding: '0.875rem', borderRadius: '0.875rem', background: numInvalidosTop > 0 ? 'rgba(200,244,0,0.25)' : 'rgba(200,244,0,0.9)', color: numInvalidosTop > 0 ? 'rgba(200,244,0,0.6)' : '#0a0a0a', fontWeight: 700, fontSize: '0.95rem', border: 'none', cursor: 'pointer' }}
          >
            {numInvalidosTop > 0 ? `⚠️ Corrige ${numInvalidosTop} nome(s) antes de aplicar` : `✅ Aplicar (${cyclists.length} ciclistas)`}
          </button>
        </div>
      )}
    </div>
  )
}
