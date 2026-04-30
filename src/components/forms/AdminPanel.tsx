'use client'

import { useState, useEffect } from 'react'
import type { Prova } from '@/types'
import ProvasList from './ProvasList'
import ProvaDetalhe from './ProvaDetalhe'

interface Props {
  provas: Prova[]
  perfis: Array<{ id: string; username: string; avatar_url: string | null; full_name: string | null }>
}

import ApostasHistoricasManager from './ApostasHistoricasManager'

type Tab = 'provas' | 'historico' | 'notificacoes'

export function AdminPanel({ provas, perfis }: Props) {
  const [tab, setTab] = useState<Tab>('provas')
  const [provaSelecionadaId, setProvaSelecionadaId] = useState<string | null>(null)

  // Notificações
  const [titulo, setTitulo] = useState('')
  const [mensagem, setMensagem] = useState('')
  const [url, setUrl] = useState('/')
  const [loading, setLoading] = useState(false)
  const [resultado, setResultado] = useState<{ enviadas: number; falhadas: number; total: number } | null>(null)
  const [erro, setErro] = useState<string | null>(null)

  const provaSelecionada = provaSelecionadaId
    ? provas.find(p => p.id === provaSelecionadaId) ?? null
    : null

  useEffect(() => {
    if (provaSelecionadaId && !provas.find(p => p.id === provaSelecionadaId)) {
      setProvaSelecionadaId(null)
    }
  }, [provas, provaSelecionadaId])

  async function enviarNotificacao() {
    if (!titulo.trim() || !mensagem.trim()) {
      setErro('Preenche o título e a mensagem.')
      return
    }
    setLoading(true)
    setErro(null)
    setResultado(null)
    try {
      const res = await fetch('/api/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: titulo, body: mensagem, url }),
      })
      const data = await res.json()
      if (!res.ok) {
        setErro(data.error ?? 'Erro ao enviar.')
      } else {
        setResultado(data)
        setTitulo('')
        setMensagem('')
      }
    } catch {
      setErro('Erro de rede. Tenta novamente.')
    } finally {
      setLoading(false)
    }
  }

  if (provaSelecionada) {
    return (
      <ProvaDetalhe
        prova={provaSelecionada}
        onBack={() => setProvaSelecionadaId(null)}
        onDeleted={() => setProvaSelecionadaId(null)}
      />
    )
  }

  return (
    <div>
      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
        {([
          { key: 'provas', label: '🏆 Provas' },
          { key: 'historico', label: '📜 Histórico' },
          { key: 'notificacoes', label: '🔔 Notificações' },
        ] as { key: Tab; label: string }[]).map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            style={{
              padding: '0.5rem 1.25rem',
              borderRadius: '0.75rem',
              border: `1px solid ${tab === t.key ? 'rgba(200,244,0,0.4)' : 'var(--border-hi)'}`,
              background: tab === t.key ? 'rgba(200,244,0,0.1)' : 'var(--surface-2)',
              color: tab === t.key ? 'var(--lime)' : 'var(--text-dim)',
              fontWeight: 600, fontSize: '0.875rem', cursor: 'pointer',
              transition: 'all 0.15s',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab: Provas */}
      {tab === 'provas' && (
        <ProvasList
          provas={provas}
          onSelecionar={(p) => setProvaSelecionadaId(p.id)}
        />
      )}

      {/* Tab: Histórico */}
      {tab === 'historico' && (
        <ApostasHistoricasManager perfis={perfis as any} />
      )}

      {/* Tab: Notificações */}
      {tab === 'notificacoes' && (
        <div style={{ maxWidth: '36rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>

          {/* Erro */}
          {erro && (
            <div style={{
              background: 'rgba(255,68,68,0.08)', border: '1px solid rgba(255,68,68,0.25)',
              borderRadius: '0.875rem', padding: '0.875rem 1rem',
              fontSize: '0.85rem', color: 'var(--red)',
            }}>
              ⚠️ {erro}
            </div>
          )}

          {/* Sucesso */}
          {resultado && (
            <div style={{
              background: 'rgba(68,204,136,0.08)', border: '1px solid rgba(68,204,136,0.25)',
              borderRadius: '0.875rem', padding: '0.875rem 1rem',
              fontSize: '0.85rem', color: 'var(--green)',
            }}>
              ✓ Enviadas: {resultado.enviadas} · Falhadas: {resultado.falhadas} · Total: {resultado.total}
            </div>
          )}

          {/* Formulário */}
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-dim)', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Título
              </label>
              <input
                type="text"
                className="input-field"
                placeholder="ex: 🏆 Novo resultado disponível!"
                value={titulo}
                onChange={e => setTitulo(e.target.value)}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-dim)', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Mensagem
              </label>
              <textarea
                className="input-field"
                style={{ resize: 'none', minHeight: '90px' }}
                placeholder="ex: Os resultados do Giro já estão disponíveis."
                value={mensagem}
                onChange={e => setMensagem(e.target.value)}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-dim)', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Página de destino
              </label>
              <select
                className="input-field"
                value={url}
                onChange={e => setUrl(e.target.value)}
              >
                <option value="/">🏠 Início</option>
                <option value="/apostas">🎯 Apostas</option>
                <option value="/admin">⚙️ Admin</option>
              </select>
            </div>

            <button
              onClick={enviarNotificacao}
              disabled={loading}
              className="btn-primary"
              style={{ width: '100%', marginTop: '0.25rem' }}
            >
              {loading ? '⏳ A enviar...' : '🔔 Enviar para todos'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
