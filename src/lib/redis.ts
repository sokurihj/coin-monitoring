import { Redis } from '@upstash/redis'
import type { WhaleTradeEvent } from '@/types/whale'

export const hasRedisConfig = () =>
  Boolean(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN)

let _redis: Redis | null = null
function getRedis(): Redis {
  if (!_redis) {
    _redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    })
  }
  return _redis
}

const FEED_KEY = 'whale:feed'
const SEEN_KEY = 'whale:seen'
const MAX_FEED = 1000

export async function getWhaleTradesFromRedis(limit = 200): Promise<WhaleTradeEvent[]> {
  const data = await getRedis().lrange(FEED_KEY, 0, limit - 1)
  return data.map(d => (typeof d === 'string' ? JSON.parse(d) : d)) as WhaleTradeEvent[]
}

export async function saveWhaleTrades(trades: WhaleTradeEvent[]): Promise<void> {
  if (trades.length === 0) return
  const r = getRedis()
  const pipeline = r.pipeline()
  for (const t of trades) pipeline.lpush(FEED_KEY, JSON.stringify(t))
  pipeline.ltrim(FEED_KEY, 0, MAX_FEED - 1)
  await pipeline.exec()
}

export async function filterUnseenTrades(trades: WhaleTradeEvent[]): Promise<WhaleTradeEvent[]> {
  if (trades.length === 0) return []
  const r = getRedis()
  const pipeline = r.pipeline()
  for (const t of trades) pipeline.sismember(SEEN_KEY, t.id)
  const results = await pipeline.exec()
  return trades.filter((_, i) => !results[i])
}

export async function markTradesSeen(trades: WhaleTradeEvent[]): Promise<void> {
  if (trades.length === 0) return
  const r = getRedis()
  const pipeline = r.pipeline()
  for (const t of trades) pipeline.sadd(SEEN_KEY, t.id)
  pipeline.expire(SEEN_KEY, 86400) // 24시간 TTL
  await pipeline.exec()
}

const ICT_SEEN_KEY = 'ict:seen'

export async function filterUnseenSignalKeys(keys: string[]): Promise<string[]> {
  if (keys.length === 0) return []
  const r = getRedis()
  const pipeline = r.pipeline()
  for (const k of keys) pipeline.sismember(ICT_SEEN_KEY, k)
  const results = await pipeline.exec()
  return keys.filter((_, i) => !results[i])
}

export async function markSignalKeysSeen(keys: string[]): Promise<void> {
  if (keys.length === 0) return
  const r = getRedis()
  const pipeline = r.pipeline()
  for (const k of keys) pipeline.sadd(ICT_SEEN_KEY, k)
  pipeline.expire(ICT_SEEN_KEY, 86400) // 24시간 TTL
  await pipeline.exec()
}
