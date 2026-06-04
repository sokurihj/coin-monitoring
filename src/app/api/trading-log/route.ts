import { NextRequest, NextResponse } from 'next/server'
import { getFills, parseFill } from '@/lib/okx/trading-api'
import { hasApiKey } from '@/lib/okx/client'
import { MONITORED_COINS } from '@/lib/constants'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  if (!hasApiKey()) {
    return NextResponse.json({ available: false, fills: [] })
  }

  const { searchParams } = req.nextUrl
  const coin = searchParams.get('coin')
  const limitParam = Math.min(parseInt(searchParams.get('limit') ?? '50'), 100)

  try {
    const instId = coin && MONITORED_COINS.includes(coin) ? `${coin}-USDT-SWAP` : undefined
    const rawFills = await getFills(instId, limitParam)
    const fills = rawFills.map(parseFill).sort((a, b) => b.ts - a.ts)

    return NextResponse.json({ available: true, fills, fetchedAt: Date.now() })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
