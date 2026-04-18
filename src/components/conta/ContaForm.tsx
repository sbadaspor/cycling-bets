'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

interface Perfil {
  id: string
  username: string
  full_name?: string
  avatar_url?: string
  data_nascimento?: string
}

interface Props {
  perfil: Perfil
}

// ── Avatar display ─────────────────────────────────────
function Avatar({ url, initial, size = 96 }: { url?: string; initial: string; size?: number }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', overflow: 'hidden',
      background: 'rgba(200,244,0,0.12)', border: '2.5px solid rgba(200,244,0,0.3)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      fontFamily: 'Barlow Condensed, sans-serif',
      fontSize: size * 0.38, fontWeight: 900, color: 'var(--lime)',
    }}>
      {url ? (
        <img src={url} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      ) : initial}
    </div>
  )
}

export default function ContaForm({ perfil }: Props) {
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)

  const [primeiroNome, setPrimeiroNome] = useState(() => {
    const parts = (perfil.full_name ?? '').split(' ')
    return parts[0] ?? ''
  })
  const [ultimoNome, setUltimoNome] = useState(() => {
    const parts = (perfil.full_name ?? '').split(' ')
    return parts.slice(1).join(' ') ?? ''
  })
  const [dataNascimento, setDataNascimento] = useState(perfil.data_nascimento ?? '')
  const [avatarUrl, setAvatarUrl] = useState(perfil.avatar_url ?? '')

  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [sucesso, setSucesso] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [preview, setPreview] = useState<string | null>(null)

  const supabase = createClient()
  const initial = perfil.username?.[0]?.toUpperCase() ?? '?'

  // ── Avatar upload ───────────────────────────────────
  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Local preview imediato
    const objectUrl = URL.createObjectURL(file)
    setPreview(objectUrl)

    setUploading(true)
    setErro(null)

    try {
      const ext = file.name.split('.').pop()
      const path = `${perfil.id}/avatar.${ext}`

      const { error: upErr } = await supabase.storage
        .from('avatars')
        .upload(path, file, { upsert: true })

      if (upErr) throw upErr

      const { data } = supabase.storage.from('avatars').getPublicUrl(path)
      // Add cache-busting param
      const publicUrl = `${data.publicUrl}?t=${Date.now()}`
      setAvatarUrl(publicUrl)
    } catch (err: any) {
      setErro('Erro ao fazer upload da foto. Verifica se o bucket "avatars" existe no Supabase Storage.')
      setPreview(null)
    } finally {
      setUploading(false)
    }
  }

  // ── Save profile ────────────────────────────────────
  const handleSave = async () => {
    setSaving(true)
    setErro(null)
    setSucesso(false)

    const fullName = [primeiroNome.trim(), ultimoNome.trim()].filter(Boolean).join(' ')

    const { error } = await supabase
      .from('perfis')
      .update({
        full_name: fullName || null,
        avatar_url: avatarUrl || null,
        data_nascimento: dataNascimento || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', perfil.id)

    if (error) {
      setErro('Erro ao guardar. Tenta novamente.')
    } else {
      setSucesso(true)
      setTimeout(() => setSucesso(false), 3000)
      router.refresh()
    }

    setSaving(false)
  }

  const displayUrl = preview ?? avatarUrl

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

      {/* ── Avatar ──────────────────────────────────── */}
      <div className="card animate-fade-up">
        <p style={{
          fontSize: '0.68rem', color: 'var(--lime)', fontWeight: 700,
          textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.15rem',
        }}>
          🖼️ Foto
        </p>
        <h2 style={{
          fontFamily: 'Barlow Condensed, sans-serif', fontSize: '1.2rem',
          fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em',
          marginBottom: '1.25rem',
        }}>
          Avatar
        </h2>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', flexWrap: 'wrap' }}>
          <Avatar url={displayUrl} initial={initial} size={88} />

          <div>
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              style={{ display: 'none' }}
              onChange={handleAvatarChange}
            />
            <button
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="btn-secondary"
              style={{ fontSize: '0.85rem', marginBottom: '0.5rem' }}
            >
              {uploading ? '⏳ A fazer upload...' : '📷 Escolher foto'}
            </button>
            <p style={{ fontSize: '0.72rem', color: '#9a9ab5' }}>
              JPG, PNG ou WebP · Máx. 2 MB
            </p>
            {avatarUrl && !preview && (
              <button
                onClick={() => { setAvatarUrl(''); setPreview(null) }}
                style={{
                  marginTop: '0.5rem', fontSize: '0.72rem', color: 'var(--red)',
                  background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                }}
              >
                Remover foto
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Personal info ───────────────────────────── */}
      <div className="card animate-fade-up delay-1">
        <p style={{
          fontSize: '0.68rem', color: 'var(--lime)', fontWeight: 700,
          textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.15rem',
        }}>
          👤 Dados pessoais
        </p>
        <h2 style={{
          fontFamily: 'Barlow Condensed, sans-serif', fontSize: '1.2rem',
          fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em',
          marginBottom: '1.25rem',
        }}>
          Informação
        </h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Username — read only */}
          <div>
            <label style={{
              display: 'block', fontSize: '0.75rem', fontWeight: 600,
              color: '#9a9ab5', marginBottom: '0.4rem',
              textTransform: 'uppercase', letterSpacing: '0.06em',
            }}>
              Username
            </label>
            <div style={{
              padding: '0.75rem 1rem', borderRadius: '0.875rem',
              background: 'rgba(255,255,255,0.03)',
              border: '1.5px solid rgba(255,255,255,0.07)',
              fontSize: '0.9rem', color: '#6a6a86',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <span>{perfil.username}</span>
              <span style={{ fontSize: '0.68rem', color: '#4a4a66', background: 'rgba(255,255,255,0.04)', padding: '0.15rem 0.5rem', borderRadius: '999px' }}>
                Não editável
              </span>
            </div>
          </div>

          {/* Name */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <div>
              <label style={{
                display: 'block', fontSize: '0.75rem', fontWeight: 600,
                color: '#9a9ab5', marginBottom: '0.4rem',
                textTransform: 'uppercase', letterSpacing: '0.06em',
              }}>
                Primeiro nome
              </label>
              <input
                type="text"
                className="input-field"
                placeholder="João"
                value={primeiroNome}
                onChange={e => setPrimeiroNome(e.target.value)}
              />
            </div>
            <div>
              <label style={{
                display: 'block', fontSize: '0.75rem', fontWeight: 600,
                color: '#9a9ab5', marginBottom: '0.4rem',
                textTransform: 'uppercase', letterSpacing: '0.06em',
              }}>
                Último nome
              </label>
              <input
                type="text"
                className="input-field"
                placeholder="Silva"
                value={ultimoNome}
                onChange={e => setUltimoNome(e.target.value)}
              />
            </div>
          </div>

          {/* Date of birth */}
          <div>
            <label style={{
              display: 'block', fontSize: '0.75rem', fontWeight: 600,
              color: '#9a9ab5', marginBottom: '0.4rem',
              textTransform: 'uppercase', letterSpacing: '0.06em',
            }}>
              Data de nascimento
            </label>
            <input
              type="date"
              className="input-field"
              value={dataNascimento}
              onChange={e => setDataNascimento(e.target.value)}
              style={{ colorScheme: 'dark' }}
            />
          </div>
        </div>
      </div>

      {/* ── Feedback ──────────────────────────────────── */}
      {erro && (
        <div className="animate-fade-up" style={{
          background: 'rgba(255,68,68,0.08)', border: '1px solid rgba(255,68,68,0.25)',
          borderRadius: '0.875rem', padding: '0.875rem 1rem',
          fontSize: '0.85rem', color: 'var(--red)',
        }}>
          ⚠️ {erro}
        </div>
      )}

      {sucesso && (
        <div className="animate-fade-up" style={{
          background: 'rgba(68,204,136,0.1)', border: '1px solid rgba(68,204,136,0.25)',
          borderRadius: '0.875rem', padding: '0.875rem 1rem',
          fontSize: '0.85rem', color: 'var(--green)',
        }}>
          ✓ Perfil guardado com sucesso!
        </div>
      )}

      {/* ── Save button ──────────────────────────────── */}
      <button
        onClick={handleSave}
        disabled={saving || uploading}
        className="btn-primary animate-fade-up delay-2"
        style={{ width: '100%', padding: '0.9rem', fontSize: '1.05rem' }}
      >
        {saving ? '⏳ A guardar...' : '💾 Guardar alterações'}
      </button>

    </div>
  )
}
