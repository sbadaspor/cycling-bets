'use client'

import { useEffect, useRef, useState } from 'react'

interface Props {
  gpxUrl: string
  perfilUrl?: string | null
  numeroEtapa: number
  dataEtapa: string
}

interface TrackPoint {
  lat: number
  lon: number
  ele: number
  dist: number // distância acumulada em km
}

function parseGPX(text: string): TrackPoint[] {
  const parser = new DOMParser()
  const doc = parser.parseFromString(text, 'application/xml')
  const pts = doc.querySelectorAll('trkpt')
  const points: TrackPoint[] = []
  let distAcum = 0

  pts.forEach((pt, i) => {
    const lat = parseFloat(pt.getAttribute('lat') ?? '0')
    const lon = parseFloat(pt.getAttribute('lon') ?? '0')
    const ele = parseFloat(pt.querySelector('ele')?.textContent ?? '0')

    if (i > 0) {
      const prev = points[i - 1]
      const R = 6371
      const dLat = (lat - prev.lat) * Math.PI / 180
      const dLon = (lon - prev.lon) * Math.PI / 180
      const a = Math.sin(dLat / 2) ** 2 +
        Math.cos(prev.lat * Math.PI / 180) * Math.cos(lat * Math.PI / 180) * Math.sin(dLon / 2) ** 2
      distAcum += R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    }

    points.push({ lat, lon, ele, dist: distAcum })
  })

  return points
}

// Subsamplar para performance — máx N pontos
function subsample<T>(arr: T[], maxN: number): T[] {
  if (arr.length <= maxN) return arr
  const step = Math.ceil(arr.length / maxN)
  return arr.filter((_, i) => i % step === 0)
}

