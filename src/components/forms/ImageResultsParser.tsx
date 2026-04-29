'use client'

import { useState, useRef } from 'react'
import type { Ciclista } from '@/types'

interface ParsedRider {
  posicao: number
  nome: string
  matched: boolean
}

interface ParseResult {
  riders: ParsedRider[]
  camisola_sprint: string | null
  camisola_montanha: string | null
  camisola_juventude: string | null
  total_matched: number
  total: number
  startlist_size: number
}

interface Props {
  provaId: string
  ciclistas: Ciclista[]
  temCamisolas: boolean
  numPosicoes: number
  onAplicar: (params: {
    posicoes: string[]
    camisola_sprint: string
    camisola_montanha: string
    camisola_juventude: string
  }) => void
  onCancelar: () => void
}

export default function ImageResultsParser({
  provaId,
  ciclistas,
  temCamisolas,
  numPosicoes,
  onAplicar,
  onCancelar,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [resultado, setResultado] = useState<ParseResult | null>(null)

  // Após parse, permitir edição manual antes de aplicar
  const [editableRiders, setEditableRiders] = useState<string[]>([])
  const [editableSprint, setEditableSprint] = useState('')
  const [editableMontanha, setEditableMontanha] = useState('')
  const [editableJuventude, setEditableJuventude] = useState('')

  const nomesValidos = new Set(ciclistas.map(c => c.nome))

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setErro('Por favor seleciona uma imagem (JPG, PNG, WebP).')
      return
    }
    setImageFile(file)
    setErro(null)
    setResultado(null)
    const url = URL.createObjectURL(file)
    setImagePreview(url)
  }

  async function processarImagem() {
    if (!imageFile) return
    setLoading(true)
    setErro(null)
    setResultado(null)

    try {
      const fd = new FormData()
      fd.append('image', imageFile)
      fd.append('prova_id', provaId)
      fd.append('tem_camisolas', String(temCamisolas))
      fd.append('num_posicoes', String(numPosicoes))

      const res = await fetch('/api/admin/parse-image', {
        method: 'POST',
        body: fd,
      })
      const data = await res.json()

      if (!res.ok) {
        setErro(data.error ?? 'Erro ao processar a imagem.')
        return
      }

      setResultado(data)
      setEditableRiders(data.riders.map((r: ParsedRider) => r.nome))
      setEditableSprint(data.camisola_sprint ?? '')
      setEditableMontanha(data.camisola_montanha ?? '')
      setEditableJuventude(data.camisola_juventude ?? '')
    } catch {
      setErro('Erro de rede. Tenta novamente.')
    } finally {
      setLoading(false)
    }
  }

  function aplicar() {
    onAplicar({
      posicoes: editableRiders,
      camisola_sprint: editableSprint,
      camisola_montanha: editableMontanha,
      camisola_juventude: editableJuventude,
    })
  }

  const todosCertos = editableRiders.every(n => !n || nomesValidos.has(n))
  const numInvalidos = editableRiders.filter(n => n && !nomesValidos.has(n)).length

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
        <div>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text)', margin: 0 }}>
            📸 Importar resultados por foto
          </h3>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-dim)', margin: '0.25rem 0 0' }}>
            Faz upload de uma screenshot da classificação — a IA extrai os nomes automaticamente.
          </p>
        </div>
        <button
          onClick={onCancelar}
          style={{ fontSize: '0.8rem', color: 'var(--text-dim)', background: 'none', border: 'none', cursor: 'pointer' }}
        >
          ← Voltar ao formulário manual
        </button>
      </div>

      {/* Upload area */}
      <div
        onClick={() => inputRef.current?.click()}
        style={{
          border: `2px dashed ${imagePreview ? 'rgba(200,244,0,0.4)' : 'var(--border-hi)'}`,
          borderRadius: '1rem',
          padding: imagePreview ? '0' : '2.5rem 1.5rem',
          textAlign: 'center',
          cursor: 'pointer',
          background: imagePreview ? 'transparent' : 'var(--surface-2)',
          transition: 'border-color 0.2s',
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        {imagePreview ? (
          <div style={{ position: 'relative' }}>
            <img
              src={imagePreview}
              alt="Preview"
              style={{ width: '100%', maxHeight: '360px', objectFit: 'contain', display: 'block', borderRadius: '0.875rem' }}
            />
            <div style={{
              position: 'absolute', bottom: '0.75rem', right: '0.75rem',
              background: 'rgba(0,0,0,0.65)', borderRadius: '0.5rem',
              padding: '0.3rem 0.7rem', fontSize: '0.75rem', color: 'var(--text-dim)',
            }}>
              Clica para trocar
            </div>
          </div>
        ) : (
          <>
            <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>🖼️</div>
            <p style={{ color: 'var(--text)', fontWeight: 600, margin: 0 }}>
              Clica para selecionar a imagem
            </p>
            <p style={{ color: 'var(--text-dim)', fontSize: '0.8rem', margin: '0.25rem 0 0' }}>
              JPG, PNG ou WebP · Screenshot do PCS, ProCyclingStats, FirstCycling, etc.
            </p>
          </>
        )}
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          onChange={onFileChange}
          style={{ display: 'none' }}
        />
      </div>

      {/* Erro */}
      {erro && (
        <div style={{
          background: 'rgba(255,68,68,0.08)', border: '1px solid rgba(255,68,68,0.3)',
          borderRadius: '0.75rem', padding: '0.875rem 1rem',
          fontSize: '0.85rem', color: '#ff6b6b',
        }}>
          ⚠️ {erro}
        </div>
      )}

      {/* Botão processar */}
      {imageFile && !resultado && (
        <button
          onClick={processarImagem}
          disabled={loading}
          style={{
            padding: '0.875rem',
            borderRadius: '0.875rem',
            background: loading ? 'rgba(200,244,0,0.15)' : 'rgba(200,244,0,0.9)',
            color: loading ? 'rgba(200,244,0,0.6)' : '#0a0a0a',
            fontWeight: 700,
            fontSize: '0.95rem',
            border: 'none',
            cursor: loading ? 'not-allowed' : 'pointer',
            transition: 'all 0.15s',
          }}
        >
          {loading ? '🔍 A analisar a imagem com IA...' : '🤖 Extrair resultados com IA'}
        </button>
      )}

      {/* Resultado */}
      {resultado && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Sumário */}
          <div style={{
            display: 'flex', gap: '0.75rem', flexWrap: 'wrap',
          }}>
            <div style={{
              padding: '0.5rem 1rem', borderRadius: '0.625rem',
              background: 'rgba(68,204,136,0.1)', border: '1px solid rgba(68,204,136,0.25)',
              fontSize: '0.8rem', color: '#44cc88',
            }}>
              ✓ {resultado.total_matched} correspondências
            </div>
            {numInvalidos > 0 && (
              <div style={{
                padding: '0.5rem 1rem', borderRadius: '0.625rem',
                background: 'rgba(255,200,0,0.1)', border: '1px solid rgba(255,200,0,0.25)',
                fontSize: '0.8rem', color: '#ffcc00',
              }}>
                ⚠️ {numInvalidos} não reconhecidos — corrige antes de aplicar
              </div>
            )}
            <div style={{
              padding: '0.5rem 1rem', borderRadius: '0.625rem',
              background: 'var(--surface-2)', border: '1px solid var(--border-hi)',
              fontSize: '0.8rem', color: 'var(--text-dim)',
            }}>
              {resultado.total} de {numPosicoes} posições extraídas
            </div>
          </div>

          {/* Tabela de ciclistas editável */}
          <div style={{
            background: 'var(--surface-1)', border: '1px solid var(--border)',
            borderRadius: '1rem', overflow: 'hidden',
          }}>
            <div style={{
              padding: '0.75rem 1rem',
              background: 'var(--surface-2)',
              fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-dim)',
              textTransform: 'uppercase', letterSpacing: '0.06em',
              borderBottom: '1px solid var(--border)',
            }}>
              Classificação extraída — revê e corrige se necessário
            </div>
            <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
              {editableRiders.map((nome, idx) => {
                const isValid = !nome || nomesValidos.has(nome)
                return (
                  <div
                    key={idx}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '0.75rem',
                      padding: '0.5rem 1rem',
                      borderBottom: idx < editableRiders.length - 1 ? '1px solid var(--border)' : 'none',
                      background: !isValid ? 'rgba(255,200,0,0.04)' : 'transparent',
                    }}
                  >
                    <span style={{
                      width: '2rem', textAlign: 'center',
                      fontSize: '0.8rem', fontWeight: 700,
                      color: idx < (numPosicoes <= 10 ? 5 : 10) ? 'rgba(200,244,0,0.8)' : 'var(--text-dim)',
                      flexShrink: 0,
                    }}>
                      {idx + 1}
                    </span>
                    <input
                      type="text"
                      value={nome}
                      onChange={e => {
                        const novo = [...editableRiders]
                        novo[idx] = e.target.value
                        setEditableRiders(novo)
                      }}
                      list={`startlist-datalist`}
                      style={{
                        flex: 1,
                        background: isValid ? 'var(--surface-2)' : 'rgba(255,200,0,0.08)',
                        border: `1px solid ${isValid ? 'var(--border-hi)' : 'rgba(255,200,0,0.4)'}`,
                        borderRadius: '0.5rem',
                        padding: '0.375rem 0.625rem',
                        fontSize: '0.875rem',
                        color: 'var(--text)',
                        outline: 'none',
                      }}
                    />
                    <span style={{ fontSize: '1rem', flexShrink: 0 }}>
                      {isValid && nome ? '✅' : nome ? '⚠️' : '—'}
                    </span>
                  </div>
                )
              })}
            </div>

            {/* Datalist para autocomplete */}
            <datalist id="startlist-datalist">
              {ciclistas.map(c => (
                <option key={c.id} value={c.nome} />
              ))}
            </datalist>
          </div>

          {/* Camisolas (se aplicável) */}
          {temCamisolas && (
            <div style={{
              background: 'var(--surface-1)', border: '1px solid var(--border)',
              borderRadius: '1rem', padding: '1rem',
              display: 'flex', flexDirection: 'column', gap: '0.75rem',
            }}>
              <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                🎽 Camisolas detectadas — confirma ou corrige
              </div>
              {[
                { label: '🟢 Sprint', value: editableSprint, setter: setEditableSprint },
                { label: '🔴 Montanha', value: editableMontanha, setter: setEditableMontanha },
                { label: '⚪ Juventude', value: editableJuventude, setter: setEditableJuventude },
              ].map(({ label, value, setter }) => (
                <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-dim)', width: '7rem', flexShrink: 0 }}>{label}</span>
                  <input
                    type="text"
                    value={value}
                    onChange={e => setter(e.target.value)}
                    list="startlist-datalist"
                    placeholder="(não detectado)"
                    style={{
                      flex: 1,
                      background: 'var(--surface-2)',
                      border: '1px solid var(--border-hi)',
                      borderRadius: '0.5rem',
                      padding: '0.375rem 0.625rem',
                      fontSize: '0.875rem',
                      color: 'var(--text)',
                      outline: 'none',
                    }}
                  />
                </div>
              ))}
            </div>
          )}

          {/* Ações */}
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button
              onClick={aplicar}
              disabled={!todosCertos && numInvalidos > 0}
              style={{
                flex: 1,
                padding: '0.875rem',
                borderRadius: '0.875rem',
                background: numInvalidos > 0 ? 'rgba(200,244,0,0.2)' : 'rgba(200,244,0,0.9)',
                color: numInvalidos > 0 ? 'rgba(200,244,0,0.5)' : '#0a0a0a',
                fontWeight: 700,
                fontSize: '0.95rem',
                border: 'none',
                cursor: numInvalidos > 0 ? 'not-allowed' : 'pointer',
              }}
            >
              {numInvalidos > 0
                ? `⚠️ Corrige ${numInvalidos} nome(s) antes de aplicar`
                : '✅ Aplicar ao formulário'}
            </button>
            <button
              onClick={() => {
                setResultado(null)
                setEditableRiders([])
                setImageFile(null)
                setImagePreview(null)
              }}
              style={{
                padding: '0.875rem 1.25rem',
                borderRadius: '0.875rem',
                background: 'var(--surface-2)',
                color: 'var(--text-dim)',
                fontWeight: 600,
                fontSize: '0.875rem',
                border: '1px solid var(--border-hi)',
                cursor: 'pointer',
              }}
            >
              🔄 Nova foto
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
