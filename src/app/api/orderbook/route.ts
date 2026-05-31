import { NextResponse } from 'next/server'
import pLimit from 'p-limit'
import { getOrderBook } from '@/lib/okx/public-api'
import { MONITORED_COINS } from '@/lib/constants'
import { OrderBookImbalance } from '@/types/whale'

export const dynamic = 'force-dynamic'

const limit = pLimit(5)

export async function GET() {
  try {
    const fetchedAt = Date.now()

    const imbalances = await Promise.all(
      MONITORED_COINS.map(coin =>
        limit(async (): Promise<OrderBookImbalance> => {
          const instId = `${coin}-USDT-SWAP`
          const books = await getOrderBook(instId, 20).catch(() => [])
          const book = books[0]

          if (!book) {
            return { coin, imbalance: 0, totalBid: 0, totalAsk: 0, fetchedAt }
          }

          let totalBid = 0
          let totalAsk = 0
          for (const [, sz] of book.bids) totalBid += Number(sz)
          for (const [, sz] of book.asks) totalAsk += Number(sz)

          const sum = totalBid + totalAsk
          const imbalance = sum === 0 ? 0 : (totalBid - totalAsk) / sum

          return { coin, imbalance, totalBid, totalAsk, fetchedAt }
        })
      )
    )

    return NextResponse.json({ imbalances, fetchedAt })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
