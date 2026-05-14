import { calcularPontos } from '@/lib/pontuacao'
import type { CategoriaProvaTipo } from '@/types'

// ─── Tipos locais ───────────────────────────────────────────
interface ApostaRow {
  user_id: string
  apostas_top20: string[]
  camisola_sprint?: string
  camisola_montanha?: string
  camisola_juventude?: string
  perfil?: { username?: string; full_name?: string; email?: string }
}

interface EtapaRow {
  numero_etapa: number
  data_etapa: string
  classificacao_geral_top20: string[]
  tempos_classificacao?: Record<string, string>
  camisola_sprint?: string
  camisola_montanha?: string
  camisola_juventude?: string
  is_final: boolean
}

interface ProvaInfo {
  nome: string
  categoria?: CategoriaProvaTipo
}

// ─── Calcular pontos só desta etapa (não cumulativos) ───────
function calcularPontosEtapa(aposta: ApostaRow, etapa: EtapaRow, categoria?: CategoriaProvaTipo) {
  return calcularPontos(
    aposta.apostas_top20 ?? [],
    etapa.classificacao_geral_top20 ?? [],
    {
      sprint:    aposta.camisola_sprint ?? '',
      montanha:  aposta.camisola_montanha ?? '',
      juventude: aposta.camisola_juventude ?? '',
    },
    {
      sprint:    etapa.camisola_sprint ?? '',
      montanha:  etapa.camisola_montanha ?? '',
      juventude: etapa.camisola_juventude ?? '',
    },
    categoria
  )
}

// ─── Badge HTML para cada célula ─────────────────────────────
function badge(apPos: number | null, realPos: number | null, pts: number, abandon: boolean): string {
  if (!apPos || apPos >= 100) {
    return abandon
      ? `<span style="color:#9ca3af;text-decoration:line-through;font-size:10px;">${apPos ?? '—'}</span>`
      : `<span style="color:#d1d5db;font-size:10px;">—</span>`
  }
  if (apPos === realPos)
    return `<span style="background:#dcfce7;color:#166534;font-weight:600;border-radius:3px;padding:1px 5px;font-size:10px;">${apPos} ✓</span>`
  if (pts > 0)
    return `<span style="background:#fef9c3;color:#854d0e;border-radius:3px;padding:1px 5px;font-size:10px;">${apPos}</span>`
  return `<span style="background:#fee2e2;color:#991b1b;border-radius:3px;padding:1px 5px;font-size:10px;">${apPos}</span>`
}

function ptsCell(pts: number): string {
  if (!pts) return `<span style="color:#d1d5db;">0</span>`
  return `<span style="font-weight:600;color:#111;">+${pts}</span>`
}

function camBadge(ok: boolean, pts: number): string {
  if (ok)
    return `<span style="background:#dcfce7;color:#166534;font-weight:600;border-radius:3px;padding:2px 7px;font-size:10px;">✓ +${pts}</span>`
  return `<span style="background:#fee2e2;color:#991b1b;border-radius:3px;padding:2px 7px;font-size:10px;">✗ 0</span>`
}

// ─── Nome a exibir ───────────────────────────────────────────
function nomeJogador(a: ApostaRow): string {
  return a.perfil?.username ?? a.perfil?.full_name ?? a.user_id.slice(0, 8)
}

