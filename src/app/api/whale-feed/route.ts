import { NextRequest, NextResponse } from 'next/server'
import pLimit from 'p-limit'
import { getTrades } from '@/lib/okx/public-api'
import { detectWhaleTrades, ensureCtValCache } from '@/lib/whale-detector'
import { SWAP_INSTRUMENTS, WHALE_THRESHOLDS } from '@/lib/constants'
import { hasRedisConfig, getWhaleTradesFromRedis } from '@/lib/redis'

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
    await ensureCtValCache()

    // OKX 실시간 조회
    const results = await Promise.all(
      instruments.map(instId =>
        limit(async () => {
          const trades = await getTrades(instId, 100).catch(() => [])
          return detectWhaleTrades(trades, instId, minUsd)
        })
      )
    )
    const live = results.flat()

    // Redis 저장 데이터 합산 (설정된 경우)
    const stored = hasRedisConfig()
      ? await getWhaleTradesFromRedis(200).catch(() => [])
      : []

    // 중복 제거 후 정렬
    const seenIds = new Set<string>()
    const all: typeof live = []
    for (const t of [...live, ...stored]) {
      if (!seenIds.has(t.id)) {
        seenIds.add(t.id)
        all.push(t)
      }
    }

    const sorted = all
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 200)

    return NextResponse.json({ trades: sorted, fetchedAt: Date.now() })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
