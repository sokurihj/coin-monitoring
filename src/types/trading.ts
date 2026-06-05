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

export interface AccountBalance {
  totalEq: number
  availEq: number
  usedMargin: number
  unrealizedPnl: number
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

export const TP_TAGS = [
  'OB 도달',
  'FVG 도달',
  '유동성 스윕',
  '목표가 도달',
  '저항/지지 도달',
  '고래 반전 신호',
  '부분 익절',
  '기타',
] as const

export const SL_TAGS = [
  'OB 이탈',
  'FVG 미반응',
  '구조 붕괴',
  '손절가 도달',
  '고래 반전 신호',
  '부분 손절',
  '기타',
] as const

export type TradeTag = typeof TRADE_TAGS[number]
export type TpTag = typeof TP_TAGS[number]
export type SlTag = typeof SL_TAGS[number]
