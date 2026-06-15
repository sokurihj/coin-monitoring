import { NextResponse } from 'next/server'
import { getLiquidations } from '@/lib/okx/public-api'
import { MONITORED_COINS } from '@/lib/constants'
import { LiquidationEvent } from '@/types/whale'
import { ensureCtValCache, getCtVal } from '@/lib/whale-detector'

export const dynamic = 'force-dynamic'

const MONITORED_SET = new Set(MONITORED_COINS.map(c => `${c}-USDT-SWAP`))

const ULY_LIST = MONITORED_COINS.map(c => `${c}-USDT`)

export async function GET() {
  try {
    const [liqResults] = await Promise.all([
      Promise.all(ULY_LIST.map(uly => getLiquidations(uly, 20).catch(() => []))),
      ensureCtValCache(),
    ])
    const rawLiqs = liqResults.flat()
    const events: LiquidationEvent[] = []

    for (const group of rawLiqs) {
      const instId = group.instId
      if (!instId || !MONITORED_SET.has(instId)) continue

      const coin = instId.replace('-USDT-SWAP', '')
      const ctVal = getCtVal(instId)

      for (const detail of group.details ?? []) {
        const price = Number(detail.bkPx)
        const sizeUsd = Number(detail.sz) * ctVal * price

        // posSide가 net인 경우 side로 판단 (sell=long liq, buy=short liq)
        let posSide: 'long' | 'short'
        if (detail.posSide === 'net') {
          posSide = detail.side === 'sell' ? 'long' : 'short'
        } else {
          posSide = detail.posSide as 'long' | 'short'
        }

        events.push({
          id: `${instId}-${detail.ts}-${detail.bkPx}-${detail.sz}`,
          coin,
          instId,
          posSide,
          sizeUsd,
          price,
          timestamp: Number(detail.ts),
        })
      }
    }

    events.sort((a, b) => b.timestamp - a.timestamp)

    return NextResponse.json({ events, fetchedAt: Date.now() })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
