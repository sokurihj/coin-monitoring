export interface OKXResponse<T> {
  code: string
  msg: string
  data: T[]
}

export interface RawTrade {
  tradeId: string
  instId: string
  px: string
  sz: string
  side: 'buy' | 'sell'
  ts: string
}

export interface RawTicker {
  instId: string
  last: string
  lastSz: string
  askPx: string
  askSz: string
  bidPx: string
  bidSz: string
  open24h: string
  high24h: string
  low24h: string
  vol24h: string
  volCcy24h: string
  ts: string
  sodUtc0: string
  sodUtc8: string
}

export interface RawOpenInterest {
  instId: string
  instType: string
  oi: string
  oiCcy: string
  ts: string
}

export interface RawFundingRate {
  instId: string
  instType: string
  fundingRate: string
  nextFundingRate: string
  fundingTime: string
  nextFundingTime: string
  minFundingRate: string
  maxFundingRate: string
  settFundingRate: string
  method: string
  ts: string
}

export interface RawInstrument {
  instId: string
  instType: string
  uly: string
  instFamily: string
  baseCcy: string
  quoteCcy: string
  settleCcy: string
  ctVal: string
  ctMult: string
  ctValCcy: string
  optType: string
  stk: string
  listTime: string
  expTime: string
  lever: string
  tickSz: string
  lotSz: string
  minSz: string
  ctType: string
  alias: string
  state: string
  maxLmtSz: string
  maxMktSz: string
  maxTwapSz: string
  maxIcebergSz: string
  maxTriggerSz: string
  maxStopSz: string
}

// orbit/public/leaderboard 응답 필드
export interface RawLeadTrader {
  authorId: string
  portrait: string
  nickName: string
  pnl: string        // 절대 USD PnL
  pnlRatio: string   // 수익률 (소수, 0.3385 = 33.85%)
  winRate: string    // 승률 (0~1)
  asset: string      // AUM USD
}

// rubik/stat/contracts/long-short-account-ratio-contract-top-trader 응답
// data는 [timestamp, ratio] 튜플 배열
export type RawTopTraderRatio = [string, string]

// 가공된 SmartMoney 신호 (프론트 표시용)
export interface SmartMoneySignal {
  coin: string
  longRatio: number   // 0~1
  shortRatio: number  // 0~1
  ratio: number       // longShortAcctRatio
  ts: number
}

// 가공된 트레이더 정보 (프론트 표시용)
export interface SmartMoneyTrader {
  id: string
  nickName: string
  profit: number
  profitRate: number
  winRate: number
  followers: number
  aum: number
  portLink: string
}
