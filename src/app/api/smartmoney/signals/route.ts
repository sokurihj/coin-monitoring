import { NextResponse } from 'next/server'
import { hasApiKey } from '@/lib/okx/client'
import { getTopTraderLongShortRatio, parseSignal } from '@/lib/okx/smartmoney-api'
import { MONITORED_COINS } from '@/lib/constants'

export const dynamic = 'force-dynamic'

export async function GET() {
  if (!hasApiKey()) {
    return NextResponse.json({ available: false })
  }

  const results = await Promise.allSettled(
    MONITORED_COINS.map(async (coin) => {
      const ratios = await getTopTraderLongShortRatio(`${coin}-USDT-SWAP`)
      return parseSignal(coin, ratios)
    })
  )

  const signals = results
    .filter(
      (r): r is PromiseFulfilledResult<NonNullable<Awaited<ReturnType<typeof parseSignal>>>> =>
        r.status === 'fulfilled' && r.value !== null
    )
    .map((r) => r.value)

  return NextResponse.json({ available: true, signals })
}
