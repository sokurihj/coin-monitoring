import { NextResponse } from 'next/server'
import { hasApiKey } from '@/lib/okx/client'
import { getLeadTraders, getTraderPositions, parseTrader } from '@/lib/okx/smartmoney-api'

export const dynamic = 'force-dynamic'

export async function GET() {
  if (!hasApiKey()) {
    return NextResponse.json({ available: false })
  }

  try {
    const raw = await getLeadTraders()
    const top5 = raw.slice(0, 5)

    const positionResults = await Promise.allSettled(
      top5.map(t => getTraderPositions(t.authorId))
    )

    const traders = top5.map((t, i) => {
      const positions = positionResults[i].status === 'fulfilled' ? positionResults[i].value : []
      return parseTrader(t, positions)
    })

    return NextResponse.json({ available: true, traders })
  } catch {
    return NextResponse.json({ available: true, traders: [] })
  }
}
