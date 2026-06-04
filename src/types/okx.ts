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

// orbit/public/position-current 응답 필드
export interface RawTraderPosition {
  instId: string
  instType: string
  posSide: 'long' | 'short' | 'net'
  avgPx: string       // 평균 진입가
  lever: string       // 레버리지
  notionalUsd: string // 포지션 USD 가치
  upl: string         // 미실현 손익
  last: string        // 현재가
  direction: 'long' | 'short'
}

// 가공된 포지션 (프론트 표시용)
export interface TraderPosition {
  instId: string
  coin: string
  direction: 'long' | 'short'
  avgPx: number
  lever: number
  notionalUsd: number
  upl: number
  liqPxEst: number    // 추정 청산가 (OB 공개 API 미제공, 로컬 계산)
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
  positions: TraderPosition[]
}

// 청산 주문 개별 상세 (details[] 내부 — instId는 상위 그룹에만 존재)
export interface RawLiquidationDetail {
  posSide: 'long' | 'short' | 'net'
  side: 'buy' | 'sell'
  bkPx: string      // 파산 가격
  sz: string        // 계약 수
  bkLoss: string    // 손실 USD
  ts: string
}

// 청산 주문 그룹 (uly 기준)
export interface RawLiquidation {
  instId: string    // e.g. BTC-USDT-SWAP
  instType: string
  uly: string
  instFamily: string
  details: RawLiquidationDetail[]
}

// 캔들: [ts, open, high, low, close, vol, volCcy, volCcyQuote, confirm]
export type RawCandle = [string, string, string, string, string, string, string, string, string]
