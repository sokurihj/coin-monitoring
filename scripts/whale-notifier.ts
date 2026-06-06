// 독립 백그라운드 폴링 프로세스 — 브라우저 없이도 텔레그램 알림 전송
// 실행: npm run notifier

import pLimit from 'p-limit'
import { getTrades, getSwapInstruments, getCandles } from '../src/lib/okx/public-api'
import { detectWhaleTrades, updateCtValCache } from '../src/lib/whale-detector'
import { hasTelegramConfig, sendTelegramMessage } from '../src/lib/telegram'
import { MONITORED_COINS, SWAP_INSTRUMENTS, WHALE_THRESHOLDS } from '../src/lib/constants'
import { hasRedisConfig, filterUnseenTrades, markTradesSeen, saveWhaleTrades, filterUnseenSignalKeys, markSignalKeysSeen } from '../src/lib/redis'
import { generateICTSignals } from '../src/lib/ict'
import type { WhaleTradeEvent, CandleBar } from '../src/types/whale'

const POLL_MS = 5_000
const limit = pLimit(5)

const MAX_RUNTIME_MS = process.env.MAX_RUNTIME_MS ? Number(process.env.MAX_RUNTIME_MS) : null
const startedAt = Date.now()

const ICT_TIMEFRAMES = ['15m', '1H', '4H']
const BAR_SIZE_MS: Record<string, number> = {
  '15m': 15 * 60 * 1000,
  '1H': 60 * 60 * 1000,
  '4H': 4 * 60 * 60 * 1000,
}

// Redis 없을 때 fallback용 메모리 seen
const notifiedIds = new Set<string>()
const notifiedSignalKeys = new Set<string>()
const MAX_NOTIFIED = 2_000

function pruneSet(set: Set<string>) {
  if (set.size > MAX_NOTIFIED) {
    const surplus = set.size - MAX_NOTIFIED
    let i = 0
    for (const id of set) {
      if (i++ >= surplus) break
      set.delete(id)
    }
  }
}

function formatICTSignal(coin: string, bar: string, signal: { type: 'BUY' | 'SELL'; strength: 'strong' | 'medium'; price: number; ts: number; reasons: string[] }): string {
  const emoji = signal.type === 'BUY' ? '📈🟢' : '📉🔴'
  const strengthLabel = signal.strength === 'strong' ? 'STRONG' : 'MEDIUM'
  const price = signal.price.toLocaleString('en-US', { maximumFractionDigits: 2 })
  const timeStr = new Date(signal.ts).toLocaleString('ko-KR', {
    timeZone: 'Asia/Seoul',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })

  return `${emoji} <b>[ICT ${signal.type} · ${strengthLabel}] ${coin} ${bar}</b>

💰 Price: $${price}
🎯 ${signal.reasons.join(', ')}
⏰ ${timeStr} KST`
}

function formatMessage(trade: WhaleTradeEvent): string {
  const tierEmoji = trade.tier === 'mega' ? '🚨🐋' : '🐋'
  const tierLabel = trade.tier === 'mega' ? 'MEGA' : 'LARGE'
  const sideEmoji = trade.side === 'buy' ? '🟢' : '🔴'
  const sideLabel = trade.side === 'buy' ? 'LONG' : 'SHORT'
  const usd = Math.round(trade.sizeUsd).toLocaleString('en-US')
  const price = trade.price.toLocaleString('en-US', { maximumFractionDigits: 2 })
  const timeStr = new Date(trade.timestamp).toLocaleString('ko-KR', {
    timeZone: 'Asia/Seoul',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  })

  return `${tierEmoji} <b>[${tierLabel}] ${trade.coin} ${sideEmoji} ${sideLabel}</b>

💵 $${usd}
💰 Price: $${price}
⏰ ${timeStr} KST`
}

const useRedis = hasRedisConfig()

async function getNewWhales(candidates: WhaleTradeEvent[]): Promise<WhaleTradeEvent[]> {
  if (useRedis) {
    return filterUnseenTrades(candidates)
  }
  return candidates.filter(t => !notifiedIds.has(t.id))
}

async function markSeen(trades: WhaleTradeEvent[]) {
  if (useRedis) {
    await markTradesSeen(trades)
  } else {
    trades.forEach(t => notifiedIds.add(t.id))
    pruneSet(notifiedIds)
  }
}

