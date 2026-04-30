'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

/**
 * Componente cliente que deteta tokens/erros do Supabase no hash da URL
 * e redireciona para a página correta.
 * 
 * Supabase redireciona para a homepage com hashes como:
 * #access_token=...&type=recovery  → vai para reset-password
 * #error=access_denied&error_code=otp_expired → vai para reset-password com erro
 */
export default function AuthHashHandler() {
  const router = useRouter()

  useEffect(() => {
    if (typeof window === 'undefined') return
    const hash = window.location.hash

    if (!hash || hash === '#') return

    const params = new URLSearchParams(hash.replace('#', ''))

    const error = params.get('error')
    const errorCode = params.get('error_code')
    const type = params.get('type')
    const accessToken = params.get('access_token')

    // Link de recuperação expirado ou inválido
    if (error === 'access_denied' || errorCode === 'otp_expired') {
      router.replace('/auth/reset-password?expired=1')
      return
    }

    // Token de recuperação válido — redirecionar para reset-password
    if (type === 'recovery' && accessToken) {
      // Manter o hash completo para o Supabase processar os tokens
      router.replace('/auth/reset-password' + hash)
      return
    }
  }, [router])

  return null
}
