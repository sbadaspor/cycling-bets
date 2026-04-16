'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { Aposta, Ciclista, Prova } from '@/types'
import CyclistAutocomplete from './CyclistAutocomplete'
import { getConfigCategoria } from '@/lib/categoriaConfig'

interface Props {
  prova: Prova
  apostaExistente?: Aposta | null
  ciclistas: Ciclista[]
}

export function ApostaForm({ prova, apostaExistente, ciclistas }: Props) {
  const router = useRouter()
  const config = getConfigCategoria(prova.categoria)
  const numPos = config.numPosicoes

  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [sucesso, setSucesso] = useState(false)

  // Apostas inicializadas com o tamanho correto da categoria
  const [posicoes, setPosicoes] = useState<string[]>(() => {
    const arr = Array(numPos).fill('')
    if (apostaExistente?.apostas_top20) {
      for (let i = 0; i < Math.min(numPos, apostaExistente.apostas_top20.length); i++) {
        arr[i] = apostaExistente.apostas_top20[i] ?? ''
      }
    }
    return arr
  })
  const [camisolaSprint, setCamisolaSprint] = useState(apostaExistente?.camisola_sprint ?? '')
  const [camisolaMontanha, setCamisolaMontanha] = useState(apostaExistente?.camisola_montanha ?? '')
  const [camisolaJuventude, setCamisolaJuventude] = useState(apostaExistente?.camisola_juventude ?? '')

  const nomesValidos = new Set(ciclistas.map(c => c.nome))

  const handleCiclistaChange = (idx: number, valor: string) => {
    setPosicoes(prev => {
      const novo = [...prev]
      novo[idx] = valor
      return novo
    })
  }

  const handleSubmit = async () => {
    setErro(null)

    const vazios = posicoes.filter(c => !c.trim())
    if (vazios.length > 0) {
      setErro(`Preenche todos os ${numPos} lugares. Faltam ${vazios.length}.`)
      return
    }

    const invalidos = posicoes.filter(c => !nomesValidos.has(c.trim()))
    if (invalidos.length > 0) {
      setErro(`${invalidos.length} ciclista(s) não estão na startlist. Escolhe apenas nomes das sugestões.`)
      return
    }

    const nomes = posicoes.map(c => c.trim())
    const duplicados = nomes.filter((n, idx) => nomes.indexOf(n) !== idx)
    if (duplicados.length > 0) {
      setErro('Há ciclistas repetidos na tua aposta. Verifica a lista.')
      return
    }

    if (config.temCamisolas) {
      const camisolasPreenchidas = [camisolaSprint, camisolaMontanha, camisolaJuventude]
        .map(c => c.trim())
        .filter(c => c.length > 0)
      const camisolasInvalidas = camisolasPreenchidas.filter(c => !nomesValidos.has(c))
      if (camisolasInvalidas.length > 0) {
        setErro('Ciclista de camisola não está na startlist. Escolhe das sugestões ou deixa vazio.')
        return
      }
    }

    // Enviar array com tamanho 20 para a DB (mesmo que só tenhamos 10 apostas)
    const apostasTop20 = [...posicoes]
    while (apostasTop20.length < 20) apostasTop20.push('')

    setLoading(true)
    try {
      const res = await fetch('/api/apostas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prova_id: prova.id,
          apostas_top20: apostasTop20,
          camisola_sprint: config.temCamisolas ? camisolaSprint.trim() : '',
          camisola_montanha: config.temCamisolas ? camisolaMontanha.trim() : '',
          camisola_juventude: config.temCamisolas ? camisolaJuventude.trim() : '',
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

  const numSaoTop = Math.min(5, numPos)  // Top-5 ou Top-10 destacados

  return (
    <div className="space-y-6">
      {erro && (
        <div className="bg-red-900/30 border border-red-800 rounded-lg px-4 py-3 text-red-400 text-sm">
          ⚠️ {erro}
        </div>
      )}

      {/* Top N */}
      <div className="card">
        <h2 className="text-lg font-semibold text-zinc-100 mb-1">
          Previsão Top-{numPos}
        </h2>
        <p className="text-zinc-500 text-sm mb-4">
          Coloca os {numPos} ciclistas por ordem — do 1.º ao {numPos}.º lugar. Escreve algumas letras e escolhe da lista.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {posicoes.map((ciclista, idx) => {
            const destaque = numPos === 10 ? idx < 5 : idx < 10
            return (
              <div key={idx} className="flex items-start gap-3">
                <div className={`
                  w-8 h-8 flex items-center justify-center rounded-lg text-xs font-bold flex-shrink-0 mt-2
                  ${destaque
                    ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                    : 'bg-zinc-800 text-zinc-500 border border-zinc-700'
                  }
                `}>
                  {idx + 1}
                </div>
                <div className="flex-1">
                  <CyclistAutocomplete
                    ciclistas={ciclistas}
                    value={ciclista}
                    onChange={(v) => handleCiclistaChange(idx, v)}
                    placeholder={`${idx + 1}º lugar`}
                    usados={posicoes.filter((_, i) => i !== idx)}
                  />
                </div>
              </div>
            )
          })}
        </div>

        <div className="mt-4 p-3 bg-zinc-800/50 rounded-lg">
          {numPos === 20 ? (
            <p className="text-xs text-zinc-500">
              <span className="text-amber-400 font-medium">🏅 Posições 1–10:</span> 3 pts por acerto no Top-10 real
              {' · '}
              <span className="text-zinc-400 font-medium">Posições 11–20:</span> 2 pts por acerto no Top-20 real (+1 bónus se acertar no Top-10)
            </p>
          ) : (
            <p className="text-xs text-zinc-500">
              <span className="text-amber-400 font-medium">🏅 Posições 1–5:</span> 3 pts por acerto no Top-5 real
              {' · '}
              <span className="text-zinc-400 font-medium">Posições 6–10:</span> 2 pts por acerto no Top-10 real (+1 bónus se acertar no Top-5)
            </p>
          )}
        </div>
      </div>

      {/* Camisolas (só para Grandes Voltas e Provas de Semana) */}
      {config.temCamisolas && (
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
              <CyclistAutocomplete
                ciclistas={ciclistas}
                value={camisolaSprint}
                onChange={setCamisolaSprint}
                placeholder="Nome do ciclista"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-1.5">
                🔴 Camisola Montanha
              </label>
              <CyclistAutocomplete
                ciclistas={ciclistas}
                value={camisolaMontanha}
                onChange={setCamisolaMontanha}
                placeholder="Nome do ciclista"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-1.5">
                ⚪ Camisola Juventude
              </label>
              <CyclistAutocomplete
                ciclistas={ciclistas}
                value={camisolaJuventude}
                onChange={setCamisolaJuventude}
                placeholder="Nome do ciclista"
              />
            </div>
          </div>
        </div>
      )}

      {/* Resumo */}
      <div className="card bg-zinc-900/50 border-zinc-700/50">
        <h3 className="text-sm font-medium text-zinc-400 mb-3">Resumo</h3>
        <div className={`grid ${config.temCamisolas ? 'grid-cols-3' : 'grid-cols-2'} gap-4 text-center text-sm`}>
          <div>
            <p className="text-zinc-400">Ciclistas preenchidos</p>
            <p className={`font-bold text-lg ${posicoes.filter(c => c.trim() && nomesValidos.has(c.trim())).length === numPos ? 'text-green-400' : 'text-amber-400'}`}>
              {posicoes.filter(c => c.trim() && nomesValidos.has(c.trim())).length}/{numPos}
            </p>
          </div>
          {config.temCamisolas && (
            <div>
              <p className="text-zinc-400">Camisolas</p>
              <p className="font-bold text-lg text-zinc-100">
                {[camisolaSprint, camisolaMontanha, camisolaJuventude].filter(c => c.trim()).length}/3
              </p>
            </div>
          )}
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
