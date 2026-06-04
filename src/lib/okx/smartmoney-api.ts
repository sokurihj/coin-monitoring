import { RawLeadTrader, RawTopTraderRatio, RawTraderPosition, SmartMoneySignal, SmartMoneyTrader, TraderPosition } from '@/types/okx'
import { okxAuthFetch } from './client'

export async function getTopTraderLongShortRatio(instId: string): Promise<RawTopTraderRatio[]> {
  return okxAuthFetch<RawTopTraderRatio>(
    '/api/v5/rubik/stat/contracts/long-short-account-ratio-contract-top-trader',
    { instId, period: '1H' }
  )
}

export async function getLeadTraders(): Promise<RawLeadTrader[]> {
  return okxAuthFetch<RawLeadTrader>(
    '/api/v5/orbit/public/leaderboard',
    { sortBy: 'pnl', period: '90', limit: '5' }
  )
}

export async function getTraderPositions(authorId: string): Promise<RawTraderPosition[]> {
  return okxAuthFetch<RawTraderPosition>(
    '/api/v5/orbit/public/position-current',
    { authorId }
  )
}

export function parseSignal(coin: string, ratios: RawTopTraderRatio[]): SmartMoneySignal | null {
  if (!ratios.length) return null
  const [ts, rawRatio] = ratios[0] // 가장 최신 데이터
  const ratio = parseFloat(rawRatio)
  if (isNaN(ratio)) return null
  const longRatio = ratio / (1 + ratio)
  return {
    coin,
    longRatio,
    shortRatio: 1 - longRatio,
    ratio,
    ts: parseInt(ts),
  }
}

// OKX USDT 마진 격리 기준 근사 청산가 (유지증거금율 0.4%)
function estimateLiqPx(avgPx: number, lever: number, direction: 'long' | 'short'): number {
  const mmr = 0.004
  if (direction === 'long') return avgPx * (1 - 1 / lever + mmr)
  return avgPx * (1 + 1 / lever - mmr)
}

export function parsePosition(raw: RawTraderPosition): TraderPosition {
  const avgPx = parseFloat(raw.avgPx)
  const lever = parseFloat(raw.lever)
  const direction = raw.direction ?? (raw.posSide === 'long' ? 'long' : 'short')
  const coin = raw.instId.split('-')[0]
  return {
    instId: raw.instId,
    coin,
    direction,
    avgPx,
    lever,
    notionalUsd: parseFloat(raw.notionalUsd),
    upl: parseFloat(raw.upl),
    liqPxEst: estimateLiqPx(avgPx, lever, direction),
  }
}

export function parseTrader(raw: RawLeadTrader, positions: RawTraderPosition[] = []): SmartMoneyTrader {
  return {
    id: raw.authorId,
    nickName: raw.nickName,
    profit: parseFloat(raw.pnl),
    profitRate: parseFloat(raw.pnlRatio),
    winRate: parseFloat(raw.winRate),
    followers: 0,
    aum: parseFloat(raw.asset),
    portLink: raw.portrait,
    positions: positions.map(parsePosition),
  }
}