async function checkICTSignals() {
  try {
    const tasks = MONITORED_COINS.flatMap(coin =>
      ICT_TIMEFRAMES.map(bar =>
        limit(async () => {
          const instId = `${coin}-USDT-SWAP`
          const raw = await getCandles(instId, bar, 100).catch(() => [])
          const bars: CandleBar[] = raw
            .map(c => ({
              ts: Number(c[0]),
              open: Number(c[1]),
              high: Number(c[2]),
              low: Number(c[3]),
              close: Number(c[4]),
              vol: Number(c[5]),
            }))
            .sort((a, b) => a.ts - b.ts)

          const barMs = BAR_SIZE_MS[bar] ?? 60 * 60 * 1000
          const cutoff = Date.now() - 3 * barMs
          const signals = generateICTSignals(bars).filter(s => s.ts >= cutoff)
          return signals.map(s => ({ coin, bar, signal: s, key: `ict:${coin}:${bar}:${s.ts}:${s.type}` }))
        })
      )
    )

    const results = (await Promise.all(tasks)).flat()
    if (results.length === 0) return

    const allKeys = results.map(r => r.key)
    const unseenKeys = useRedis
      ? await filterUnseenSignalKeys(allKeys)
      : allKeys.filter(k => !notifiedSignalKeys.has(k))

    if (unseenKeys.length === 0) return

    const unseenSet = new Set(unseenKeys)
    const toSend = results.filter(r => unseenSet.has(r.key))

    if (useRedis) {
      await markSignalKeysSeen(unseenKeys)
    } else {
      unseenKeys.forEach(k => notifiedSignalKeys.add(k))
      pruneSet(notifiedSignalKeys)
    }

    for (const { coin, bar, signal } of toSend) {
      console.log(`[${new Date().toISOString()}] ICT ${signal.type} ${signal.strength.toUpperCase()} ${coin} ${bar} reasons: ${signal.reasons.join(',')}`)
      if (hasTelegramConfig()) {
        await sendTelegramMessage(formatICTSignal(coin, bar, signal)).catch(err =>
          console.error('Telegram ICT 전송 실패:', err.message)
        )
      }
    }
  } catch (err) {
    console.error(`[${new Date().toISOString()}] ICT 체크 오류:`, err)
  }
}

async function poll() {
  try {
    const instData = await getSwapInstruments().catch(() => [])
    if (instData.length > 0) updateCtValCache(instData)

    const results = await Promise.all(
      SWAP_INSTRUMENTS.map(instId =>
        limit(async () => {
          const trades = await getTrades(instId, 500).catch(() => [])
          return detectWhaleTrades(trades, instId, WHALE_THRESHOLDS.mega)
        })
      )
    )

    const candidates = results.flat()
    const newWhales = await getNewWhales(candidates)

    if (newWhales.length > 0) {
      await markSeen(newWhales)

      // Redis에 저장 (대시보드 피드용)
      if (useRedis) {
        await saveWhaleTrades(newWhales).catch(err =>
          console.error('Redis 저장 실패:', err.message)
        )
      }

      for (const trade of newWhales) {
        const usd = Math.round(trade.sizeUsd).toLocaleString('en-US')
        console.log(`[${new Date().toISOString()}] ${trade.tier.toUpperCase()} ${trade.coin} ${trade.side} $${usd}`)
        if (hasTelegramConfig()) {
          await sendTelegramMessage(formatMessage(trade)).catch(err =>
            console.error('Telegram 전송 실패:', err.message)
          )
        }
      }
    }

    if (MAX_RUNTIME_MS && Date.now() - startedAt >= MAX_RUNTIME_MS) {
      console.log(`[${new Date().toISOString()}] 최대 실행 시간 도달, 종료합니다.`)
      process.exit(0)
    }
  } catch (err) {
    console.error(`[${new Date().toISOString()}] 폴링 오류:`, err)
  }
}

async function main() {
  if (!hasTelegramConfig() && !useRedis) {
    console.error('❌ 텔레그램 또는 Redis 중 하나 이상 설정이 필요합니다.')
    process.exit(1)
  }

  console.log(`🐋 Whale Notifier 시작`)
  console.log(`   코인: ${SWAP_INSTRUMENTS.join(', ')}`)
  console.log(`   임계값: large $${WHALE_THRESHOLDS.large.toLocaleString()} / mega $${WHALE_THRESHOLDS.mega.toLocaleString()}`)
  console.log(`   폴링: ${POLL_MS / 1000}초 간격`)
  console.log(`   Redis: ${useRedis ? '✅' : '❌'} | Telegram: ${hasTelegramConfig() ? '✅' : '❌'}\n`)

  await poll()
  setInterval(poll, POLL_MS)

  await checkICTSignals()
  setInterval(checkICTSignals, 60_000)
}

main()
