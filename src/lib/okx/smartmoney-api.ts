import { RawLeadTrader, RawTopTraderRatio, SmartMoneySignal, SmartMoneyTrader } from '@/types/okx'
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

export function parseTrader(raw: RawLeadTrader): SmartMoneyTrader {
  return {
    id: raw.authorId,
    nickName: raw.nickName,
    profit: parseFloat(raw.pnl),
    profitRate: parseFloat(raw.pnlRatio),
    winRate: parseFloat(raw.winRate),
    followers: 0,
    aum: parseFloat(raw.asset),
    portLink: raw.portrait,
  }
}
