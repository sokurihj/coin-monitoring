import { RawInstrument, RawTrade } from '@/types/okx'
import { WhaleTier, WhaleTradeEvent } from '@/types/whale'
import { CT_VAL_FALLBACK, WHALE_THRESHOLDS } from './constants'

// instruments API 결과를 인메모리 캐시 (서버 프로세스 수명 동안 유지)
let ctValCache: Map<string, number> | null = null
let ctValCachedAt = 0
const CT_VAL_TTL = 60 * 60 * 1000 // 1시간

export function updateCtValCache(instruments: RawInstrument[]) {
  const now = Date.now()
  if (ctValCache && now - ctValCachedAt < CT_VAL_TTL) return

  ctValCache = new Map()
  for (const inst of instruments) {
    if (inst.instType === 'SWAP' && inst.ctValCcy !== 'USD') {
      ctValCache.set(inst.instId, Number(inst.ctVal))
    }
  }
  ctValCachedAt = now
}

function getCtVal(instId: string): number {
  return ctValCache?.get(instId) ?? CT_VAL_FALLBACK[instId] ?? 1
}

function getTier(sizeUsd: number): WhaleTier | null {
  if (sizeUsd >= WHALE_THRESHOLDS.mega) return 'mega'
  if (sizeUsd >= WHALE_THRESHOLDS.large) return 'large'
  if (sizeUsd >= WHALE_THRESHOLDS.medium) return 'medium'
  return null
}

export function detectWhaleTrades(
  trades: RawTrade[],
  instId: string,
  minUsd: number = WHALE_THRESHOLDS.medium
): WhaleTradeEvent[] {
  const ctVal = getCtVal(instId)
  const coin = instId.split('-')[0]
  const results: WhaleTradeEvent[] = []

  for (const t of trades) {
    const price = Number(t.px)
    const size = Number(t.sz)
    const sizeUsd = size * ctVal * price
    if (sizeUsd < minUsd) continue

    const tier = getTier(sizeUsd)
    if (!tier) continue

    results.push({
      id: t.tradeId,
      coin,
      instId,
      price,
      size,
      sizeUsd,
      side: t.side,
      timestamp: Number(t.ts),
      tier,
    })
  }

  return results
}
