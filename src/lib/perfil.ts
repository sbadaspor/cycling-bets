import type { Perfil } from '@/types'

/**
 * Retorna o nome de exibição preferido de um perfil.
 * Prioridade: full_name → username → fallback
 */
export function nomeExibir(perfil: Perfil | null | undefined, fallback = 'utilizador'): string {
  return perfil?.full_name?.trim() || perfil?.username || fallback
}

/**
 * Inicial para avatar quando não há imagem.
 * Usa a primeira letra do nome de exibição.
 */
export function inicialAvatar(perfil: Perfil | null | undefined): string {
  return nomeExibir(perfil, '?')[0]?.toUpperCase() ?? '?'
}
