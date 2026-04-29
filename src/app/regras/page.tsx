import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Regras & Pontuação | VeloApostas',
  description: 'Como funciona o sistema de apostas e pontuação do VeloApostas',
}

const SECTION = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
    <h2 style={{
      fontFamily: 'Barlow Condensed, sans-serif',
      fontSize: '1.25rem', fontWeight: 800,
      textTransform: 'uppercase', letterSpacing: '0.06em',
      color: 'var(--lime)', margin: 0,
    }}>{title}</h2>
    {children}
  </div>
)

const Row = ({ label, value, sub }: { label: string; value: string; sub?: string }) => (
  <div style={{
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '0.6rem 0.875rem', borderRadius: '0.625rem',
    background: 'var(--surface-2)', border: '1px solid var(--border)',
    gap: '1rem',
  }}>
    <div>
      <p style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--text)', margin: 0 }}>{label}</p>
      {sub && <p style={{ fontSize: '0.72rem', color: 'var(--text-dim)', margin: '0.15rem 0 0' }}>{sub}</p>}
    </div>
    <span style={{
      fontFamily: 'Barlow Condensed, sans-serif',
      fontSize: '1.3rem', fontWeight: 900,
      color: value === '0' ? 'var(--text-sub)' : 'var(--lime)',
      flexShrink: 0,
    }}>{value}</span>
  </div>
)

