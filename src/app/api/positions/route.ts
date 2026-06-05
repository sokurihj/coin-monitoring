import { NextResponse } from 'next/server'
import { getPositions } from '@/lib/okx/trading-api'
import { hasApiKey } from '@/lib/okx/client'

export const dynamic = 'force-dynamic'

export async function GET() {
  if (!hasApiKey()) {
    return NextResponse.json({ available: false })
  }

  try {
    const positions = await getPositions()
    return NextResponse.json({ available: true, positions })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
