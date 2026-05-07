import { NextResponse } from 'next/server'

// Endpoint descontinuado.
// Os resultados são geridos exclusivamente através de /api/etapas.
export async function POST() {
  return NextResponse.json(
    { error: 'Endpoint descontinuado. Usa /api/etapas para inserir resultados.' },
    { status: 410 }
  )
}
