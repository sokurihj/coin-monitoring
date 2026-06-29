import { NextResponse } from 'next/server'
import pLimit from 'p-limit'
import { getTrades } from '@/lib/okx/public-api'
import { MONITORED_COINS } from '@/lib/constants'
import { ensureCtValCache, getCtVal } from '@/lib/whale-detector'


const limit = pLimit(5)

export async function GET() {
  try {
    await ensureCtValCache()

    const snapshots = await Promise.all(
      MONITORED_COINS.map(coin =>
        limit(async () => {
          const instId = `${coin}-USDT-SWAP`
          const ctVal = getCtVal(instId)
          const trades = await getTrades(instId, 100).catch(() => [])

          let delta = 0
          for (const t of trades) {
            const usd = Number(t.px) * Number(t.sz) * ctVal
            delta += t.side === 'buy' ? usd : -usd
          }

          return { coin, delta, fetchedAt: Date.now() }
        })
      )
    )

    return NextResponse.json({ snapshots, fetchedAt: Date.now() }, { headers: { "Cache-Control": "public, s-maxage=4, stale-while-revalidate=10" } })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
