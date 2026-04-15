'use client'

import { useState, useRef, useEffect } from 'react'
import type { Ciclista } from '@/types'

interface Props {
  ciclistas: Ciclista[]
  value: string
  onChange: (value: string) => void
  placeholder?: string
  usados?: string[]       // nomes já escolhidos noutras posições (para desabilitar)
  className?: string
}

export default function CyclistAutocomplete({
  ciclistas,
  value,
  onChange,
  placeholder,
  usados = [],
  className = '',
}: Props) {
  const [query, setQuery] = useState(value)
  const [open, setOpen] = useState(false)
  const [highlight, setHighlight] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Sincroniza o estado local quando o value externo muda
  useEffect(() => {
    setQuery(value)
  }, [value])

  // Fecha ao clicar fora
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const q = query.trim().toLowerCase()
  const sugestoes = q.length === 0
    ? []
    : ciclistas
        .filter((c) => c.nome.toLowerCase().includes(q) || c.equipa.toLowerCase().includes(q))
        .slice(0, 8)

  const valido = ciclistas.some((c) => c.nome === value)
  const duplicado = value && usados.includes(value)

  function escolher(nome: string) {
    onChange(nome)
    setQuery(nome)
    setOpen(false)
    setHighlight(0)
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open || sugestoes.length === 0) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlight((h) => Math.min(h + 1, sugestoes.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlight((h) => Math.max(h - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      escolher(sugestoes[highlight].nome)
    } else if (e.key === 'Escape') {
      setOpen(false)
    }
  }

  const border = duplicado
    ? 'border-red-500'
    : value && !valido
    ? 'border-amber-500'
    : 'border-zinc-700'

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <input
        ref={inputRef}
        type="text"
        className={`input-field ${border}`}
        placeholder={placeholder}
        value={query}
        onChange={(e) => {
          setQuery(e.target.value)
          setOpen(true)
          setHighlight(0)
          // propaga o valor cru para fora — validação feita no submit
          onChange(e.target.value)
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={handleKeyDown}
        autoComplete="off"
      />

      {duplicado && (
        <p className="mt-1 text-xs text-red-400">Já apostaste neste ciclista noutra posição.</p>
      )}
      {value && !valido && !duplicado && (
        <p className="mt-1 text-xs text-amber-400">Ciclista não está na startlist.</p>
      )}

      {open && sugestoes.length > 0 && (
        <ul className="absolute z-10 mt-1 max-h-64 w-full overflow-y-auto rounded-md border border-zinc-700 bg-zinc-900 shadow-lg">
          {sugestoes.map((c, i) => {
            const jaUsado = usados.includes(c.nome) && c.nome !== value
            return (
              <li
                key={c.id}
                onMouseDown={(e) => {
                  e.preventDefault()
                  if (!jaUsado) escolher(c.nome)
                }}
                onMouseEnter={() => setHighlight(i)}
                className={`
                  cursor-pointer px-3 py-2 text-sm
                  ${i === highlight ? 'bg-amber-500/20' : ''}
                  ${jaUsado ? 'cursor-not-allowed opacity-40' : 'hover:bg-zinc-800'}
                `}
              >
                <div className="font-medium">{c.nome}</div>
                <div className="text-xs text-zinc-400">
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