export default function RegrasPage() {
  return (
    <div style={{ maxWidth: '680px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

      {/* Header */}
      <div className="animate-fade-up">
        <p style={{ fontSize: '0.7rem', color: 'var(--lime)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: '0.3rem' }}>
          📖 Como funciona
        </p>
        <h1 style={{
          fontFamily: 'Barlow Condensed, sans-serif',
          fontSize: 'clamp(1.75rem, 5vw, 2.5rem)', fontWeight: 900,
          textTransform: 'uppercase', lineHeight: 1, marginBottom: '0.5rem',
        }}>
          Regras & <span style={{ color: 'var(--lime)' }}>Pontuação</span>
        </h1>
        <p style={{ fontSize: '0.875rem', color: 'var(--text-dim)', lineHeight: 1.6 }}>
          Antes de cada prova, aposta na classificação dos ciclistas. Quando os resultados saem, os teus pontos são calculados automaticamente.
        </p>
      </div>

      {/* Como apostar */}
      <SECTION title="Como Apostar">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {[
            { n: '1', t: 'Escolhe uma prova', d: 'Seleciona qualquer prova futura antes da data de início.' },
            { n: '2', t: 'Ordena os ciclistas', d: 'Arrasta ou escolhe os ciclistas que achas que vão ficar no Top-20 (ou Top-10 nos monumentos), pela ordem que acreditas.' },
            { n: '3', t: 'Confirma a aposta', d: 'Podes editar até à prova começar. Depois disso, fica bloqueada.' },
            { n: '4', t: 'Acompanha ao vivo', d: 'Após cada etapa, os pontos são atualizados automaticamente.' },
          ].map(({ n, t, d }) => (
            <div key={n} style={{ display: 'flex', gap: '0.875rem', alignItems: 'flex-start' }}>
              <div style={{
                width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                background: 'rgba(200,244,0,0.12)', border: '1px solid rgba(200,244,0,0.25)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: 'Barlow Condensed, sans-serif', fontSize: '0.85rem', fontWeight: 900, color: 'var(--lime)',
              }}>{n}</div>
              <div>
                <p style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text)', margin: 0 }}>{t}</p>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-dim)', margin: '0.15rem 0 0' }}>{d}</p>
              </div>
            </div>
          ))}
        </div>
      </SECTION>

      {/* Grandes Voltas / Prova da Semana */}
      <SECTION title="🏔️ Grande Volta & 📅 Prova da Semana">
        <p style={{ fontSize: '0.82rem', color: 'var(--text-dim)', margin: 0 }}>
          Apostas no <strong style={{ color: 'var(--text)' }}>Top-20</strong> da classificação geral.
          Inclui camisolas especiais (Sprint, Montanha, Juventude).
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <Row label="Apostado no Top-10 → está no Top-10 real" value="3 pts" />
          <Row label="Apostado no 11-20 → está no 11-20 real" value="2 pts" />
          <Row label="Apostado no 11-20 → entrou no Top-10 real" value="1 pt" sub="Bónus por ter acertado mas o ciclista foi melhor" />
          <Row label="Apostado no Top-10 → ficou no 11-20 real" value="0 pts" sub="Apostaste alto mas o ciclista ficou abaixo" />
          <Row label="Cada camisola acertada" value="1 pt" sub="Sprint, Montanha, Juventude (3 pts máx)" />
        </div>
      </SECTION>

      {/* Monumento / Prova de um dia */}
      <SECTION title="🗿 Monumento & ⚡ Prova de um dia">
        <p style={{ fontSize: '0.82rem', color: 'var(--text-dim)', margin: 0 }}>
          Apostas no <strong style={{ color: 'var(--text)' }}>Top-10</strong> do resultado final.
          Sem camisolas — é uma corrida de um dia.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <Row label="Ciclista apostado está no Top-10 real" value="1 pt" />
          <Row label="Posição exata acertada" value="+1 pt" sub="Total de 2 pts por posição exata" />
        </div>
      </SECTION>

      {/* Desempate */}
      <SECTION title="⚖️ Critérios de Desempate">
        <p style={{ fontSize: '0.82rem', color: 'var(--text-dim)', margin: 0 }}>
          Em caso de empate em pontos, o ranking usa estes critérios por ordem:
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
          {[
            'Maior nº de posições exatas (total)',
            'Maior nº de posições exatas no Top-10',
            'Maior nº de posições exatas no Top-20',
            'Maior nº de camisolas acertadas',
          ].map((item, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.5rem 0.75rem', background: 'var(--surface-2)', borderRadius: '0.5rem' }}>
              <span style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '0.8rem', fontWeight: 800, color: 'var(--text-sub)', width: '1rem', textAlign: 'center' }}>{i + 1}</span>
              <span style={{ fontSize: '0.82rem', color: 'var(--text-dim)' }}>{item}</span>
            </div>
          ))}
        </div>
      </SECTION>

      {/* Exemplo */}
      <SECTION title="💡 Exemplo Prático">
        <div style={{ background: 'var(--surface-2)', borderRadius: '0.75rem', padding: '1rem', border: '1px solid var(--border)' }}>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-dim)', marginBottom: '0.75rem', margin: '0 0 0.75rem' }}>
            Apostaste Pogaçar em 1º, Vingegaard em 2º, e Roglic em 5º numa Grande Volta.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem' }}>
              <span style={{ color: 'var(--text)' }}>Pogaçar ficou 1º → apostaste no Top-10 ✓</span>
              <span style={{ color: 'var(--lime)', fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 800 }}>3 pts</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem' }}>
              <span style={{ color: 'var(--text)' }}>Vingegaard ficou 3º → apostaste no Top-10 ✓</span>
              <span style={{ color: 'var(--lime)', fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 800 }}>3 pts</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem' }}>
              <span style={{ color: 'var(--text)' }}>Roglic ficou 12º → apostaste no Top-10, ficou 11-20</span>
              <span style={{ color: 'var(--text-sub)', fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 800 }}>0 pts</span>
            </div>
            <div style={{ borderTop: '1px solid var(--border)', paddingTop: '0.5rem', marginTop: '0.25rem', display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text)' }}>Total (só estes 3)</span>
              <span style={{ color: 'var(--lime)', fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 900, fontSize: '1.1rem' }}>6 pts</span>
            </div>
          </div>
        </div>
      </SECTION>

    </div>
  )
}
