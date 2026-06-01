import { NextRequest, NextResponse } from 'next/server'
import pLimit from 'p-limit'
import { getSwapInstruments, getTrades } from '@/lib/okx/public-api'
import { detectWhaleTrades, updateCtValCache } from '@/lib/whale-detector'
import { SWAP_INSTRUMENTS, WHALE_THRESHOLDS } from '@/lib/constants'

export const dynamic = 'force-dynamic'

const limit = pLimit(5) // OKX rate limit 방어

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl
    const coins = searchParams.get('coins')
    const minUsd = Number(searchParams.get('minUsd') ?? WHALE_THRESHOLDS.medium)

    const instruments = searchParams.get('coins')
      ? coins!.split(',').map(c => `${c}-USDT-SWAP`)
      : SWAP_INSTRUMENTS

    // ctVal 캐시 갱신 (TTL 내면 no-op)
    const instData = await getSwapInstruments().catch(() => [])
    if (instData.length > 0) updateCtValCache(instData)

    const results = await Promise.all(
      instruments.map(instId =>
        limit(async () => {
          const trades = await getTrades(instId, 500).catch(() => [])
          return detectWhaleTrades(trades, instId, minUsd)
        })
      )
    )

    const all = results
      .flat()
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 100)

    return NextResponse.json({ trades: all, fetchedAt: Date.now() })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
