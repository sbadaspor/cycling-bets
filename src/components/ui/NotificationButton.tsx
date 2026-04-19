'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

function urlBase64ToUint8Array(base64String: string): ArrayBuffer {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray.buffer
}

function isIOS(): boolean {
  return /iphone|ipad|ipod/i.test(navigator.userAgent)
}

function isInStandaloneMode(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  )
}

type Estado = 'loading' | 'nao-autenticado' | 'nao-suportado' | 'ios-instalar' | 'ativo' | 'bloqueado' | 'inativo'

export default function NotificationButton() {
  const [estado, setEstado] = useState<Estado>('loading')
  const [mostrarIOSModal, setMostrarIOSModal] = useState(false)
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState('')

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        setEstado('nao-autenticado')
        return
      }
      if (isIOS() && !isInStandaloneMode()) {
        setEstado('ios-instalar')
        return
      }
      if (!('Notification' in window) || !('serviceWorker' in navigator)) {
        setEstado('nao-suportado')
        return
      }
      if (Notification.permission === 'granted') setEstado('ativo')
      else if (Notification.permission === 'denied') setEstado('bloqueado')
      else setEstado('inativo')
    })
  }, [])

  async function ativarNotificacoes() {
    setLoading(true)
    setErro('')

    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setErro('Sessão expirada. Faz login novamente.')
        setLoading(false)
        return
      }

      // Pedir permissão
      const permission = await Notification.requestPermission()
      if (permission !== 'granted') {
        setEstado('bloqueado')
        setLoading(false)
        return
      }

      // Registar service worker e subscrever
      const registration = await navigator.serviceWorker.ready
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(
          process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!
        ),
      })

      // Guardar subscrição — user_id é lido da sessão no servidor
      const res = await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...subscription.toJSON(), user_id: user.id }),
      })

      if (res.ok) {
        setEstado('ativo')
      } else {
        const data = await res.json()
        setErro(data.error || 'Erro ao guardar. Tenta novamente.')
      }
    } catch (err: unknown) {
      setErro('Erro: ' + (err instanceof Error ? err.message : 'desconhecido'))
    }

    setLoading(false)
  }

  // Não mostrar nada se não está autenticado, não suportado ou a carregar
  if (estado === 'loading' || estado === 'nao-autenticado' || estado === 'nao-suportado') {
    return null
  }

  // Já ativo
  if (estado === 'ativo') {
    return (
      <span title="Notificações ativas" style={{ fontSize: '1.1rem', cursor: 'default' }}>
        🔔
      </span>
    )
  }

  // Bloqueado pelo browser
  if (estado === 'bloqueado') {
    return (
      <span title="Notificações bloqueadas — permite nas definições do browser" style={{ fontSize: '1.1rem', opacity: 0.35, cursor: 'default' }}>
        🔕
      </span>
    )
  }

  // iOS em browser (não instalado como PWA)
  if (estado === 'ios-instalar') {
    return (
      <>
        <button
          onClick={() => setMostrarIOSModal(true)}
          style={{
            display: 'flex', alignItems: 'center', gap: '0.35rem',
            background: 'var(--lime)', color: '#0a0a0f',
            fontSize: '0.75rem', fontWeight: 700,
            padding: '0.35rem 0.85rem', borderRadius: '9999px',
            border: 'none', cursor: 'pointer',
            fontFamily: 'Barlow Condensed, sans-serif',
            letterSpacing: '0.04em', textTransform: 'uppercase',
          }}
        >
          📲 Instalar app
        </button>

        {mostrarIOSModal && (
          <div
            style={{
              position: 'fixed', inset: 0,
              background: 'rgba(0,0,0,0.75)', zIndex: 100,
              display: 'flex', alignItems: 'flex-end', justifyContent: 'center', padding: '1rem',
            }}
            onClick={() => setMostrarIOSModal(false)}
          >
            <div
              style={{
                background: 'var(--surface)', borderRadius: '1.25rem',
                padding: '1.5rem', width: '100%', maxWidth: '22rem',
                color: 'var(--text)', marginBottom: '2rem',
                border: '1px solid var(--border-hi)',
              }}
              onClick={e => e.stopPropagation()}
            >
              <h2 style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '1.4rem', fontWeight: 800, textAlign: 'center', marginBottom: '0.75rem', textTransform: 'uppercase' }}>
                📲 Instalar no iPhone
              </h2>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-dim)', textAlign: 'center', marginBottom: '1rem' }}>
                Para receber notificações, instala a app no ecrã inicial:
              </p>
              <ol style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {[
                  <>Toca no botão de <strong>partilha</strong> <span style={{ background: 'var(--surface-2)', padding: '1px 6px', borderRadius: 4, fontSize: '0.75rem' }}>⬆️</span> na barra do Safari</>,
                  <>Seleciona <strong>"Adicionar ao ecrã inicial"</strong></>,
                  <>Abre a app pelo <strong>ícone 🚴 no ecrã inicial</strong> e ativa as notificações</>,
                ].map((step, i) => (
                  <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', fontSize: '0.875rem' }}>
                    <span style={{
                      minWidth: 24, height: 24, borderRadius: '50%',
                      background: 'var(--surface-2)', display: 'flex',
                      alignItems: 'center', justifyContent: 'center',
                      fontSize: '0.7rem', fontWeight: 700, color: 'var(--lime)',
                    }}>{i + 1}</span>
                    <span>{step}</span>
                  </li>
                ))}
              </ol>
              <button
                onClick={() => setMostrarIOSModal(false)}
                className="btn-primary"
                style={{ width: '100%', marginTop: '1.25rem' }}
              >
                Entendido
              </button>
            </div>
          </div>
        )}
      </>
    )
  }

  // Estado inativo — mostrar botão de ativar
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.25rem' }}>
      <button
        onClick={ativarNotificacoes}
        disabled={loading}
        style={{
          display: 'flex', alignItems: 'center', gap: '0.35rem',
          background: 'rgba(200,244,0,0.12)', color: 'var(--lime)',
          fontSize: '0.75rem', fontWeight: 700,
          padding: '0.35rem 0.85rem', borderRadius: '9999px',
          border: '1px solid rgba(200,244,0,0.3)', cursor: loading ? 'not-allowed' : 'pointer',
          fontFamily: 'Barlow Condensed, sans-serif',
          letterSpacing: '0.04em', textTransform: 'uppercase',
          opacity: loading ? 0.6 : 1, transition: 'all 0.15s',
        }}
      >
        🔔 {loading ? 'A ativar...' : 'Ativar alertas'}
      </button>
      {erro && (
        <span style={{ fontSize: '0.7rem', color: 'var(--red)' }}>{erro}</span>
      )}
    </div>
  )
}
