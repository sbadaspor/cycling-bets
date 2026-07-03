import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getProva, getMinhaAposta, getCiclistas } from '@/lib/queries'
import { ApostaForm } from '@/components/forms/ApostaForm'

interface Props { params: Promise<{ provaId: string }> }

export default async function ApostaPage({ params }: Props) {
  const { provaId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  let prova
  try { prova = await getProva(provaId) } catch { redirect('/') }
  if (prova.status !== 'aberta') redirect(`/provas/${provaId}`)

  const [minhaAposta, ciclistas] = await Promise.all([
    getMinhaAposta(provaId, user.id),
    getCiclistas(provaId),
  ])

  if (ciclistas.length === 0) {
    return (
      <div style={{ maxWidth: 720, margin: '0 auto' }}>
        <div style={{ padding: '20px 0 24px' }}>
          <Link href="/apostas" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: "'JetBrains Mono', monospace", fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#A79F8E', textDecoration: 'none', marginBottom: 16 }}>
            <svg width="13" height="13" viewBox="0 0 16 16"><path d="M10 3.5L5 8l5 4.5" stroke="currentColor" strokeWidth="1.9" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>
            Apostas
          </Link>
          <h1 style={{ font: "800 34px 'Archivo', sans-serif", letterSpacing: '-0.025em', color: '#16140F', margin: 0 }}>{prova.nome}</h1>
        </div>
        <div style={{ background: '#fff', border: '1px solid #E9E4D9', borderRadius: 18, padding: '3rem 1.5rem', textAlign: 'center' }}>
          <div style={{ fontSize: 36, marginBottom: 14 }}>📋</div>
          <h2 style={{ font: "700 20px 'Archivo', sans-serif", color: '#16140F', margin: '0 0 8px' }}>Startlist em breve</h2>
          <p style={{ font: "400 14px 'Archivo', sans-serif", color: '#857E6F', maxWidth: 340, margin: '0 auto 24px' }}>
            A lista de ciclistas ainda não foi carregada. Volta quando a startlist estiver disponível.
          </p>
          <Link href="/" style={{ display: 'inline-block', background: '#16140F', color: '#fff', padding: '10px 24px', borderRadius: 10, font: "700 14px 'Archivo', sans-serif", textDecoration: 'none' }}>
            ← Início
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: 720, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ padding: '20px 0 24px' }}>
        <Link href="/apostas" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: "'JetBrains Mono', monospace", fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#A79F8E', textDecoration: 'none', marginBottom: 16 }}>
          <svg width="13" height="13" viewBox="0 0 16 16"><path d="M10 3.5L5 8l5 4.5" stroke="currentColor" strokeWidth="1.9" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>
          Apostas
        </Link>
        <h1 style={{ font: "800 34px 'Archivo', sans-serif", letterSpacing: '-0.025em', color: '#16140F', margin: 0, lineHeight: 1.05 }}>
          {prova.nome}
        </h1>
        <p style={{ font: "500 14px 'Archivo', sans-serif", color: '#857E6F', margin: '6px 0 0' }}>
          {minhaAposta ? 'Atualiza a tua previsão' : 'Submete a tua previsão'}
        </p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 12 }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 8, background: '#EAF7EC', border: '1px solid #CDEBD2', fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, fontSize: 11, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#1F8A44' }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#1F8A44', display: 'inline-block' }} />
            Aberta
          </span>
          {minhaAposta && (
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, fontWeight: 600, letterSpacing: '0.04em', color: '#A79F8E' }}>
              Aposta existente
            </span>
          )}
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, fontWeight: 600, letterSpacing: '0.04em', color: '#A79F8E' }}>
            {ciclistas.length} ciclistas
          </span>
        </div>
      </div>

      <ApostaForm prova={prova} apostaExistente={minhaAposta} ciclistas={ciclistas} />
    </div>
  )
}
