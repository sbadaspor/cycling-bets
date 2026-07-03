'use client'

import { useState, useRef, useEffect } from 'react'
import type { Ciclista } from '@/types'

interface Props {
  ciclistas: Ciclista[]
  value: string
  onChange: (value: string) => void
  placeholder?: string
  usados?: string[]
}

export default function CyclistAutocomplete({ ciclistas, value, onChange, placeholder, usados = [] }: Props) {
  const [query, setQuery] = useState(value)
  const [open, setOpen] = useState(false)
  const [highlight, setHighlight] = useState(0)
  const [focused, setFocused] = useState(false)
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
  ).slice(0, 7)

  const valido = ciclistas.some(c => c.nome === value)
  const duplicado = !!(value && usados.includes(value))

  function escolher(nome: string) {
    onChange(nome); setQuery(nome); setOpen(false); setHighlight(0)
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open || sugestoes.length === 0) return
    if (e.key === 'ArrowDown') { e.preventDefault(); setHighlight(h => Math.min(h + 1, sugestoes.length - 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setHighlight(h => Math.max(h - 1, 0)) }
    else if (e.key === 'Enter') { e.preventDefault(); if (sugestoes[highlight]) escolher(sugestoes[highlight].nome) }
    else if (e.key === 'Escape') setOpen(false)
  }

  const borderColor = focused
    ? duplicado ? 'rgba(224,69,31,0.6)' : '#E0451F'
    : duplicado ? 'rgba(224,69,31,0.4)' : value && !valido ? '#EAB308' : '#E3DDD0'

  return (
    <div ref={containerRef} style={{ position: 'relative' }}>
      <input
        type="text"
        placeholder={placeholder}
        value={query}
        autoComplete="off"
        onChange={e => { setQuery(e.target.value); setOpen(true); setHighlight(0); onChange(e.target.value) }}
        onFocus={() => { setFocused(true); setOpen(true) }}
        onBlur={() => setFocused(false)}
        onKeyDown={handleKeyDown}
        style={{
          width: '100%', padding: '9px 13px', borderRadius: 9,
          border: `1px solid ${borderColor}`,
          background: '#FCFBF7',
          font: "600 14px 'Archivo', sans-serif", color: '#16140F',
          outline: 'none', transition: 'border-color 0.15s',
          boxSizing: 'border-box',
        }}
      />

      {duplicado && (
        <p style={{ margin: '3px 0 0', font: "400 11px 'Archivo', sans-serif", color: '#E0451F' }}>Já apostaste neste ciclista.</p>
      )}
      {value && !valido && !duplicado && (
        <p style={{ margin: '3px 0 0', font: "400 11px 'Archivo', sans-serif", color: '#EAB308' }}>Não está na startlist.</p>
      )}

      {open && sugestoes.length > 0 && (
        <ul style={{
          position: 'absolute', zIndex: 20, top: 'calc(100% + 4px)', left: 0, right: 0,
          maxHeight: 240, overflowY: 'auto', borderRadius: 10, margin: 0, padding: 0, listStyle: 'none',
          border: '1px solid #E3DDD0', background: '#fff',
          boxShadow: '0 8px 22px rgba(20,15,5,0.10)',
          overflow: 'hidden',
        }}>
          {sugestoes.map((c, i) => {
            const jaUsado = usados.includes(c.nome) && c.nome !== value
            return (
              <li
                key={c.id}
                onMouseDown={e => { e.preventDefault(); if (!jaUsado) escolher(c.nome) }}
                onMouseEnter={() => setHighlight(i)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 9,
                  padding: '9px 13px',
                  cursor: jaUsado ? 'not-allowed' : 'pointer',
                  background: i === highlight && !jaUsado ? '#F8F5EE' : 'transparent',
                  opacity: jaUsado ? 0.4 : 1,
                  borderBottom: i < sugestoes.length - 1 ? '1px solid #F1EDE3' : 'none',
                  transition: 'background 0.1s',
                }}
              >
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#E0451F', flexShrink: 0 }} />
                <span style={{ font: "600 13px 'Archivo', sans-serif", color: '#16140F', flex: 1 }}>{c.nome}</span>
                <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: '#A79F8E' }}>
                  {c.dorsal ? `#${c.dorsal} · ` : ''}{c.equipa}
                  {jaUsado ? ' · já apostado' : ''}
                </span>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
