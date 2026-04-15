'use client'

import { useState, useEffect } from 'react'
import { parseStartlist, ParseResult } from '@/lib/parseStartlist'
import type { Prova } from '@/types'

interface Props {
  prova: Prova
}

export default function StartlistManager({ prova }: Props) {
  const provaId = prova.id
  const [texto, setTexto] = useState<string>('')
  const [preview, setPreview] = useState<ParseResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [mensagem, setMensagem] = useState<string | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [existentes, setExistentes] = useState<number>(0)

  // Carregar contagem de ciclistas já existentes para a prova
  useEffect(() => {
    fetch(`/api/ciclistas?prova_id=${provaId}`)
      .then((r) => r.json())
      .then((d) => setExistentes(d.ciclistas?.length ?? 0))
      .catch(() => setExistentes(0))
  }, [provaId])

  function handlePreview() {
    setErro(null)
    setMensagem(null)
    if (!texto.trim()) {
      setErro('Cola o texto da startlist primeiro.')
      return
    }
    const res = parseStartlist(texto)
    if (res.ciclistas.length === 0) {
      setErro('Não consegui extrair nenhum ciclista. Verifica o formato do texto.')
      setPreview(null)
      return
    }
    setPreview(res)
  }

  async function handleGuardar() {
    if (!preview) return
    setLoading(true)
    setErro(null)
    setMensagem(null)
    try {
      const res = await fetch('/api/ciclistas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prova_id: provaId,
          ciclistas: preview.ciclistas,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erro ao guardar')
      setMensagem(`✅ Startlist guardada: ${data.count} ciclistas.`)
      setTexto('')
      setPreview(null)
      setExistentes(data.count)
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Erro desconhecido'
      setErro(msg)
    } finally {
      setLoading(false)
    }
  }

  async function handleApagar() {
    if (!confirm('Tens a certeza que queres apagar toda a startlist desta prova?')) return
    setLoading(true)
    setErro(null)
    setMensagem(null)
    try {
      const res = await fetch(`/api/ciclistas?prova_id=${provaId}`, { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erro ao apagar')
      setMensagem('✅ Startlist apagada.')
      setExistentes(0)
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Erro desconhecido'
      setErro(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-4 text-sm text-amber-200">
        <strong>Como usar:</strong> abre a página da prova no procyclingstats.com, seleciona todo o bloco da startlist (ou copia do PDF), e cola na caixa abaixo. Depois clica em <strong>Pré-visualizar</strong> para verificares os ciclistas extraídos e, se estiver OK, <strong>Guardar</strong>.
      </div>

      <div className="card">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-zinc-400">Startlist atual</p>
            <p className="text-2xl font-bold text-zinc-100">
              {existentes} <span className="text-sm font-normal text-zinc-500">ciclistas</span>
            </p>
          </div>
          {existentes > 0 && (
            <button
              onClick={handleApagar}
              disabled={loading}
              className="text-sm text-red-400 underline hover:text-red-300 disabled:opacity-50"
            >
              🗑️ Apagar startlist
            </button>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <label className="block text-sm font-medium">Texto da startlist</label>
        <textarea
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          rows={12}
          placeholder={`1 Alpecin-Premier Tech\n1. VAN DER POEL Mathieu\n2. DEL GROSSO Tibor\n...\n2 Bahrain - Victorious\n11. TIBERI Antonio\n...`}
          className="w-full rounded-md border border-neutral-700 bg-neutral-900 p-3 font-mono text-xs"
        />
      </div>

      <div className="flex gap-2">
        <button
          onClick={handlePreview}
          disabled={loading}
          className="rounded-md bg-neutral-700 px-4 py-2 text-sm hover:bg-neutral-600 disabled:opacity-50"
        >
          Pré-visualizar
        </button>
        {preview && preview.ciclistas.length > 0 && (
          <button
            onClick={handleGuardar}
            disabled={loading}
            className="rounded-md bg-amber-500 px-4 py-2 text-sm font-medium text-black hover:bg-amber-400 disabled:opacity-50"
          >
            {loading ? 'A guardar...' : `Guardar ${preview.ciclistas.length} ciclistas`}
          </button>
        )}
      </div>

      {erro && (
        <div className="rounded-md border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-300">
          {erro}
        </div>
      )}
      {mensagem && (
        <div className="rounded-md border border-green-500/40 bg-green-500/10 p-3 text-sm text-green-300">
          {mensagem}
        </div>
      )}

      {preview && (
        <div className="space-y-3">
          <div className="text-sm text-neutral-400">
            Detetadas <strong>{preview.equipas.length}</strong> equipas e{' '}
            <strong>{preview.ciclistas.length}</strong> ciclistas.
          </div>

          {preview.linhasIgnoradas.length > 0 && (
            <details className="rounded-md border border-neutral-700 bg-neutral-900 p-3 text-xs">
              <summary className="cursor-pointer text-amber-300">
                ⚠️ {preview.linhasIgnoradas.length} linhas ignoradas (clica para ver)
              </summary>
              <ul className="mt-2 list-disc pl-5 text-neutral-400">
                {preview.linhasIgnoradas.map((l, i) => (
                  <li key={i}>{l}</li>
                ))}
              </ul>
            </details>
          )}

          <div className="max-h-96 overflow-y-auto rounded-md border border-neutral-700">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-neutral-800">
                <tr>
                  <th className="p-2 text-left">Dorsal</th>
                  <th className="p-2 text-left">Nome</th>
                  <th className="p-2 text-left">Equipa</th>
                </tr>
              </thead>
              <tbody>
                {preview.ciclistas.map((c, i) => (
                  <tr key={i} className="border-t border-neutral-800">
                    <td className="p-2 text-neutral-400">{c.dorsal ?? '—'}</td>
                    <td className="p-2 font-medium">{c.nome}</td>
                    <td className="p-2 text-neutral-400">{c.equipa}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
