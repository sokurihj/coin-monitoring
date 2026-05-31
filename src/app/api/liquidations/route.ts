import { NextResponse } from 'next/server'
import { getLiquidations, getSwapInstruments } from '@/lib/okx/public-api'
import { CT_VAL_FALLBACK, MONITORED_COINS } from '@/lib/constants'
import { RawInstrument } from '@/types/okx'
import { LiquidationEvent } from '@/types/whale'

export const dynamic = 'force-dynamic'

const MONITORED_SET = new Set(MONITORED_COINS.map(c => `${c}-USDT-SWAP`))

function buildCtValMap(instruments: RawInstrument[]): Map<string, number> {
  const map = new Map<string, number>()
  for (const inst of instruments) {
    if (inst.instType === 'SWAP' && inst.ctValCcy !== 'USD') {
      map.set(inst.instId, Number(inst.ctVal))
    }
  }
  return map
}

export async function GET() {
  try {
    const [rawLiqs, instData] = await Promise.all([
      getLiquidations(50).catch(() => []),
      getSwapInstruments().catch(() => []),
    ])

    const ctValMap = buildCtValMap(instData)
    const events: LiquidationEvent[] = []

    for (const group of rawLiqs) {
      for (const detail of group.details ?? []) {
        if (!MONITORED_SET.has(detail.instId)) continue

        const coin = detail.instId.replace('-USDT-SWAP', '')
        const ctVal = ctValMap.get(detail.instId) ?? CT_VAL_FALLBACK[detail.instId] ?? 1
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
          id: `${detail.instId}-${detail.ts}`,
          coin,
          instId: detail.instId,
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