// ─── Template HTML do email ──────────────────────────────────
function buildEmailHtml(
  prova: ProvaInfo,
  etapa: EtapaRow,
  apostas: ApostaRow[],       // exactamente 3, ordenadas por pts desc
  pontosEtapa: ReturnType<typeof calcularPontosEtapa>[],
  appUrl: string
): string {
  const medals = ['🥇', '🥈', '🥉']
  const cardColors = [
    { border: '#f59e0b', bg: '#fffbeb', text: '#92400e' },
    { border: '#9ca3af', bg: '#f9fafb', text: '#374151' },
    { border: '#b45309', bg: '#fff7ed', text: '#7c2d12' },
  ]

  const dataFmt = new Date(etapa.data_etapa + 'T12:00:00Z').toLocaleDateString('pt-PT', {
    weekday: 'short', day: 'numeric', month: 'long',
  })

  // ── Cards de topo ─────────────────────────────────────────
  const cardsHtml = apostas.map((a, i) => {
    const pts = pontosEtapa[i].pontos_total
    const c = cardColors[i]
    return `
      <td style="width:33%;padding:0 4px;vertical-align:top;">
        <div style="border:1px solid ${c.border};border-radius:10px;padding:12px 14px;background:${c.bg};">
          <div style="font-size:18px;margin-bottom:4px;">${medals[i]}</div>
          <div style="font-size:12px;font-weight:600;color:#111;margin-bottom:5px;">${nomeJogador(a)}</div>
          <div style="font-size:22px;font-weight:700;color:#111;">${pts} pts</div>
          <div style="font-size:10px;color:#6b7280;margin-top:2px;">hoje</div>
        </div>
      </td>`
  }).join('')

  // ── Cabeçalhos de colunas por jogador ───────────────────────
  const colHeaders = apostas.map((a, i) => `
    <th colspan="4" style="padding:8px 6px;background:${cardColors[i].bg};border-bottom:2px solid ${cardColors[i].border};
        border-left:2px solid #f3f4f6;font-size:11px;font-weight:600;color:${cardColors[i].text};text-align:left;">
      ${medals[i]} ${nomeJogador(a)}
    </th>`).join('<th style="width:6px;background:#f9fafb;border:none;padding:0;"></th>')

  const subHeaders = apostas.map(() => `
    <th style="border-left:2px solid #f3f4f6;width:28px;padding:3px 4px;font-size:9px;color:#9ca3af;font-weight:400;text-align:center;">AP.</th>
    <th style="width:28px;padding:3px 4px;font-size:9px;color:#9ca3af;font-weight:400;text-align:center;">REAL</th>
    <th style="padding:3px 4px;font-size:9px;color:#9ca3af;font-weight:400;text-align:left;min-width:90px;">CICLISTA</th>
    <th style="width:28px;padding:3px 4px;font-size:9px;color:#9ca3af;font-weight:400;text-align:center;">PTS</th>`
  ).join('<th style="width:6px;background:#f9fafb;padding:0;"></th>')

  // ── Linhas de ciclistas ─────────────────────────────────────
  // Construir mapa de posição real para cada ciclista
  const realPosMap = new Map<string, number>()
  etapa.classificacao_geral_top20.forEach((nome, i) => {
    if (nome?.trim()) realPosMap.set(nome.trim().toLowerCase(), i + 1)
  })

  // Todos os ciclistas apostados (união dos 3)
  const todosCiclistas = new Set<string>()
  apostas.forEach(a => (a.apostas_top20 ?? []).forEach(c => { if (c?.trim()) todosCiclistas.add(c.trim()) }))
  etapa.classificacao_geral_top20.forEach(c => { if (c?.trim()) todosCiclistas.add(c.trim()) })

  // Ordenar: primeiro os que estão no top-20 real (por posição), depois os outros
  const sorted = Array.from(todosCiclistas).sort((a, b) => {
    const pa = realPosMap.get(a.toLowerCase()) ?? 999
    const pb = realPosMap.get(b.toLowerCase()) ?? 999
    return pa - pb
  })

  const rowsHtml = sorted.slice(0, 20).map((ciclista, rowIdx) => {
    const realPos = realPosMap.get(ciclista.toLowerCase()) ?? null
    const tempo = etapa.tempos_classificacao?.[ciclista] ?? (realPos === 1 ? '—' : realPos ? '+?' : null)
    const abandon = !realPos
    const bg = rowIdx % 2 === 0 ? '#fff' : '#fafafa'

    const cols = apostas.map((aposta, pi) => {
      const apPos = (aposta.apostas_top20 ?? []).findIndex(
        c => c?.trim().toLowerCase() === ciclista.toLowerCase()
      )
      const apostadoNaPos = apPos >= 0 ? apPos + 1 : null

      // Pontos desta linha específica
      const breakdown = pontosEtapa[pi].breakdown
      const item = breakdown.find(b => b.ciclista.toLowerCase() === ciclista.toLowerCase())
      const pts = item?.pontos ?? 0

      return `
        <td style="border-left:2px solid #f3f4f6;text-align:center;padding:4px 3px;background:${bg};">
          ${badge(apostadoNaPos, realPos, pts, abandon)}
        </td>
        <td style="text-align:center;padding:4px 3px;font-size:10px;color:#6b7280;background:${bg};">
          ${realPos ?? (abandon ? '<span style="font-size:9px;color:#d1d5db;">aband.</span>' : '—')}
        </td>
        <td style="padding:4px 6px;font-size:10px;color:#374151;background:${bg};white-space:nowrap;overflow:hidden;max-width:100px;">
          ${ciclista}
        </td>
        <td style="text-align:center;padding:4px 3px;background:${bg};">
          ${ptsCell(pts)}
        </td>`
    }).join(`<td style="width:6px;background:#f0f0f0;padding:0;"></td>`)

    return `<tr>${cols}</tr>`
  }).join('')

  // ── Linha de totais top-20 ──────────────────────────────────
  const totTop20 = apostas.map((_, i) =>
    `<td colspan="3" style="padding:6px 6px;border-left:2px solid #e5e7eb;background:#f9fafb;font-size:11px;color:#6b7280;">
       Top-20
     </td>
     <td style="padding:6px 3px;text-align:center;background:#f9fafb;font-weight:700;font-size:12px;color:#111;">
       +${pontosEtapa[i].pontos_top20 + pontosEtapa[i].pontos_top10}
     </td>`
  ).join('<td style="width:6px;background:#e5e7eb;padding:0;"></td>')

  // ── Camisolas ─────────────────────────────────────────────
  const jerseyDefs = [
    {
      icon: '🟢', label: 'Sprint',
      real: etapa.camisola_sprint ?? '—',
      bets: apostas.map(a => a.camisola_sprint ?? ''),
    },
    {
      icon: '🔴', label: 'Montanha',
      real: etapa.camisola_montanha ?? '—',
      bets: apostas.map(a => a.camisola_montanha ?? ''),
    },
    {
      icon: '⚪', label: 'Juventude',
      real: etapa.camisola_juventude ?? '—',
      bets: apostas.map(a => a.camisola_juventude ?? ''),
    },
  ].filter(j => j.real && j.real !== '—')

  const camPts = apostas.map(() => 0)
  const camRows = jerseyDefs.map((j, ri) => {
    const cells = j.bets.map((bet, pi) => {
      const ok = bet?.trim().toLowerCase() === j.real.trim().toLowerCase()
      if (ok) camPts[pi] += 1
      const bd = ri < jerseyDefs.length - 1 ? 'border-bottom:0.5px solid #f3f4f6;' : ''
      return `<td style="text-align:center;padding:6px 8px;${bd}">${camBadge(ok, ok ? 1 : 0)}</td>`
    }).join('')
    const bd = ri < jerseyDefs.length - 1 ? 'border-bottom:0.5px solid #f3f4f6;' : ''
    return `<tr>
      <td style="padding:6px 16px;font-size:11px;${bd}">${j.icon} ${j.label}</td>
      <td style="padding:6px 10px;font-size:11px;font-weight:500;${bd}">${j.real}</td>
      ${cells}
    </tr>`
  }).join('')

  // ── Linha TOTAL FINAL ──────────────────────────────────────
  const finalCols = apostas.map((_, i) => {
    const total = pontosEtapa[i].pontos_total
    const isFirst = i === 0
    return `<td style="text-align:center;padding:12px 8px;width:90px;">
      <span style="font-size:20px;font-weight:700;color:${isFirst ? '#c8f400' : '#fff'};">${total} pts</span>
    </td>`
  }).join('')

  return `<!DOCTYPE html>
<html lang="pt">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>VeloApostas — ${prova.nome} Etapa ${etapa.numero_etapa}</title>
</head>
<body style="margin:0;padding:20px 10px;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0">
<tr><td align="center">
<table width="640" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb;max-width:640px;width:100%;">

  <!-- HEADER -->
  <tr><td style="background:#0a0a0f;padding:20px 24px;">
    <div style="font-size:14px;font-weight:700;letter-spacing:.04em;color:#fff;margin-bottom:10px;">
      Velo<span style="color:#c8f400;">Apostas</span>
    </div>
    <div style="color:#c8f400;font-size:10px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;margin-bottom:4px;">
      ${prova.nome} — Etapa ${etapa.numero_etapa}${etapa.is_final ? ' (Final)' : ''}
    </div>
    <div style="color:#fff;font-size:18px;font-weight:700;margin-bottom:3px;">Resultados actualizados</div>
    <div style="color:#555;font-size:11px;">${dataFmt}</div>
  </td></tr>

  <!-- CARDS PONTOS DO DIA -->
  <tr><td style="padding:16px 20px;background:#fafafa;border-bottom:1px solid #f3f4f6;">
    <div style="font-size:10px;font-weight:500;text-transform:uppercase;letter-spacing:.08em;color:#6b7280;margin-bottom:10px;">
      Pontos do dia
    </div>
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr>${cardsHtml}</tr>
    </table>
  </td></tr>

  <!-- TABELA DE APOSTAS -->
  <tr><td style="padding:0;">
    <div style="padding:14px 20px 8px;">
      <span style="font-size:10px;font-weight:500;text-transform:uppercase;letter-spacing:.08em;color:#6b7280;">
        Apostas — posição apostada · posição real · pontos
      </span>
    </div>
    <div style="overflow-x:auto;">
      <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;min-width:560px;">
        <thead>
          <tr style="background:#fafafa;">
            ${colHeaders}
          </tr>
          <tr style="background:#fafafa;">
            ${subHeaders}
          </tr>
        </thead>
        <tbody>
          ${rowsHtml}
          <tr>
            ${totTop20}
          </tr>
        </tbody>
      </table>
    </div>
  </td></tr>

  <!-- CAMISOLAS -->
  ${jerseyDefs.length > 0 ? `
  <tr><td style="padding:0;border-top:1px solid #f3f4f6;">
    <div style="padding:12px 20px 6px;">
      <span style="font-size:10px;font-weight:500;text-transform:uppercase;letter-spacing:.08em;color:#6b7280;">Camisolas</span>
    </div>
    <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
      <thead>
        <tr style="background:#fafafa;">
          <th style="padding:6px 16px;font-size:10px;color:#6b7280;font-weight:500;text-align:left;width:100px;">Camisola</th>
          <th style="padding:6px 10px;font-size:10px;color:#6b7280;font-weight:500;text-align:left;">Portador real</th>
          ${apostas.map(a => `<th style="padding:6px 8px;font-size:10px;color:#6b7280;font-weight:500;text-align:center;width:90px;">${nomeJogador(a).split(' ')[0]}</th>`).join('')}
        </tr>
      </thead>
      <tbody>${camRows}</tbody>
    </table>
  </td></tr>` : ''}

  <!-- TOTAL FINAL -->
  <tr><td style="background:#0a0a0f;padding:0;">
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td style="padding:12px 20px;font-size:11px;color:#888;">
          TOTAL DO DIA <span style="color:#555;font-weight:400;font-size:10px;">(Top-20 + Camisolas)</span>
        </td>
        ${finalCols}
      </tr>
    </table>
  </td></tr>

  <!-- LINK -->
  <tr><td style="padding:14px 20px;text-align:center;border-top:1px solid #1a1a2e;">
    <a href="${appUrl}/provas/${apostas[0]?.prova_id ?? ''}"
       style="display:inline-block;background:#c8f400;color:#0a0a0f;padding:10px 24px;border-radius:8px;
              font-weight:700;font-size:13px;text-decoration:none;">
      Ver classificação completa →
    </a>
  </td></tr>

  <!-- FOOTER -->
  <tr><td style="padding:12px 20px;text-align:center;background:#f9fafb;border-top:1px solid #f3f4f6;">
    <span style="font-size:10px;color:#9ca3af;">VeloApostas · Apenas para membros</span>
  </td></tr>

</table>
</td></tr>
</table>
</body>
</html>`
}

