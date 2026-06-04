export interface RawFill {
  fillId: string
  ordId: string
  tradeId: string
  instId: string
  side: 'buy' | 'sell'
  posSide: 'long' | 'short' | 'net'
  fillPx: string
  fillSz: string
  fillPnl: string
  ts: string
  feeCcy: string
  fee: string
}

export interface TradingFill {
  id: string
  ordId: string
  coin: string
  instId: string
  side: 'buy' | 'sell'
  posSide: 'long' | 'short'
  price: number
  size: number
  pnl: number
  ts: number
}

export const TRADE_TAGS = [
  'OB 진입',
  'FVG 반응',
  'BSL 스윕',
  'SSL 스윕',
  'BOS 후 진입',
  'CHoCH 반응',
  '고래 추종',
  '펀딩비 역추세',
  '기타',
] as const

export type TradeTag = typeof TRADE_TAGS[number]
