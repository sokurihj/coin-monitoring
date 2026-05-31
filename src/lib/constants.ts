export const MONITORED_COINS = ['BTC', 'ETH', 'SOL', 'BNB', 'XRP', 'DOGE', 'ADA', 'AVAX', 'LINK', 'DOT']

export const SWAP_INSTRUMENTS = MONITORED_COINS.map(c => `${c}-USDT-SWAP`)

// OKX SWAP 개별 체결은 보통 $20K~$50K 수준
// 집계(aggregation) 없이 단건 기준 임계값
export const WHALE_THRESHOLDS = {
  mega: Number(process.env.WHALE_MEGA_USD ?? 500_000),
  large: Number(process.env.WHALE_LARGE_USD ?? 100_000),
  medium: Number(process.env.WHALE_MEDIUM_USD ?? 20_000),
}

// OKX SWAP 계약 1단위의 기초자산 수량 (ctVal)
// 실제 값은 instruments API에서 받아오며, 이 맵은 fallback용
export const CT_VAL_FALLBACK: Record<string, number> = {
  'BTC-USDT-SWAP': 0.01,
  'ETH-USDT-SWAP': 0.1,
  'SOL-USDT-SWAP': 1,
  'BNB-USDT-SWAP': 0.1,
  'XRP-USDT-SWAP': 10,
  'DOGE-USDT-SWAP': 100,
  'ADA-USDT-SWAP': 10,
  'AVAX-USDT-SWAP': 0.1,
  'LINK-USDT-SWAP': 1,
  'DOT-USDT-SWAP': 1,
}

export const POLL_INTERVAL = Number(process.env.NEXT_PUBLIC_POLL_INTERVAL ?? 5000)
export const OI_POLL_INTERVAL = 30_000

export const MAX_WHALE_FEED_SIZE = 200
