import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Regras & Pontuação | VeloApostas',
  description: 'Como funciona o sistema de apostas e pontuação do VeloApostas',
}

const Row = ({ label, value, sub }: { label: string; value: string; sub?: string }) => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderRadius: 10, background: '#FCFBF7', border: '1px solid #ECE8DE', gap: 16 }}>
    <div>
      <p style={{ font: "500 14px 'Archivo', sans-serif", color: '#16140F', margin: 0 }}>{label}</p>
      {sub && <p style={{ font: "400 12px 'Archivo', sans-serif", color: '#A79F8E', margin: '3px 0 0' }}>{sub}</p>}
    </div>
    <span style={{ font: `${value === '0 pts' ? '600' : '800'} 18px 'Archivo', sans-serif`, color: value === '0 pts' ? '#B3AC9B' : '#16140F', flexShrink: 0, letterSpacing: '-0.01em' }}>
      {value}
    </span>
  </div>
)

export default function RegrasPage() {
  return (
    <div style={{ maxWidth: 680, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* Header */}
      <div style={{ padding: '20px 0 8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
          <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#E0451F', display: 'inline-block' }} />
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, fontWeight: 600, letterSpacing: '0.16em', textTransform: 'uppercase', color: '#A79F8E' }}>
            Como funciona
          </span>
        </div>
        <h1 style={{ font: "800 36px 'Archivo', sans-serif", letterSpacing: '-0.02em', color: '#16140F', margin: 0 }}>
          Regras & Pontuação
        </h1>
        <p style={{ font: "500 14px 'Archivo', sans-serif", color: '#857E6F', margin: '8px 0 0', lineHeight: 1.6 }}>
          Antes de cada prova, aposta na classificação dos ciclistas. Quando os resultados saem, os teus pontos são calculados automaticamente.
        </p>
      </div>

      {/* Como apostar */}
      <section style={{ background: '#fff', border: '1px solid #E9E4D9', borderRadius: 16, padding: 22 }}>
        <h2 style={{ font: "700 16px 'Archivo', sans-serif", color: '#16140F', margin: '0 0 16px' }}>Como Apostar</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[
            { n: '1', t: 'Escolhe uma prova', d: 'Seleciona qualquer prova futura antes da data de início.' },
            { n: '2', t: 'Ordena os ciclistas', d: 'Escolhe os ciclistas que achas que vão ficar no Top-20 (ou Top-10 nos monumentos), pela ordem que acreditas.' },
            { n: '3', t: 'Confirma a aposta', d: 'Podes editar até à prova começar. Depois disso, fica bloqueada.' },
            { n: '4', t: 'Acompanha ao vivo', d: 'Após cada etapa, os pontos são atualizados automaticamente.' },
          ].map(({ n, t, d }) => (
            <div key={n} style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
              <div style={{ width: 28, height: 28, borderRadius: '50%', flexShrink: 0, background: '#F4F0E6', border: '1px solid #E2DCCF', display: 'flex', alignItems: 'center', justifyContent: 'center', font: "700 13px 'JetBrains Mono', monospace", color: '#16140F' }}>
                {n}
              </div>
              <div>
                <p style={{ font: "600 14px 'Archivo', sans-serif", color: '#16140F', margin: 0 }}>{t}</p>
                <p style={{ font: "400 13px 'Archivo', sans-serif", color: '#857E6F', margin: '3px 0 0' }}>{d}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Grande Volta */}
      <section style={{ background: '#fff', border: '1px solid #E9E4D9', borderRadius: 16, padding: 22 }}>
        <h2 style={{ font: "700 16px 'Archivo', sans-serif", color: '#16140F', margin: '0 0 4px' }}>🏔️ Grande Volta & 📅 Prova da Semana</h2>
        <p style={{ font: "400 13px 'Archivo', sans-serif", color: '#857E6F', margin: '0 0 14px' }}>
          Apostas no <strong style={{ color: '#16140F' }}>Top-20</strong> da classificação geral. Inclui camisolas especiais.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <Row label="Apostado no Top-10 → está no Top-10 real" value="3 pts" />
          <Row label="Apostado no 11-20 → está no 11-20 real" value="2 pts" />
          <Row label="Apostado no 11-20 → entrou no Top-10 real" value="1 pt" sub="Bónus por ter acertado mas o ciclista foi melhor" />
          <Row label="Apostado no Top-10 → ficou no 11-20 real" value="0 pts" sub="Apostaste alto mas o ciclista ficou abaixo" />
          <Row label="Cada camisola acertada" value="1 pt" sub="Sprint, Montanha, Juventude (3 pts máx)" />
        </div>
      </section>

      {/* Monumento */}
      <section style={{ background: '#fff', border: '1px solid #E9E4D9', borderRadius: 16, padding: 22 }}>
        <h2 style={{ font: "700 16px 'Archivo', sans-serif", color: '#16140F', margin: '0 0 4px' }}>🗿 Monumento & ⚡ Prova de um dia</h2>
        <p style={{ font: "400 13px 'Archivo', sans-serif", color: '#857E6F', margin: '0 0 14px' }}>
          Apostas no <strong style={{ color: '#16140F' }}>Top-10</strong> do resultado final. Sem camisolas.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <Row label="Ciclista apostado está no Top-10 real" value="1 pt" />
          <Row label="Posição exata acertada" value="+1 pt" sub="Total de 2 pts por posição exata" />
        </div>
      </section>

      {/* Desempate */}
      <section style={{ background: '#fff', border: '1px solid #E9E4D9', borderRadius: 16, padding: 22 }}>
        <h2 style={{ font: "700 16px 'Archivo', sans-serif", color: '#16140F', margin: '0 0 4px' }}>⚖️ Critérios de Desempate</h2>
        <p style={{ font: "400 13px 'Archivo', sans-serif", color: '#857E6F', margin: '0 0 14px' }}>Em caso de empate em pontos, o ranking usa estes critérios por ordem:</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {['Maior nº de posições exatas (total)', 'Maior nº de posições exatas no Top-10', 'Maior nº de posições exatas no Top-20', 'Maior nº de camisolas acertadas'].map((item, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', background: '#FCFBF7', borderRadius: 9, border: '1px solid #ECE8DE' }}>
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, fontWeight: 700, color: '#A79F8E', width: 16, textAlign: 'center', flexShrink: 0 }}>{i + 1}</span>
              <span style={{ font: "400 13px 'Archivo', sans-serif", color: '#4A463D' }}>{item}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Exemplo */}
      <section style={{ background: '#fff', border: '1px solid #E9E4D9', borderRadius: 16, padding: 22 }}>
        <h2 style={{ font: "700 16px 'Archivo', sans-serif", color: '#16140F', margin: '0 0 4px' }}>💡 Exemplo Prático</h2>
        <p style={{ font: "400 13px 'Archivo', sans-serif", color: '#857E6F', margin: '0 0 14px' }}>
          Apostaste Pogaçar em 1º, Vingegaard em 2º, e Roglic em 5º numa Grande Volta.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {[
            { label: 'Pogaçar ficou 1º → apostaste no Top-10 ✓', pts: '3 pts', ok: true },
            { label: 'Vingegaard ficou 3º → apostaste no Top-10 ✓', pts: '3 pts', ok: true },
            { label: 'Roglic ficou 12º → apostaste Top-10, ficou 11-20', pts: '0 pts', ok: false },
          ].map((r, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: '#FCFBF7', borderRadius: 9, border: '1px solid #ECE8DE' }}>
              <span style={{ font: "400 13px 'Archivo', sans-serif", color: '#4A463D' }}>{r.label}</span>
              <span style={{ font: `800 15px 'Archivo', sans-serif`, color: r.ok ? '#16140F' : '#B3AC9B', flexShrink: 0, marginLeft: 16 }}>{r.pts}</span>
            </div>
          ))}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 14px', background: '#F4F0E6', borderRadius: 9, border: '1px solid #E2DCCF', marginTop: 4 }}>
            <span style={{ font: "600 14px 'Archivo', sans-serif", color: '#16140F' }}>Total (só estes 3)</span>
            <span style={{ font: "800 20px 'Archivo', sans-serif", color: '#16140F', letterSpacing: '-0.02em' }}>6 pts</span>
          </div>
        </div>
      </section>

    </div>
  )
}