export default function EtapaMap({ gpxUrl, perfilUrl, numeroEtapa, dataEtapa }: Props) {
  const mapRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState<string | null>(null)
  const [distancia, setDistancia] = useState<number>(0)
  const [desnivelPos, setDesnivelPos] = useState<number>(0)
  const [altMax, setAltMax] = useState<number>(0)
  const [leafletLoaded, setLeafletLoaded] = useState(false)

  useEffect(() => {
    // Carregar Leaflet dinamicamente
    if (typeof window === 'undefined') return
    if ((window as any).L) {
      setLeafletLoaded(true)
      return
    }

    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
    document.head.appendChild(link)

    const script = document.createElement('script')
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
    script.onload = () => setLeafletLoaded(true)
    document.head.appendChild(script)
  }, [])

  useEffect(() => {
    if (!leafletLoaded || !mapRef.current) return

    const L = (window as any).L
    let map: any = null

    async function init() {
      try {
        const res = await fetch(gpxUrl)
        if (!res.ok) throw new Error('Não foi possível carregar o GPX')
        const text = await res.text()
        const points = parseGPX(text)

        if (points.length === 0) throw new Error('GPX sem pontos')

        // Stats
        const dist = points[points.length - 1].dist
        setDistancia(Math.round(dist))

        let dPos = 0
        for (let i = 1; i < points.length; i++) {
          const diff = points[i].ele - points[i - 1].ele
          if (diff > 0) dPos += diff
        }
        setDesnivelPos(Math.round(dPos))
        setAltMax(Math.round(Math.max(...points.map(p => p.ele))))

        // Inicializar mapa
        if (mapRef.current && !mapRef.current.querySelector('.leaflet-container')) {
          map = L.map(mapRef.current, { zoomControl: true, scrollWheelZoom: false })

          L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap',
            maxZoom: 18,
          }).addTo(map)

          // Subsamplar para performance no mapa
          const mapPoints = subsample(points, 800)
          const latlngs = mapPoints.map(p => [p.lat, p.lon])

          L.polyline(latlngs, {
            color: '#c8f400',
            weight: 3,
            opacity: 0.9,
          }).addTo(map)

          // Marcador de início
          const startIcon = L.divIcon({
            html: '<div style="background:#22c55e;width:12px;height:12px;border-radius:50%;border:2px solid white;"></div>',
            iconSize: [12, 12],
            iconAnchor: [6, 6],
            className: '',
          })
          const endIcon = L.divIcon({
            html: '<div style="background:#ef4444;width:14px;height:14px;border-radius:50%;border:2px solid white;display:flex;align-items:center;justify-content:center;font-size:8px;">🏁</div>',
            iconSize: [14, 14],
            iconAnchor: [7, 7],
            className: '',
          })

          L.marker([points[0].lat, points[0].lon], { icon: startIcon })
            .bindTooltip('Partida', { permanent: false })
            .addTo(map)
          L.marker([points[points.length - 1].lat, points[points.length - 1].lon], { icon: endIcon })
            .bindTooltip('Chegada', { permanent: false })
            .addTo(map)

          map.fitBounds(L.polyline(latlngs).getBounds(), { padding: [20, 20] })
        }

        // Perfil de elevação no canvas
        if (canvasRef.current) {
          const canvas = canvasRef.current
          const ctx = canvas.getContext('2d')
          if (!ctx) return

          const elevPoints = subsample(points, 400)
          const W = canvas.offsetWidth || 600
          const H = canvas.offsetHeight || 120
          canvas.width = W
          canvas.height = H

          const minEle = Math.min(...elevPoints.map(p => p.ele))
          const maxEle = Math.max(...elevPoints.map(p => p.ele))
          const eleRange = maxEle - minEle || 1
          const totalDist = elevPoints[elevPoints.length - 1].dist || 1

          const pad = { top: 10, bottom: 24, left: 4, right: 4 }
          const gW = W - pad.left - pad.right
          const gH = H - pad.top - pad.bottom

          const toX = (d: number) => pad.left + (d / totalDist) * gW
          const toY = (e: number) => pad.top + gH - ((e - minEle) / eleRange) * gH

          // Gradiente
          const grad = ctx.createLinearGradient(0, pad.top, 0, H - pad.bottom)
          grad.addColorStop(0, 'rgba(200,244,0,0.5)')
          grad.addColorStop(1, 'rgba(200,244,0,0.03)')

          ctx.beginPath()
          ctx.moveTo(toX(elevPoints[0].dist), toY(elevPoints[0].ele))
          elevPoints.forEach(p => ctx.lineTo(toX(p.dist), toY(p.ele)))
          ctx.lineTo(toX(elevPoints[elevPoints.length - 1].dist), H - pad.bottom)
          ctx.lineTo(toX(elevPoints[0].dist), H - pad.bottom)
          ctx.closePath()
          ctx.fillStyle = grad
          ctx.fill()

          // Linha
          ctx.beginPath()
          ctx.moveTo(toX(elevPoints[0].dist), toY(elevPoints[0].ele))
          elevPoints.forEach(p => ctx.lineTo(toX(p.dist), toY(p.ele)))
          ctx.strokeStyle = '#c8f400'
          ctx.lineWidth = 2
          ctx.stroke()

          // Labels de distância
          ctx.fillStyle = 'rgba(120,120,150,0.9)'
          ctx.font = '10px DM Sans, sans-serif'
          ctx.textAlign = 'center'
          const steps = Math.min(6, Math.floor(totalDist / 20))
          for (let i = 0; i <= steps; i++) {
            const d = (totalDist / steps) * i
            const x = toX(d)
            ctx.fillText(`${Math.round(d)}km`, x, H - 6)
          }

          // Alt máx
          ctx.fillStyle = 'rgba(200,244,0,0.8)'
          ctx.textAlign = 'left'
          ctx.font = '9px DM Sans, sans-serif'
          const peakIdx = elevPoints.indexOf(elevPoints.reduce((a, b) => a.ele > b.ele ? a : b))
          const peakX = toX(elevPoints[peakIdx].dist)
          const peakY = toY(elevPoints[peakIdx].ele)
          ctx.fillText(`${Math.round(maxEle)}m`, Math.min(peakX + 3, W - 40), Math.max(peakY - 4, 14))
        }

        setLoading(false)
      } catch (e) {
        setErro(e instanceof Error ? e.message : 'Erro ao carregar GPX')
        setLoading(false)
      }
    }

    init()

    return () => {
      if (map) map.remove()
    }
  }, [leafletLoaded, gpxUrl])

  if (erro) {
    return (
      <div style={{ padding: '1rem', background: 'rgba(255,68,68,0.08)', border: '1px solid rgba(255,68,68,0.2)', borderRadius: '0.875rem', fontSize: '0.82rem', color: 'var(--red)' }}>
        ⚠️ {erro}
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      {/* Perfil da etapa (imagem do PCS) */}
      {perfilUrl && (
        <div style={{ borderRadius: '0.75rem', overflow: 'hidden', border: '1px solid var(--border)' }}>
          <img
            src={perfilUrl}
            alt={`Perfil Etapa ${numeroEtapa}`}
            style={{ width: '100%', height: 'auto', display: 'block' }}
          />
        </div>
      )}

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem' }}>
        {[
          { label: 'Distância', value: loading ? '—' : `${distancia} km` },
          { label: 'Desnível +', value: loading ? '—' : `${desnivelPos} m` },
          { label: 'Alt. máx.', value: loading ? '—' : `${altMax} m` },
        ].map(s => (
          <div key={s.label} style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: '0.625rem', padding: '0.625rem', textAlign: 'center' }}>
            <p style={{ fontSize: '0.62rem', color: 'var(--text-sub)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.2rem' }}>{s.label}</p>
            <p style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: '1.1rem', fontWeight: 800, color: 'var(--lime)' }}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Mapa */}
      {loading && (
        <div style={{ height: 220, background: 'var(--surface-2)', borderRadius: '0.875rem', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--border)' }}>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-sub)' }}>A carregar percurso...</p>
        </div>
      )}
      <div
        ref={mapRef}
        style={{
          height: 220, borderRadius: '0.875rem', overflow: 'hidden',
          border: '1px solid var(--border)',
          display: loading ? 'none' : 'block',
        }}
      />

      {/* Perfil de elevação */}
      {!loading && (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '0.875rem', padding: '0.75rem 0.75rem 0.25rem', overflow: 'hidden' }}>
          <p style={{ fontSize: '0.62rem', color: 'var(--text-sub)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.4rem' }}>Perfil de elevação</p>
          <canvas
            ref={canvasRef}
            style={{ width: '100%', height: 120, display: 'block' }}
          />
        </div>
      )}
    </div>
  )
}
