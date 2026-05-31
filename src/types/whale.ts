export type WhaleTier = 'mega' | 'large' | 'medium'

export interface WhaleTradeEvent {
  id: string
  coin: string
  instId: string
  price: number
  size: number
  sizeUsd: number
  side: 'buy' | 'sell'
  timestamp: number
  tier: WhaleTier
}

export interface OIMover {
  instId: string
  coin: string
  oi: number
  oiUsd: number
  oiDeltaPct: number
  fundingRate: number
  price: number
  vol24h: number
}

export interface FundingRateInfo {
  instId: string
  coin: string
  fundingRate: number
  nextFundingRate: number
  fundingTime: number
}

export interface TickerInfo {
  instId: string
  coin: string
  price: number
  change24h: number
  changePct24h: number
  vol24h: number
}

export interface CvdSnapshot {
  coin: string
  delta: number       // 이번 폴링 주기의 buyUsd − sellUsd
  fetchedAt: number
}

export interface LiquidationEvent {
  id: string           // `${instId}-${ts}` 중복 제거용
  coin: string
  instId: string
  posSide: 'long' | 'short'
  sizeUsd: number
  price: number
  timestamp: number
}

export interface OrderBookImbalance {
  coin: string
  imbalance: number    // (totalBid − totalAsk) / (totalBid + totalAsk) ∈ [−1, +1]
  totalBid: number
  totalAsk: number
  fetchedAt: number
}

export interface CandleBar {
  ts: number
  open: number
  high: number
  low: number
  close: number
  vol: number
}

export interface AlertSettings {
  enabled: boolean
  soundEnabled: boolean
  megaThresholdUsd: number
  largeThresholdUsd: number
  mediumThresholdUsd: number
  enabledCoins: string[]
  fundingRateAlert: number
  oiDeltaAlert: number
}