// ─── Enviar email via Resend REST API (sem npm install) ──────
export async function sendEmailEtapa(
  prova: ProvaInfo,
  etapa: EtapaRow,
  apostas: ApostaRow[],
  provaId: string
): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY
  const from   = process.env.EMAIL_FROM ?? 'onboarding@resend.dev'
  const tos    = [
    process.env.EMAIL_TO_1,
    process.env.EMAIL_TO_2,
    process.env.EMAIL_TO_3,
  ].filter(Boolean) as string[]

  if (!apiKey || tos.length === 0) {
    console.warn('[sendEmailEtapa] RESEND_API_KEY ou EMAIL_TO_* não configurados — email ignorado.')
    return
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://veloapostas.com'

  // Calcular pontos desta etapa para cada apostador
  const pontosEtapa = apostas.map(a => calcularPontosEtapa(a, etapa, prova.categoria))

  // Ordenar por pontos desc e associar prova_id
  const withPts = apostas.map((a, i) => ({ aposta: { ...a, prova_id: provaId }, pts: pontosEtapa[i] }))
  withPts.sort((a, b) => b.pts.pontos_total - a.pts.pontos_total)
  const sortedApostas = withPts.map(x => x.aposta)
  const sortedPts     = withPts.map(x => x.pts)

  const html = buildEmailHtml(prova, etapa, sortedApostas, sortedPts, appUrl)

  const subject = etapa.is_final
    ? `🏁 ${prova.nome} — Classificação Final`
    : `⚡ ${prova.nome} — Etapa ${etapa.numero_etapa} concluída`

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from, to: tos, subject, html }),
  })

  if (!res.ok) {
    const err = await res.text()
    console.error('[sendEmailEtapa] Resend error:', err)
  } else {
    console.log(`[sendEmailEtapa] Email enviado para etapa ${etapa.numero_etapa}`)
  }
}
