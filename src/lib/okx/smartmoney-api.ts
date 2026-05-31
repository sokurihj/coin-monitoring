import { RawLeadTrader, RawTopTraderRatio, SmartMoneySignal, SmartMoneyTrader } from '@/types/okx'
import { okxAuthFetch } from './client'

export async function getTopTraderLongShortRatio(instId: string): Promise<RawTopTraderRatio[]> {
  return okxAuthFetch<RawTopTraderRatio>(
    '/api/v5/rubik/stat/contracts/long-short-account-ratio-contract-top-trader',
    { instId, period: '1H' }
  )
}

// 응답: data[0] = { dataVer, ranks: RawLeadTrader[] }
export async function getLeadTraders(): Promise<RawLeadTrader[]> {
  const data = await okxAuthFetch<{ dataVer: string; ranks: RawLeadTrader[] }>(
    '/api/v5/copytrading/public-lead-traders'
  )
  return data[0]?.ranks ?? []
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
    id: raw.uniqueCode,
    nickName: raw.nickName,
    profit: parseFloat(raw.pnl),
    profitRate: parseFloat(raw.pnlRatio), // 이미 % 단위 (16.04 = 16.04%)
    winRate: parseFloat(raw.winRatio),    // 0~1 범위
    followers: parseInt(raw.copyTraderNum),
    aum: parseFloat(raw.aum),
    portLink: raw.portLink,
  }
}
