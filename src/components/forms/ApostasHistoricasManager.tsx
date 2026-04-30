'use client'

import { useState, useEffect } from 'react'
import type { Perfil, CategoriaProvaTipo } from '@/types'

interface Props {
  perfis: Perfil[]
}

const CATEGORIAS: { value: CategoriaProvaTipo; label: string }[] = [
  { value: 'grande_volta', label: '🏔️ Grande Volta' },
  { value: 'prova_semana', label: '📅 Prova da Semana' },
  { value: 'monumento',    label: '🗿 Monumento' },
  { value: 'prova_dia',    label: '⚡ Prova de um dia' },
]

const ANOS = Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - i)

// Resultado real partilhado por todos
interface ProvaInfo {
  ano: number
  nome_prova: string
  categoria: CategoriaProvaTipo
  sistema: 'antigo' | 'novo'
  resultado_real_top: string[]
  tem_camisolas: boolean
  camisola_sprint_real: string
  camisola_montanha_real: string
  camisola_juventude_real: string
}

interface JogadorData {
  user_id: string
  original_id?: string  // ID da entrada existente (para editar sem duplicar)
  apostas_top: string[]
  posicao_grupo: string
  camisola_sprint_apostada: string
  camisola_montanha_apostada: string
  camisola_juventude_apostada: string
  pontos_preview: number | null
}

function defaultJogador(userId: string): JogadorData {
  return {
    user_id: userId,
    apostas_top: Array(10).fill(''),
    posicao_grupo: '',
    camisola_sprint_apostada: '',
    camisola_montanha_apostada: '',
    camisola_juventude_apostada: '',
    pontos_preview: null,
  }
}

function calcularPontosPreview(apostas: string[], realTop: string[], camisolasA: { s: string; m: string; j: string }, camisolasR: { s: string; m: string; j: string }): number {
  const realSet = new Set(realTop.map(n => n.trim().toLowerCase()).filter(Boolean))
  let pts = apostas.filter(n => n.trim() && realSet.has(n.trim().toLowerCase())).length
  if (camisolasA.s && camisolasR.s && camisolasA.s.toLowerCase() === camisolasR.s.toLowerCase()) pts++
  if (camisolasA.m && camisolasR.m && camisolasA.m.toLowerCase() === camisolasR.m.toLowerCase()) pts++
  if (camisolasA.j && camisolasR.j && camisolasA.j.toLowerCase() === camisolasR.j.toLowerCase()) pts++
  return pts
}

