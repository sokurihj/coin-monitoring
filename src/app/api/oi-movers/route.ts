import { NextRequest, NextResponse } from 'next/server'
import pLimit from 'p-limit'
import { getFundingRate, getOpenInterest, getTicker } from '@/lib/okx/public-api'
import { OIMover } from '@/types/whale'
import { SWAP_INSTRUMENTS } from '@/lib/constants'

export const dynamic = 'force-dynamic'

const limit = pLimit(5)

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl
    const minOiUsd = Number(searchParams.get('minOiUsd') ?? 0)

    const movers = await Promise.all(
      SWAP_INSTRUMENTS.map(instId =>
        limit(async (): Promise<OIMover | null> => {
          const [oiData, tickerData, fundingData] = await Promise.all([
            getOpenInterest(instId).catch(() => []),
            getTicker(instId).catch(() => []),
            getFundingRate(instId).catch(() => []),
          ])

          const oi = oiData[0]
          const ticker = tickerData[0]
          const funding = fundingData[0]
          if (!oi || !ticker) return null

          const price = Number(ticker.last)
          const oiVal = Number(oi.oiCcy)
          const oiUsd = oiVal * price
          if (oiUsd < minOiUsd) return null

          const open24h = Number(ticker.open24h || ticker.sodUtc0)
          const changePct = open24h ? (price - open24h) / open24h : 0

          return {
            instId,
            coin: instId.split('-')[0],
            oi: Number(oi.oi),
            oiUsd,
            oiDeltaPct: changePct,
            fundingRate: Number(funding?.fundingRate ?? 0),
            price,
            vol24h: Number(ticker.volCcy24h),
          }
        })
      )
    )

    const valid = movers
      .filter((m): m is OIMover => m !== null)
      .sort((a, b) => Math.abs(b.oiDeltaPct) - Math.abs(a.oiDeltaPct))

    return NextResponse.json({ movers: valid, fetchedAt: Date.now() })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
