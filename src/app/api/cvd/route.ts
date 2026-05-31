import { NextResponse } from 'next/server'
import pLimit from 'p-limit'
import { getSwapInstruments, getTrades } from '@/lib/okx/public-api'
import { CT_VAL_FALLBACK, MONITORED_COINS } from '@/lib/constants'
import { RawInstrument } from '@/types/okx'

export const dynamic = 'force-dynamic'

const limit = pLimit(5)

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
    const instData = await getSwapInstruments().catch(() => [])
    const ctValMap = buildCtValMap(instData)

    const snapshots = await Promise.all(
      MONITORED_COINS.map(coin =>
        limit(async () => {
          const instId = `${coin}-USDT-SWAP`
          const ctVal = ctValMap.get(instId) ?? CT_VAL_FALLBACK[instId] ?? 1
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

    return NextResponse.json({ snapshots, fetchedAt: Date.now() })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
