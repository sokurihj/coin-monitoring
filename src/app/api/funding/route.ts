import { NextResponse } from 'next/server'
import pLimit from 'p-limit'
import { getFundingRate } from '@/lib/okx/public-api'
import { FundingRateInfo } from '@/types/whale'
import { SWAP_INSTRUMENTS } from '@/lib/constants'


const limit = pLimit(5)

export async function GET() {
  try {
    const rates = await Promise.all(
      SWAP_INSTRUMENTS.map(instId =>
        limit(async (): Promise<FundingRateInfo | null> => {
          const data = await getFundingRate(instId).catch(() => [])
          const r = data[0]
          if (!r) return null
          return {
            instId,
            coin: instId.split('-')[0],
            fundingRate: Number(r.fundingRate),
            nextFundingRate: Number(r.nextFundingRate),
            fundingTime: Number(r.fundingTime),
          }
        })
      )
    )

    return NextResponse.json({ rates: rates.filter(Boolean), fetchedAt: Date.now() }, { headers: { "Cache-Control": "public, s-maxage=8, stale-while-revalidate=20" } })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
