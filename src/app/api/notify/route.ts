import { NextResponse } from 'next/server'
import { sendNotificationsToAll } from '@/lib/sendNotifications'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get('x-admin-key')
    if (authHeader !== process.env.ADMIN_NOTIFY_KEY) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const { title, body, url, user_ids } = await request.json()

    const result = await sendNotificationsToAll(title, body, url, user_ids)

    return NextResponse.json(result)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erro desconhecido'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
