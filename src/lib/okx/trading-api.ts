import { RawFill, TradingFill, AccountBalance, RawPosition, Position, PendingLimitOrder } from '@/types/trading'
import { okxAuthFetch } from './client'

export const getFills = (instId?: string, limit = 50, after?: string): Promise<RawFill[]> =>
  okxAuthFetch<RawFill>('/api/v5/trade/fills-history', {
    instType: 'SWAP',
    ...(instId ? { instId } : {}),
    limit: String(limit),
    ...(after ? { after } : {}),
  })

interface RawBalanceDetail {
  ccy: string
  eq: string
  availEq: string
  availBal: string
  frozenBal: string
  upl: string
}

interface RawBalance {
  totalEq: string
  // 멀티커런시/포트폴리오 마진 전용 — 일반 계정에서는 빈 문자열
  availEq: string
  imr: string
  mgnRatio: string
  details: RawBalanceDetail[]
}

export async function getAccountBalance(): Promise<AccountBalance> {
  const rows = await okxAuthFetch<RawBalance>('/api/v5/account/balance')
  const raw = rows[0]

  // 상위 필드가 비어있으면 details의 USDT 항목을 사용
  const usdt = raw.details?.find(d => d.ccy === 'USDT')
  const totalEq = parseFloat(raw.totalEq) || 0
  const availEq = parseFloat(raw.availEq) || parseFloat(usdt?.availEq ?? '') || parseFloat(usdt?.availBal ?? '') || 0
  const usedMargin = parseFloat(raw.imr) || parseFloat(usdt?.frozenBal ?? '') || 0
  const unrealizedPnl = parseFloat(usdt?.upl ?? '') || 0

  return { totalEq, availEq, usedMargin, unrealizedPnl }
}

interface RawAlgoOrder {
  instId: string
  posSide: string
  side: string
  ordType: string
  tpTriggerPx: string
  slTriggerPx: string
  state: string
}

export async function getPositions(): Promise<Position[]> {
  // 포지션과 알고 주문을 병렬 조회
  const [posRows, algoRows] = await Promise.all([
    okxAuthFetch<RawPosition>('/api/v5/account/positions'),
    okxAuthFetch<RawAlgoOrder>('/api/v5/trade/orders-algo-pending', { instType: 'SWAP', ordType: 'conditional' })
      .catch(() => [] as RawAlgoOrder[]),
  ])

  // instId별 알고 주문 TP/SL 집계
  const algoMap = new Map<string, { tp: number | null; sl: number[] }>()
  for (const a of algoRows) {
    if (a.state !== 'live' && a.state !== 'partially_effective') continue
    const existing = algoMap.get(a.instId) ?? { tp: null, sl: [] }
    if (!existing.tp && a.tpTriggerPx) existing.tp = parseFloat(a.tpTriggerPx) || null
    const slPx = parseFloat(a.slTriggerPx) || 0
    if (slPx && !existing.sl.includes(slPx)) existing.sl.push(slPx)
    algoMap.set(a.instId, existing)
  }

  return posRows
    .filter(r => parseFloat(r.pos) !== 0)
    .map(r => {
      const coin = r.instId.split('-')[0]
      const posSide = r.posSide === 'net'
        ? (parseFloat(r.pos) > 0 ? 'long' : 'short')
        : r.posSide as 'long' | 'short'
      const algo = algoMap.get(r.instId)
      // 포지션 직접 SL 우선, 없으면 알고 주문 SL 목록 전체 사용
      const directSl = r.slTriggerPx ? parseFloat(r.slTriggerPx) || null : null
      const slTriggerPx = directSl ? [directSl] : (algo?.sl ?? [])
      return {
        instId: r.instId,
        coin,
        posSide,
        avgPx: parseFloat(r.avgPx) || 0,
        tpTriggerPx: (r.tpTriggerPx ? parseFloat(r.tpTriggerPx) || null : null) ?? algo?.tp ?? null,
        slTriggerPx,
        size: Math.abs(parseFloat(r.pos)) || 0,
        lever: parseFloat(r.lever) || 0,
        upl: parseFloat(r.upl) || 0,
        liqPx: r.liqPx ? parseFloat(r.liqPx) || null : null,
      }
    })
}

interface RawPendingOrder {
  instId: string
  px: string
  side: 'buy' | 'sell'
  posSide: 'long' | 'short' | 'net'
  state: string
}

export async function getPendingLimitOrders(): Promise<PendingLimitOrder[]> {
  const rows = await okxAuthFetch<RawPendingOrder>('/api/v5/trade/orders-pending', {
    instType: 'SWAP',
    ordType: 'limit',
  })
  return rows
    .filter(r => r.state === 'live' || r.state === 'partially_filled')
    .map(r => ({
      instId: r.instId,
      coin: r.instId.split('-')[0],
      price: parseFloat(r.px) || 0,
      side: r.side,
      posSide: r.posSide,
    }))
    .filter(r => r.price > 0)
}

export function parseFill(raw: RawFill): TradingFill {
  const coin = raw.instId.split('-')[0]
  return {
    id: raw.tradeId || raw.billId,
    ordId: raw.ordId,
    coin,
    instId: raw.instId,
    side: raw.side,
    posSide: raw.posSide === 'net' ? (raw.side === 'buy' ? 'long' : 'short') : raw.posSide,
    price: parseFloat(raw.fillPx),
    size: parseFloat(raw.fillSz),
    pnl: parseFloat(raw.fillPnl) || 0,
    ts: parseInt(raw.ts),
  }
}
