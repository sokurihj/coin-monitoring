// 독립 백그라운드 폴링 프로세스 — 브라우저 없이도 텔레그램 알림 전송
// 실행: npm run notifier

import pLimit from 'p-limit'
import { getTrades, getSwapInstruments } from '../src/lib/okx/public-api'
import { detectWhaleTrades, updateCtValCache } from '../src/lib/whale-detector'
import { hasTelegramConfig, sendTelegramMessage } from '../src/lib/telegram'
import { SWAP_INSTRUMENTS, WHALE_THRESHOLDS } from '../src/lib/constants'
import type { WhaleTradeEvent } from '../src/types/whale'

const POLL_MS = 5_000
const limit = pLimit(5)

// 알림 전송한 tradeId 추적 (메모리 누수 방지용 상한)
const notifiedIds = new Set<string>()
const MAX_NOTIFIED = 2_000

function pruneNotifiedIds() {
  if (notifiedIds.size > MAX_NOTIFIED) {
    const surplus = notifiedIds.size - MAX_NOTIFIED
    let i = 0
    for (const id of notifiedIds) {
      if (i++ >= surplus) break
      notifiedIds.delete(id)
    }
  }
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

async function poll() {
  try {
    const instData = await getSwapInstruments().catch(() => [])
    if (instData.length > 0) updateCtValCache(instData)

    const results = await Promise.all(
      SWAP_INSTRUMENTS.map(instId =>
        limit(async () => {
          const trades = await getTrades(instId, 100).catch(() => [])
          return detectWhaleTrades(trades, instId, WHALE_THRESHOLDS.large)
        })
      )
    )

    const newWhales = results.flat().filter(t => !notifiedIds.has(t.id))

    for (const trade of newWhales) {
      notifiedIds.add(trade.id)
      const usd = Math.round(trade.sizeUsd).toLocaleString('en-US')
      console.log(`[${new Date().toISOString()}] ${trade.tier.toUpperCase()} ${trade.coin} ${trade.side} $${usd}`)
      await sendTelegramMessage(formatMessage(trade)).catch(err =>
        console.error('Telegram 전송 실패:', err.message)
      )
    }

    pruneNotifiedIds()
  } catch (err) {
    console.error(`[${new Date().toISOString()}] 폴링 오류:`, err)
  }
}

async function main() {
  if (!hasTelegramConfig()) {
    console.error('❌ .env.local에 TELEGRAM_BOT_TOKEN과 TELEGRAM_CHAT_ID를 설정해주세요.')
    process.exit(1)
  }

  console.log(`🐋 Whale Notifier 시작`)
  console.log(`   코인: ${SWAP_INSTRUMENTS.join(', ')}`)
  console.log(`   임계값: large $${WHALE_THRESHOLDS.large.toLocaleString()} / mega $${WHALE_THRESHOLDS.mega.toLocaleString()}`)
  console.log(`   폴링: ${POLL_MS / 1000}초 간격\n`)

  await poll()
  setInterval(poll, POLL_MS)
}

main()
