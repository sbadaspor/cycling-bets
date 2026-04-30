import { createClient } from '@/lib/supabase/server'

interface Props {
  provaId: string
  provaNome: string
}

export default async function AguardandoApostas({ provaId, provaNome }: Props) {
  const supabase = await createClient()

  const [{ data: apostas }, { data: perfis }] = await Promise.all([
    supabase.from('apostas').select('user_id').eq('prova_id', provaId),
    supabase.from('perfis').select('id, username, avatar_url'),
  ])

  if (!perfis || perfis.length === 0) return null

  const apostaram = new Set((apostas ?? []).map(a => a.user_id))
  const total = perfis.length
  const jaApostaram = perfis.filter(p => apostaram.has(p.id))
  const faltam = perfis.filter(p => !apostaram.has(p.id))

  if (faltam.length === 0) return null // todos já apostaram

  return (
    <div style={{
      background: 'rgba(68,136,255,0.06)', border: '1px solid rgba(68,136,255,0.2)',
      borderRadius: '0.875rem', padding: '0.875rem 1.1rem',
    }}>
      <p style={{ fontSize: '0.72rem', color: '#4488ff', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.6rem' }}>
        ⏳ A aguardar apostas — {provaNome}
      </p>

      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
        {perfis.map(p => {
          const apostou = apostaram.has(p.id)
          const inicial = p.username?.[0]?.toUpperCase() ?? '?'
          return (
            <div key={p.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.35rem' }}>
              <div style={{
                width: 40, height: 40, borderRadius: '50%', position: 'relative',
                background: p.avatar_url ? 'transparent' : apostou ? 'rgba(200,244,0,0.12)' : 'rgba(255,255,255,0.05)',
                border: `2px solid ${apostou ? 'rgba(200,244,0,0.4)' : 'rgba(255,255,255,0.12)'}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '0.9rem', fontWeight: 900, color: apostou ? 'var(--lime)' : 'var(--text-sub)',
                fontFamily: 'Barlow Condensed, sans-serif', overflow: 'hidden',
                opacity: apostou ? 1 : 0.5,
                transition: 'all 0.2s',
              }}>
                {p.avatar_url
                  ? <img src={p.avatar_url} alt={p.username} style={{ width: '100%', height: '100%', objectFit: 'cover', filter: apostou ? 'none' : 'grayscale(1)' }} />
                  : inicial
                }
                {/* Checkmark overlay */}
                {apostou && (
                  <div style={{ position: 'absolute', bottom: -2, right: -2, width: 16, height: 16, borderRadius: '50%', background: 'var(--lime)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.55rem', fontWeight: 900, color: '#0a0a0f' }}>
                    ✓
                  </div>
                )}
              </div>
              <span style={{ fontSize: '0.65rem', color: apostou ? 'var(--lime)' : 'var(--text-sub)', fontWeight: 600 }}>
                {apostou ? '✅' : '⏳'} {p.username}
              </span>
            </div>
          )
        })}
      </div>

      <p style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginTop: '0.6rem' }}>
        {jaApostaram.length} de {total} {total === 1 ? 'jogador apostou' : 'jogadores apostaram'}
        {faltam.length > 0 && ` · Falta${faltam.length === 1 ? '' : 'm'}: ${faltam.map(p => p.username).join(', ')}`}
      </p>
    </div>
  )
}
