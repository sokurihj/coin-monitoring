import { RawFill, TradingFill, AccountBalance } from '@/types/trading'
import { okxAuthFetch } from './client'

export const getFills = (instId?: string, limit = 50): Promise<RawFill[]> =>
  okxAuthFetch<RawFill>('/api/v5/trade/fills', {
    instType: 'SWAP',
    ...(instId ? { instId } : {}),
    limit: String(limit),
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

export function parseFill(raw: RawFill): TradingFill {
  const coin = raw.instId.split('-')[0]
  return {
    id: raw.tradeId || raw.fillId,
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
