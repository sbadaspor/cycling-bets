'use client'

import { useState, useRef } from 'react'
import type { Ciclista } from '@/types'

interface ParsedCyclist {
  posicao: number
  nome: string
  tempo: string
  matched: boolean
}

interface ParseResult {
  cyclists: ParsedCyclist[]
  top: ParsedCyclist[]
  camisola_sprint: string | null
  camisola_montanha: string | null
  camisola_juventude: string | null
  total_matched: number
  total: number
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
    todosOsCiclistas: Array<{ posicao: number; nome: string; tempo: string }>
  }) => void
  onCancelar: () => void
}

export default function ImageResultsParser({ provaId, ciclistas, temCamisolas, numPosicoes, onAplicar, onCancelar }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [resultado, setResultado] = useState<ParseResult | null>(null)
  const [mostrarTodos, setMostrarTodos] = useState(false)
  const [editableCyclists, setEditableCyclists] = useState<ParsedCyclist[]>([])
  const [editableSprint, setEditableSprint] = useState('')
  const [editableMontanha, setEditableMontanha] = useState('')
  const [editableJuventude, setEditableJuventude] = useState('')

  const nomesValidos = new Set(ciclistas.map(c => c.nome))

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) { setErro('Por favor seleciona uma imagem (JPG, PNG, WebP).'); return }
    setImageFile(file); setErro(null); setResultado(null); setMostrarTodos(false)
    setImagePreview(URL.createObjectURL(file))
  }

  async function processarImagem() {
    if (!imageFile) return
    setLoading(true); setErro(null); setResultado(null)
    try {
      const fd = new FormData()
      fd.append('image', imageFile); fd.append('prova_id', provaId)
      fd.append('tem_camisolas', String(temCamisolas)); fd.append('num_posicoes', String(numPosicoes))
      const res = await fetch('/api/admin/parse-image', { method: 'POST', body: fd })
      const data = await res.json()
      if (!res.ok) { setErro(data.error ?? 'Erro ao processar a imagem.'); return }
      setResultado(data); setEditableCyclists(data.cyclists)
      setEditableSprint(data.camisola_sprint ?? ''); setEditableMontanha(data.camisola_montanha ?? ''); setEditableJuventude(data.camisola_juventude ?? '')
    } catch { setErro('Erro de rede. Tenta novamente.') }
    finally { setLoading(false) }
  }

  function updateNome(idx: number, nome: string) {
    setEditableCyclists(prev => prev.map((c, i) => i === idx ? { ...c, nome, matched: nomesValidos.has(nome) } : c))
  }
  function updateTempo(idx: number, tempo: string) {
    setEditableCyclists(prev => prev.map((c, i) => i === idx ? { ...c, tempo } : c))
  }

  function aplicar() {
    onAplicar({
      posicoes: editableCyclists.slice(0, numPosicoes).map(c => c.nome),
      camisola_sprint: editableSprint, camisola_montanha: editableMontanha, camisola_juventude: editableJuventude,
      todosOsCiclistas: editableCyclists.map(c => ({ posicao: c.posicao, nome: c.nome, tempo: c.tempo })),
    })
  }

  const numInvalidosTop = editableCyclists.slice(0, numPosicoes).filter(c => c.nome && !nomesValidos.has(c.nome)).length
  const ciclistasVisiveis = mostrarTodos ? editableCyclists : editableCyclists.slice(0, numPosicoes + 5)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
        <div>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text)', margin: 0 }}>📸 Importar resultados por foto</h3>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-dim)', margin: '0.25rem 0 0' }}>A IA extrai todos os ciclistas e tempos automaticamente.</p>
        </div>
        <button onClick={onCancelar} style={{ fontSize: '0.8rem', color: 'var(--text-dim)', background: 'none', border: 'none', cursor: 'pointer' }}>← Voltar ao formulário manual</button>
      </div>

      <div onClick={() => inputRef.current?.click()} style={{ border: `2px dashed ${imagePreview ? 'rgba(200,244,0,0.4)' : 'var(--border-hi)'}`, borderRadius: '1rem', cursor: 'pointer', padding: imagePreview ? '0' : '2.5rem 1.5rem', textAlign: 'center', background: imagePreview ? 'transparent' : 'var(--surface-2)', overflow: 'hidden', position: 'relative' }}>
        {imagePreview ? (
          <div style={{ position: 'relative' }}>
            <img src={imagePreview} alt="Preview" style={{ width: '100%', maxHeight: '360px', objectFit: 'contain', display: 'block', borderRadius: '0.875rem' }} />
            <div style={{ position: 'absolute', bottom: '0.75rem', right: '0.75rem', background: 'rgba(0,0,0,0.65)', borderRadius: '0.5rem', padding: '0.3rem 0.7rem', fontSize: '0.75rem', color: 'var(--text-dim)' }}>Clica para trocar</div>
          </div>
        ) : (
          <>
            <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>🖼️</div>
            <p style={{ color: 'var(--text)', fontWeight: 600, margin: 0 }}>Clica para selecionar a imagem</p>
            <p style={{ color: 'var(--text-dim)', fontSize: '0.8rem', margin: '0.25rem 0 0' }}>Screenshot do PCS, ProCyclingStats, FirstCycling, etc.</p>
          </>
        )}
        <input ref={inputRef} type="file" accept="image/*" onChange={onFileChange} style={{ display: 'none' }} />
      </div>

      {erro && <div style={{ background: 'rgba(255,68,68,0.08)', border: '1px solid rgba(255,68,68,0.3)', borderRadius: '0.75rem', padding: '0.875rem 1rem', fontSize: '0.85rem', color: '#ff6b6b' }}>⚠️ {erro}</div>}

      {imageFile && !resultado && (
        <button onClick={processarImagem} disabled={loading} style={{ padding: '0.875rem', borderRadius: '0.875rem', background: loading ? 'rgba(200,244,0,0.15)' : 'rgba(200,244,0,0.9)', color: loading ? 'rgba(200,244,0,0.6)' : '#0a0a0a', fontWeight: 700, fontSize: '0.95rem', border: 'none', cursor: loading ? 'not-allowed' : 'pointer' }}>
          {loading ? '🔍 A analisar a imagem com IA...' : '🤖 Extrair resultados com IA'}
        </button>
      )}

      {resultado && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <div style={{ padding: '0.5rem 1rem', borderRadius: '0.625rem', background: 'rgba(68,204,136,0.1)', border: '1px solid rgba(68,204,136,0.25)', fontSize: '0.8rem', color: '#44cc88' }}>✓ {resultado.total_matched} de {resultado.total} reconhecidos</div>
            {numInvalidosTop > 0 && <div style={{ padding: '0.5rem 1rem', borderRadius: '0.625rem', background: 'rgba(255,200,0,0.1)', border: '1px solid rgba(255,200,0,0.25)', fontSize: '0.8rem', color: '#ffcc00' }}>⚠️ {numInvalidosTop} no Top-{numPosicoes} precisam correção</div>}
            <div style={{ padding: '0.5rem 1rem', borderRadius: '0.625rem', background: 'var(--surface-2)', border: '1px solid var(--border-hi)', fontSize: '0.8rem', color: 'var(--text-dim)' }}>{resultado.total} ciclistas extraídos</div>
          </div>

          <div style={{ background: 'var(--surface-1)', border: '1px solid var(--border)', borderRadius: '1rem', overflow: 'hidden' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '2rem 1fr 5rem', gap: '0.5rem', padding: '0.625rem 1rem', background: 'var(--surface-2)', borderBottom: '1px solid var(--border)', fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              <span>Pos</span><span>Ciclista</span><span>Tempo</span>
            </div>
            <div style={{ maxHeight: '480px', overflowY: 'auto' }}>
              {ciclistasVisiveis.map((c, idx) => {
                const isTop = c.posicao <= numPosicoes
                const isValid = !c.nome || nomesValidos.has(c.nome)
                return (
                  <div key={idx} style={{ display: 'grid', gridTemplateColumns: '2rem 1fr 5rem', gap: '0.5rem', alignItems: 'center', padding: '0.4rem 1rem', borderBottom: '1px solid var(--border)', background: !isValid && isTop ? 'rgba(255,200,0,0.04)' : isTop ? 'transparent' : 'rgba(255,255,255,0.01)' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 800, textAlign: 'center', color: isTop ? 'rgba(200,244,0,0.85)' : 'var(--text-sub)' }}>{c.posicao}</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <input type="text" value={c.nome} onChange={e => updateNome(idx, e.target.value)} list="startlist-datalist" style={{ flex: 1, background: isValid ? 'var(--surface-2)' : 'rgba(255,200,0,0.08)', border: `1px solid ${isValid ? 'var(--border-hi)' : 'rgba(255,200,0,0.4)'}`, borderRadius: '0.4rem', padding: '0.3rem 0.5rem', fontSize: '0.8rem', color: 'var(--text)', outline: 'none' }} />
                      <span style={{ fontSize: '0.8rem' }}>{!isValid ? '⚠️' : c.nome ? '✅' : ''}</span>
                    </div>
                    <input type="text" value={c.tempo} onChange={e => updateTempo(idx, e.target.value)} placeholder="0:00" style={{ background: 'var(--surface-2)', border: '1px solid var(--border-hi)', borderRadius: '0.4rem', padding: '0.3rem 0.5rem', fontSize: '0.8rem', color: 'var(--text-dim)', outline: 'none', textAlign: 'center' }} />
                  </div>
                )
              })}
            </div>
            {!mostrarTodos && editableCyclists.length > numPosicoes + 5 && (
              <button onClick={() => setMostrarTodos(true)} style={{ width: '100%', padding: '0.75rem', background: 'var(--surface-2)', border: 'none', borderTop: '1px solid var(--border)', color: 'var(--text-dim)', fontSize: '0.8rem', cursor: 'pointer', fontWeight: 600 }}>
                Ver todos os {editableCyclists.length} ciclistas ↓
              </button>
            )}
          </div>

          <datalist id="startlist-datalist">{ciclistas.map(c => <option key={c.id} value={c.nome} />)}</datalist>

          {temCamisolas && (
            <div style={{ background: 'var(--surface-1)', border: '1px solid var(--border)', borderRadius: '1rem', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>🎽 Camisolas detectadas</div>
              {[{ label: '🟢 Sprint', value: editableSprint, setter: setEditableSprint }, { label: '🔴 Montanha', value: editableMontanha, setter: setEditableMontanha }, { label: '⚪ Juventude', value: editableJuventude, setter: setEditableJuventude }].map(({ label, value, setter }) => (
                <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-dim)', width: '7rem', flexShrink: 0 }}>{label}</span>
                  <input type="text" value={value} onChange={e => setter(e.target.value)} list="startlist-datalist" placeholder="(não detectado)" style={{ flex: 1, background: 'var(--surface-2)', border: '1px solid var(--border-hi)', borderRadius: '0.5rem', padding: '0.375rem 0.625rem', fontSize: '0.875rem', color: 'var(--text)', outline: 'none' }} />
                </div>
              ))}
            </div>
          )}

          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button onClick={aplicar} style={{ flex: 1, padding: '0.875rem', borderRadius: '0.875rem', background: numInvalidosTop > 0 ? 'rgba(200,244,0,0.25)' : 'rgba(200,244,0,0.9)', color: numInvalidosTop > 0 ? 'rgba(200,244,0,0.6)' : '#0a0a0a', fontWeight: 700, fontSize: '0.95rem', border: 'none', cursor: 'pointer' }}>
              {numInvalidosTop > 0 ? `⚠️ Corrige ${numInvalidosTop} nome(s) antes de aplicar` : `✅ Aplicar (${editableCyclists.length} ciclistas com tempos)`}
            </button>
            <button onClick={() => { setResultado(null); setImageFile(null); setImagePreview(null) }} style={{ padding: '0.875rem 1.25rem', borderRadius: '0.875rem', background: 'var(--surface-2)', color: 'var(--text-dim)', fontWeight: 600, fontSize: '0.875rem', border: '1px solid var(--border-hi)', cursor: 'pointer' }}>🔄 Nova foto</button>
          </div>
        </div>
      )}
    </div>
  )
}