export default function ApostasHistoricasManager({ perfis }: Props) {
  const [provaExpandida, setProvaExpandida] = useState<string | null>(null)
  const [modo, setModo] = useState<'lista' | 'inserir'>('lista')
  const [historico, setHistorico] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [sucesso, setSucesso] = useState<string | null>(null)
  const [erro, setErro] = useState<string | null>(null)

  const [prova, setProva] = useState<ProvaInfo>({
    ano: new Date().getFullYear() - 1,
    nome_prova: '',
    categoria: 'grande_volta',
    sistema: 'antigo',
    resultado_real_top: Array(10).fill(''),
    tem_camisolas: true,
    camisola_sprint_real: '',
    camisola_montanha_real: '',
    camisola_juventude_real: '',
  })

  const [jogadores, setJogadores] = useState<JogadorData[]>(
    perfis.slice(0, 3).map(p => defaultJogador(p.id))
  )

  useEffect(() => {
    carregarHistorico()
  }, [])

  async function carregarHistorico() {
    const res = await fetch('/api/admin/apostas-historicas')
    const data = await res.json()
    if (Array.isArray(data)) setHistorico(data)
  }

  // Preview de pontos em tempo real
  useEffect(() => {
    setJogadores(prev => prev.map(j => ({
      ...j,
      pontos_preview: prova.resultado_real_top.some(n => n.trim())
        ? calcularPontosPreview(
            j.apostas_top,
            prova.resultado_real_top,
            { s: j.camisola_sprint_apostada, m: j.camisola_montanha_apostada, j: j.camisola_juventude_apostada },
            { s: prova.camisola_sprint_real, m: prova.camisola_montanha_real, j: prova.camisola_juventude_real },
          )
        : null,
    })))
  }, [prova.resultado_real_top, prova.camisola_sprint_real, prova.camisola_montanha_real, prova.camisola_juventude_real,
      jogadores.map(j => [...j.apostas_top, j.camisola_sprint_apostada, j.camisola_montanha_apostada, j.camisola_juventude_apostada].join('|')).join('||')])

  function updateJogador(idx: number, field: keyof JogadorData, value: any) {
    setJogadores(prev => prev.map((j, i) => i === idx ? { ...j, [field]: value } : j))
  }

  function updateAposta(jIdx: number, posIdx: number, value: string) {
    setJogadores(prev => prev.map((j, i) => {
      if (i !== jIdx) return j
      const novo = [...j.apostas_top]
      novo[posIdx] = value
      return { ...j, apostas_top: novo }
    }))
  }

  function updateResultado(posIdx: number, value: string) {
    setProva(prev => {
      const novo = [...prev.resultado_real_top]
      novo[posIdx] = value
      return { ...prev, resultado_real_top: novo }
    })
  }

  async function guardar() {
    setErro(null); setSucesso(null); setLoading(true)
    try {
      let erros = 0
      for (const j of jogadores) {
        if (!j.user_id) continue
        const res = await fetch('/api/admin/apostas-historicas', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...j,
            original_id: j.original_id ?? null,
            ...prova,
            posicao_grupo: j.posicao_grupo ? parseInt(j.posicao_grupo) : null,
          }),
        })
        if (!res.ok) erros++
      }
      if (erros > 0) { setErro(`${erros} entrada(s) falharam.`); return }
      setSucesso('Guardado com sucesso! ✅')
      await carregarHistorico()
      setTimeout(() => { setModo('lista'); setSucesso(null) }, 1500)
    } catch { setErro('Erro de rede.') }
    finally { setLoading(false) }
  }

  async function apagar(id: string) {
    if (!confirm('Apagar esta entrada do jogador?')) return
    await fetch('/api/admin/apostas-historicas', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) })
    await carregarHistorico()
  }

  async function apagarProva(ano: number, nome_prova: string) {
    if (!confirm(`Apagar TODA a prova "${nome_prova} ${ano}" para todos os jogadores?\n\nEsta ação não pode ser desfeita.`)) return
    await fetch('/api/admin/apostas-historicas', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ano, nome_prova }) })
    await carregarHistorico()
  }

  function editarProva(p: any) {
    const entradas = historico.filter(h => h.ano === p.ano && h.nome_prova === p.nome_prova)
    const primeira = entradas[0]
    if (!primeira) return

    // Pre-preencher info da prova
    setProva({
      ano: primeira.ano,
      nome_prova: primeira.nome_prova,
      categoria: primeira.categoria ?? 'grande_volta',
      sistema: primeira.sistema ?? 'antigo',
      resultado_real_top: primeira.resultado_real_top ?? Array(10).fill(''),
      tem_camisolas: !!(primeira.camisola_sprint_real || primeira.camisola_montanha_real || primeira.camisola_juventude_real),
      camisola_sprint_real: primeira.camisola_sprint_real ?? '',
      camisola_montanha_real: primeira.camisola_montanha_real ?? '',
      camisola_juventude_real: primeira.camisola_juventude_real ?? '',
    })

    // Pre-preencher dados de cada jogador
    setJogadores(perfis.slice(0, 3).map(perf => {
      const entrada = entradas.find(e => e.user_id === perf.id)
      if (!entrada) return defaultJogador(perf.id)
      return {
        user_id: perf.id,
        original_id: entrada.id,  // guardar ID para apagar exactamente esta entrada
        apostas_top: entrada.apostas_top ?? Array(10).fill(''),
        posicao_grupo: entrada.posicao_grupo ? String(entrada.posicao_grupo) : '',
        camisola_sprint_apostada: entrada.camisola_sprint_apostada ?? '',
        camisola_montanha_apostada: entrada.camisola_montanha_apostada ?? '',
        camisola_juventude_apostada: entrada.camisola_juventude_apostada ?? '',
        pontos_preview: null,
      }
    }))

    setErro(null); setSucesso(null)
    setModo('inserir')
  }

  const numPosicoes = prova.categoria === 'monumento' || prova.categoria === 'prova_dia' ? 10 : 10

  // Agrupar histórico por prova
  const provasUnicas = [...new Map(historico.map(h => [`${h.ano}-${h.nome_prova}`, h])).values()]

  if (modo === 'lista') return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <p style={{ fontSize: '0.68rem', color: 'var(--lime)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}>📜 Histórico</p>
          <h3 style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '1.15rem', fontWeight: 700, textTransform: 'uppercase' }}>Apostas Históricas</h3>
        </div>
        <button onClick={() => { setModo('inserir'); setErro(null); setSucesso(null) }} style={{ padding: '0.5rem 1rem', background: 'rgba(200,244,0,0.9)', color: '#0a0a0f', fontWeight: 700, fontSize: '0.8rem', border: 'none', borderRadius: '0.625rem', cursor: 'pointer' }}>
          + Nova Prova
        </button>
      </div>

      {provasUnicas.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-dim)' }}>
          <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📭</div>
          <p>Ainda sem apostas históricas inseridas.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {provasUnicas.sort((a, b) => b.ano - a.ano || a.nome_prova.localeCompare(b.nome_prova)).map(p => {
            const entradas = historico.filter(h => h.ano === p.ano && h.nome_prova === p.nome_prova)
            return (
              <div key={`${p.ano}-${p.nome_prova}`} className="card" style={{ padding: '0' }}>
                <button
                  onClick={() => setProvaExpandida(provaExpandida === `${p.ano}-${p.nome_prova}` ? null : `${p.ano}-${p.nome_prova}`)}
                  style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.875rem 1rem', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}
                >
                  <div>
                    <p style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text)' }}>{p.nome_prova} <span style={{ color: 'var(--text-dim)', fontWeight: 400 }}>{p.ano}</span></p>
                    <p style={{ fontSize: '0.72rem', color: 'var(--text-sub)' }}>{p.sistema === 'antigo' ? '1pt/acerto' : 'Sistema atual'} · {entradas.length} jogadores</p>
                  </div>
                  <span style={{ color: 'var(--text-dim)', transition: 'transform 0.2s', transform: provaExpandida === `${p.ano}-${p.nome_prova}` ? 'rotate(180deg)' : 'none' }}>▼</span>
                </button>

                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', padding: '0 1rem 0.75rem', alignItems: 'center' }}>
                  {entradas.map(e => (
                    <div key={e.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--surface-2)', borderRadius: '0.5rem', padding: '0.3rem 0.625rem' }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: 600, color: e.posicao_grupo === 1 ? 'var(--lime)' : 'var(--text-dim)' }}>
                        {e.posicao_grupo === 1 ? '🥇' : e.posicao_grupo === 2 ? '🥈' : e.posicao_grupo === 3 ? '🥉' : '?'} {e.perfil?.username}
                      </span>
                      <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '0.875rem', fontWeight: 800, color: 'var(--lime)' }}>{e.pontos_total}pts</span>
                      <button onClick={() => apagar(e.id)} style={{ fontSize: '0.7rem', color: '#ff6b6b', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>✕</button>
                    </div>
                  ))}
                  <button
                    onClick={() => editarProva(p)}
                    style={{ padding: '0.3rem 0.75rem', background: 'rgba(200,244,0,0.1)', border: '1px solid rgba(200,244,0,0.25)', borderRadius: '0.5rem', color: 'var(--lime)', fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer' }}
                  >
                    ✏️ Editar
                  </button>
                  <button
                    onClick={() => apagarProva(p.ano, p.nome_prova)}
                    style={{ padding: '0.3rem 0.75rem', background: 'rgba(255,68,68,0.08)', border: '1px solid rgba(255,68,68,0.25)', borderRadius: '0.5rem', color: '#ff6b6b', fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer' }}
                  >
                    🗑️ Eliminar prova
                  </button>
                </div>

                {/* Detalhe expandido */}
                {provaExpandida === `${p.ano}-${p.nome_prova}` && (
                  <div style={{ borderTop: '1px solid var(--border)' }}>
                    <div style={{ overflowX: 'auto', padding: '0.75rem 1rem' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(entradas.length + 1, 4)}, minmax(140px, 1fr))`, gap: '0.5rem', minWidth: 0 }}>
                        {/* Resultado real */}
                        <div style={{ background: 'var(--surface-2)', borderRadius: '0.625rem', padding: '0.625rem' }}>
                          <p style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--lime)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>🏆 Real</p>
                          {(entradas[0]?.resultado_real_top ?? []).map((nome: string, i: number) => (
                            <p key={i} style={{ fontSize: '0.72rem', color: 'var(--text-dim)', padding: '0.15rem 0', display: 'flex', gap: '0.35rem' }}>
                              <span style={{ color: 'var(--text-sub)', minWidth: 16 }}>{i + 1}</span> {nome}
                            </p>
                          ))}
                          {entradas[0]?.camisola_sprint_real && <p style={{ fontSize: '0.68rem', color: 'var(--text-sub)', marginTop: '0.35rem' }}>🟢 {entradas[0].camisola_sprint_real}</p>}
                          {entradas[0]?.camisola_montanha_real && <p style={{ fontSize: '0.68rem', color: 'var(--text-sub)' }}>🔴 {entradas[0].camisola_montanha_real}</p>}
                          {entradas[0]?.camisola_juventude_real && <p style={{ fontSize: '0.68rem', color: 'var(--text-sub)' }}>⚪ {entradas[0].camisola_juventude_real}</p>}
                        </div>
                        {/* Apostas de cada jogador */}
                        {entradas.map(e => {
                          const realSet = new Set((e.resultado_real_top ?? []).map((n: string) => n.trim().toLowerCase()))
                          return (
                            <div key={e.id} style={{ background: 'var(--surface-2)', borderRadius: '0.625rem', padding: '0.625rem' }}>
                              <p style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--lime)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>{e.perfil?.username}</p>
                              {(e.apostas_top ?? []).map((nome: string, i: number) => {
                                const acertou = nome.trim() && realSet.has(nome.trim().toLowerCase())
                                return (
                                  <p key={i} style={{ fontSize: '0.72rem', color: acertou ? '#44cc88' : 'var(--text-dim)', padding: '0.15rem 0', display: 'flex', gap: '0.35rem' }}>
                                    <span style={{ color: 'var(--text-sub)', minWidth: 16 }}>{i + 1}</span>
                                    {nome} {acertou ? '✅' : ''}
                                  </p>
                                )
                              })}
                              {e.camisola_sprint_apostada && <p style={{ fontSize: '0.68rem', color: e.camisola_sprint_apostada?.toLowerCase() === e.camisola_sprint_real?.toLowerCase() ? '#44cc88' : 'var(--text-sub)', marginTop: '0.35rem' }}>🟢 {e.camisola_sprint_apostada}</p>}
                              {e.camisola_montanha_apostada && <p style={{ fontSize: '0.68rem', color: e.camisola_montanha_apostada?.toLowerCase() === e.camisola_montanha_real?.toLowerCase() ? '#44cc88' : 'var(--text-sub)' }}>🔴 {e.camisola_montanha_apostada}</p>}
                              {e.camisola_juventude_apostada && <p style={{ fontSize: '0.68rem', color: e.camisola_juventude_apostada?.toLowerCase() === e.camisola_juventude_real?.toLowerCase() ? '#44cc88' : 'var(--text-sub)' }}>⚪ {e.camisola_juventude_apostada}</p>}
                              <p style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--lime)', marginTop: '0.35rem', fontFamily: 'Barlow Condensed, sans-serif' }}>{e.pontos_total}pts</p>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <button onClick={() => setModo('lista')} style={{ fontSize: '0.8rem', color: 'var(--text-dim)', background: 'none', border: 'none', cursor: 'pointer' }}>← Voltar</button>
        <h3 style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '1.1rem', fontWeight: 700, textTransform: 'uppercase' }}>Nova Prova Histórica</h3>
      </div>

      {erro && <div style={{ background: 'rgba(255,68,68,0.08)', border: '1px solid rgba(255,68,68,0.3)', borderRadius: '0.75rem', padding: '0.75rem 1rem', fontSize: '0.85rem', color: '#ff6b6b' }}>⚠️ {erro}</div>}
      {sucesso && <div style={{ background: 'rgba(68,204,136,0.08)', border: '1px solid rgba(68,204,136,0.3)', borderRadius: '0.75rem', padding: '0.75rem 1rem', fontSize: '0.85rem', color: 'var(--green)' }}>{sucesso}</div>}

      {/* Info da prova */}
      <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
        <p style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--lime)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>📋 Dados da Prova</p>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
          <div>
            <label style={{ fontSize: '0.75rem', color: 'var(--text-dim)', display: 'block', marginBottom: '0.35rem' }}>Ano</label>
            <select className="input-field" value={prova.ano} onChange={e => setProva(p => ({ ...p, ano: parseInt(e.target.value) }))}>
              {ANOS.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize: '0.75rem', color: 'var(--text-dim)', display: 'block', marginBottom: '0.35rem' }}>Categoria</label>
            <select className="input-field" value={prova.categoria} onChange={e => setProva(p => ({ ...p, categoria: e.target.value as CategoriaProvaTipo }))}>
              {CATEGORIAS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </div>
        </div>

        <div>
          <label style={{ fontSize: '0.75rem', color: 'var(--text-dim)', display: 'block', marginBottom: '0.35rem' }}>Nome da Prova</label>
          <input className="input-field" value={prova.nome_prova} onChange={e => setProva(p => ({ ...p, nome_prova: e.target.value }))} placeholder="Ex: Tour de France 2023" />
        </div>

        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <label style={{ fontSize: '0.8rem', color: 'var(--text-dim)', display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer' }}>
            <input type="checkbox" checked={prova.sistema === 'antigo'} onChange={e => setProva(p => ({ ...p, sistema: e.target.checked ? 'antigo' : 'novo' }))} />
            Sistema antigo (1pt por acerto)
          </label>
          <label style={{ fontSize: '0.8rem', color: 'var(--text-dim)', display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer' }}>
            <input type="checkbox" checked={prova.tem_camisolas} onChange={e => setProva(p => ({ ...p, tem_camisolas: e.target.checked }))} />
            Tem camisolas
          </label>
        </div>
      </div>

      {/* Resultado real + apostas dos jogadores — grid side by side */}
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(jogadores.length + 1, 4)}, 1fr)`, gap: '0.75rem', overflowX: 'auto' }}>

        {/* Coluna Resultado Real */}
        <div className="card" style={{ padding: '0.875rem' }}>
          <p style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--lime)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.75rem' }}>
            🏆 Resultado Real
          </p>
          {prova.resultado_real_top.map((v, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.35rem' }}>
              <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '0.72rem', fontWeight: 800, color: 'var(--text-sub)', width: 18, textAlign: 'right', flexShrink: 0 }}>{i + 1}</span>
              <input className="input-field" style={{ padding: '0.3rem 0.5rem', fontSize: '0.78rem' }} value={v} onChange={e => updateResultado(i, e.target.value)} placeholder={`${i + 1}º lugar`} />
            </div>
          ))}
          {prova.tem_camisolas && (
            <div style={{ borderTop: '1px solid var(--border)', marginTop: '0.75rem', paddingTop: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
              {[
                { label: '🟢 Sprint', field: 'camisola_sprint_real' as const },
                { label: '🔴 Montanha', field: 'camisola_montanha_real' as const },
                { label: '⚪ Juventude', field: 'camisola_juventude_real' as const },
              ].map(({ label, field }) => (
                <div key={field}>
                  <p style={{ fontSize: '0.65rem', color: 'var(--text-sub)', marginBottom: '0.15rem' }}>{label}</p>
                  <input className="input-field" style={{ padding: '0.3rem 0.5rem', fontSize: '0.78rem' }} value={prova[field]} onChange={e => setProva(p => ({ ...p, [field]: e.target.value }))} />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Colunas dos jogadores */}
        {jogadores.map((j, jIdx) => {
          const perfil = perfis.find(p => p.id === j.user_id)
          return (
            <div key={jIdx} className="card" style={{ padding: '0.875rem', border: j.pontos_preview !== null ? '1px solid rgba(200,244,0,0.2)' : undefined }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                <select style={{ background: 'transparent', border: 'none', color: 'var(--lime)', fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer', padding: 0 }} value={j.user_id} onChange={e => updateJogador(jIdx, 'user_id', e.target.value)}>
                  {perfis.map(p => <option key={p.id} value={p.id}>{p.username}</option>)}
                </select>
                {j.pontos_preview !== null && (
                  <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '1.1rem', fontWeight: 900, color: 'var(--lime)' }}>{j.pontos_preview}pts</span>
                )}
              </div>

              {/* Posição no grupo */}
              <div style={{ marginBottom: '0.6rem' }}>
                <label style={{ fontSize: '0.65rem', color: 'var(--text-sub)', display: 'block', marginBottom: '0.15rem' }}>Posição no grupo</label>
                <select className="input-field" style={{ padding: '0.3rem 0.5rem', fontSize: '0.78rem' }} value={j.posicao_grupo} onChange={e => updateJogador(jIdx, 'posicao_grupo', e.target.value)}>
                  <option value="">?</option>
                  <option value="1">🥇 1º</option>
                  <option value="2">🥈 2º</option>
                  <option value="3">🥉 3º</option>
                </select>
              </div>

              {/* Apostas */}
              {j.apostas_top.map((v, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.35rem' }}>
                  <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '0.72rem', fontWeight: 800, color: (() => {
                    const real = prova.resultado_real_top.map(n => n.trim().toLowerCase())
                    return v.trim() && real.includes(v.trim().toLowerCase()) ? '#44cc88' : v.trim() ? 'rgba(255,107,107,0.7)' : 'var(--text-sub)'
                  })(), width: 18, textAlign: 'right', flexShrink: 0 }}>{i + 1}</span>
                  <input className="input-field" style={{ padding: '0.3rem 0.5rem', fontSize: '0.78rem', background: (() => {
                    const real = prova.resultado_real_top.map(n => n.trim().toLowerCase())
                    return v.trim() && real.includes(v.trim().toLowerCase()) ? 'rgba(68,204,136,0.06)' : undefined
                  })() }} value={v} onChange={e => updateAposta(jIdx, i, e.target.value)} placeholder={`${i + 1}º`} />
                </div>
              ))}

              {/* Camisolas apostadas */}
              {prova.tem_camisolas && (
                <div style={{ borderTop: '1px solid var(--border)', marginTop: '0.75rem', paddingTop: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                  {[
                    { label: '🟢 Sprint', field: 'camisola_sprint_apostada' as const, real: prova.camisola_sprint_real },
                    { label: '🔴 Montanha', field: 'camisola_montanha_apostada' as const, real: prova.camisola_montanha_real },
                    { label: '⚪ Juventude', field: 'camisola_juventude_apostada' as const, real: prova.camisola_juventude_real },
                  ].map(({ label, field, real }) => {
                    const val = j[field]
                    const acertou = val.trim() && real.trim() && val.trim().toLowerCase() === real.trim().toLowerCase()
                    return (
                      <div key={field}>
                        <p style={{ fontSize: '0.65rem', color: acertou ? '#44cc88' : 'var(--text-sub)', marginBottom: '0.15rem' }}>{label} {acertou ? '✅' : ''}</p>
                        <input className="input-field" style={{ padding: '0.3rem 0.5rem', fontSize: '0.78rem', background: acertou ? 'rgba(68,204,136,0.06)' : undefined }} value={val} onChange={e => updateJogador(jIdx, field, e.target.value)} />
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </div>

      <button onClick={guardar} disabled={loading || !prova.nome_prova.trim()} style={{ padding: '0.875rem', background: loading ? 'rgba(200,244,0,0.15)' : 'rgba(200,244,0,0.9)', color: loading ? 'rgba(200,244,0,0.5)' : '#0a0a0f', fontWeight: 700, fontSize: '0.95rem', border: 'none', borderRadius: '0.875rem', cursor: loading ? 'not-allowed' : 'pointer' }}>
        {loading ? '⏳ A guardar...' : '💾 Guardar prova para todos os jogadores'}
      </button>
    </div>
  )
}
