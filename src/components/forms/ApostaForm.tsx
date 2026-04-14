'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { Aposta, Prova } from '@/types'

interface Props {
  prova: Prova
  apostaExistente?: Aposta | null
}

export function ApostaForm({ prova, apostaExistente }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [sucesso, setSucesso] = useState(false)

  // Inicializar com aposta existente ou vazio
  const [top20, setTop20] = useState<string[]>(
    apostaExistente?.apostas_top20 ?? Array(20).fill('')
  )
  const [camisolaSprint, setCamisolaSprint] = useState(apostaExistente?.camisola_sprint ?? '')
  const [camisolaMontanha, setCamisolaMontanha] = useState(apostaExistente?.camisola_montanha ?? '')
  const [camisolaJuventude, setCamisolaJuventude] = useState(apostaExistente?.camisola_juventude ?? '')

  const handleCiclistaChange = (idx: number, valor: string) => {
    setTop20(prev => {
      const novo = [...prev]
      novo[idx] = valor
      return novo
    })
  }

  const handleSubmit = async () => {
    setErro(null)
    setLoading(true)

    // Validação
    const ciclistasVazios = top20.filter(c => !c.trim())
    if (ciclistasVazios.length > 0) {
      setErro(`Preenche todos os 20 lugares. Faltam ${ciclistasVazios.length}.`)
      setLoading(false)
      return
    }

    // Verificar duplicados
    const nomes = top20.map(c => c.trim().toLowerCase())
    const duplicados = nomes.filter((n, idx) => nomes.indexOf(n) !== idx)
    if (duplicados.length > 0) {
      setErro('Há ciclistas repetidos na tua aposta. Verifica a lista.')
      setLoading(false)
      return
    }

    try {
      const res = await fetch('/api/apostas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prova_id: prova.id,
          apostas_top20: top20.map(c => c.trim()),
          camisola_sprint: camisolaSprint.trim(),
          camisola_montanha: camisolaMontanha.trim(),
          camisola_juventude: camisolaJuventude.trim(),
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setErro(data.error ?? 'Erro ao submeter aposta')
        return
      }

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
      <div className="card text-center py-12">
        <div className="text-5xl mb-4">✅</div>
        <h2 className="text-xl font-bold text-zinc-100">Aposta submetida!</h2>
        <p className="text-zinc-400 mt-2">A redirecionar para o dashboard...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {erro && (
        <div className="bg-red-900/30 border border-red-800 rounded-lg px-4 py-3 text-red-400 text-sm">
          ⚠️ {erro}
        </div>
      )}

      {/* Top 20 */}
      <div className="card">
        <h2 className="text-lg font-semibold text-zinc-100 mb-1">
          Previsão Top-20
        </h2>
        <p className="text-zinc-500 text-sm mb-4">
          Coloca os 20 ciclistas por ordem — do 1.º ao 20.º lugar.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {top20.map((ciclista, idx) => (
            <div key={idx} className="flex items-center gap-3">
              <div className={`
                w-8 h-8 flex items-center justify-center rounded-lg text-xs font-bold flex-shrink-0
                ${idx < 10
                  ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                  : 'bg-zinc-800 text-zinc-500 border border-zinc-700'
                }
              `}>
                {idx + 1}
              </div>
              <input
                type="text"
                className="input-field"
                placeholder={`${idx + 1}º lugar`}
                value={ciclista}
                onChange={e => handleCiclistaChange(idx, e.target.value)}
                autoComplete="off"
              />
            </div>
          ))}
        </div>

        <div className="mt-4 p-3 bg-zinc-800/50 rounded-lg">
          <p className="text-xs text-zinc-500">
            <span className="text-amber-400 font-medium">🏅 Posições 1–10 (dourado):</span> valem 3 pts se o ciclista terminar no Top-10 real
            {' · '}
            <span className="text-zinc-400 font-medium">Posições 11–20:</span> valem 2 pts se terminar no Top-20 real
          </p>
        </div>
      </div>

      {/* Camisolas */}
      <div className="card">
        <h2 className="text-lg font-semibold text-zinc-100 mb-1">
          🎽 Vencedores de Camisolas
        </h2>
        <p className="text-zinc-500 text-sm mb-4">
          1 ponto por cada acerto correto.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-1.5">
              🟢 Camisola Sprint
            </label>
            <input
              type="text"
              className="input-field"
              placeholder="Nome do ciclista"
              value={camisolaSprint}
              onChange={e => setCamisolaSprint(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-1.5">
              🔴 Camisola Montanha
            </label>
            <input
              type="text"
              className="input-field"
              placeholder="Nome do ciclista"
              value={camisolaMontanha}
              onChange={e => setCamisolaMontanha(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-1.5">
              ⚪ Camisola Juventude
            </label>
            <input
              type="text"
              className="input-field"
              placeholder="Nome do ciclista"
              value={camisolaJuventude}
              onChange={e => setCamisolaJuventude(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Resumo antes de submeter */}
      <div className="card bg-zinc-900/50 border-zinc-700/50">
        <h3 className="text-sm font-medium text-zinc-400 mb-3">Resumo</h3>
        <div className="grid grid-cols-3 gap-4 text-center text-sm">
          <div>
            <p className="text-zinc-400">Ciclistas preenchidos</p>
            <p className={`font-bold text-lg ${top20.filter(c => c.trim()).length === 20 ? 'text-green-400' : 'text-amber-400'}`}>
              {top20.filter(c => c.trim()).length}/20
            </p>
          </div>
          <div>
            <p className="text-zinc-400">Camisolas</p>
            <p className="font-bold text-lg text-zinc-100">
              {[camisolaSprint, camisolaMontanha, camisolaJuventude].filter(c => c.trim()).length}/3
            </p>
          </div>
          <div>
            <p className="text-zinc-400">Estado</p>
            <p className="font-bold text-lg">
              {apostaExistente ? '✏️ Editar' : '🆕 Nova'}
            </p>
          </div>
        </div>
      </div>

      <button
        onClick={handleSubmit}
        disabled={loading}
        className="btn-primary w-full py-3 text-base"
      >
        {loading ? '⏳ A submeter...' : apostaExistente ? '💾 Atualizar Aposta' : '🚀 Submeter Aposta'}
      </button>
    </div>
  )
}
