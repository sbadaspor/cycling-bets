'use client'

import { useState, useRef, useEffect } from 'react'
import type { Ciclista } from '@/types'

interface Props {
  ciclistas: Ciclista[]
  value: string
  onChange: (value: string) => void
  placeholder?: string
  usados?: string[]
  className?: string
}

export default function CyclistAutocomplete({ ciclistas, value, onChange, placeholder, usados = [], className = '' }: Props) {
  const [query, setQuery] = useState(value)
  const [open, setOpen] = useState(false)
  const [highlight, setHighlight] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => { setQuery(value) }, [value])

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const q = query.trim().toLowerCase()
  const sugestoes = q.length === 0 ? [] : ciclistas.filter(c =>
    c.nome.toLowerCase().includes(q) || c.equipa.toLowerCase().includes(q)
  ).slice(0, 8)

  const valido = ciclistas.some(c => c.nome === value)
  const duplicado = value && usados.includes(value)

  function escolher(nome: string) {
    onChange(nome); setQuery(nome); setOpen(false); setHighlight(0)
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open || sugestoes.length === 0) return
    if (e.key === 'ArrowDown') { e.preventDefault(); setHighlight(h => Math.min(h + 1, sugestoes.length - 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setHighlight(h => Math.max(h - 1, 0)) }
    else if (e.key === 'Enter') { e.preventDefault(); escolher(sugestoes[highlight].nome) }
    else if (e.key === 'Escape') setOpen(false)
  }

  const borderColor = duplicado
    ? 'rgba(255,68,68,0.6)'
    : value && !valido
    ? 'rgba(255,200,0,0.5)'
    : undefined

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <input
        type="text"
        className="input-field"
        style={borderColor ? { borderColor } : undefined}
        placeholder={placeholder}
        value={query}
        onChange={e => { setQuery(e.target.value); setOpen(true); setHighlight(0); onChange(e.target.value) }}
        onFocus={() => setOpen(true)}
        onKeyDown={handleKeyDown}
        autoComplete="off"
      />

      {duplicado && (
        <p style={{ marginTop: '0.25rem', fontSize: '0.72rem', color: 'var(--red)' }}>Já apostaste neste ciclista.</p>
      )}
      {value && !valido && !duplicado && (
        <p style={{ marginTop: '0.25rem', fontSize: '0.72rem', color: '#ffc800' }}>Não está na startlist.</p>
      )}

      {open && sugestoes.length > 0 && (
        <ul style={{
          position: 'absolute', zIndex: 20, marginTop: '0.25rem', width: '100%',
          maxHeight: 240, overflowY: 'auto', borderRadius: '0.875rem',
          border: '1px solid var(--border-hi)', background: 'var(--surface-2)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
        }}>
          {sugestoes.map((c, i) => {
            const jaUsado = usados.includes(c.nome) && c.nome !== value
            return (
              <li
                key={c.id}
                onMouseDown={e => { e.preventDefault(); if (!jaUsado) escolher(c.nome) }}
                onMouseEnter={() => setHighlight(i)}
                style={{
                  cursor: jaUsado ? 'not-allowed' : 'pointer',
                  padding: '0.6rem 0.875rem',
                  background: i === highlight ? 'rgba(200,244,0,0.1)' : 'transparent',
                  opacity: jaUsado ? 0.4 : 1,
                  borderBottom: i < sugestoes.length - 1 ? '1px solid var(--border)' : 'none',
                  transition: 'background 0.1s',
                }}
              >
                <div style={{ fontSize: '0.875rem', fontWeight: 600, color: i === highlight ? 'var(--lime)' : 'var(--text)' }}>
                  {c.nome}
                </div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginTop: '0.1rem' }}>
                  {c.dorsal ? `#${c.dorsal} · ` : ''}{c.equipa}
                  {jaUsado ? ' · já apostado' : ''}
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
