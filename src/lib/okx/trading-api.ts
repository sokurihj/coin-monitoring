import { RawFill, TradingFill } from '@/types/trading'
import { okxAuthFetch } from './client'

export const getFills = (instId?: string, limit = 50): Promise<RawFill[]> =>
  okxAuthFetch<RawFill>('/api/v5/trade/fills', {
    instType: 'SWAP',
    ...(instId ? { instId } : {}),
    limit: String(limit),
  })

export function parseFill(raw: RawFill): TradingFill {
  const coin = raw.instId.split('-')[0]
  return {
    id: raw.fillId,
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
