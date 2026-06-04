import crypto from 'crypto'

const OKX_BASE = 'https://www.okx.com'

function buildAuthHeaders(method: string, requestPath: string) {
  const timestamp = new Date().toISOString()
  const prehash = timestamp + method.toUpperCase() + requestPath
  const sign = crypto
    .createHmac('sha256', process.env.OKX_SECRET_KEY!)
    .update(prehash)
    .digest('base64')
  return {
    'OK-ACCESS-KEY': process.env.OKX_API_KEY!,
    'OK-ACCESS-SIGN': sign,
    'OK-ACCESS-TIMESTAMP': timestamp,
    'OK-ACCESS-PASSPHRASE': process.env.OKX_PASSPHRASE!,
    'Content-Type': 'application/json',
  }
}

export async function okxAuthFetch<T>(path: string, params?: Record<string, string>): Promise<T[]> {
  const url = new URL(`${OKX_BASE}${path}`)
  if (params) {
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v))
  }
  const requestPath = url.pathname + url.search
  const res = await fetch(url.toString(), {
    cache: 'no-store',
    headers: buildAuthHeaders('GET', requestPath),
  })
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`OKX API error: ${res.status} ${path} — ${body}`)
  }
  const json = await res.json()
  if (json.code !== '0') throw new Error(`OKX error ${json.code}: ${json.msg}`)
  return json.data as T[]
}

export async function okxFetch<T>(path: string, params?: Record<string, string>): Promise<T[]> {
  const url = new URL(`${OKX_BASE}${path}`)
  if (params) {
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v))
  }

  const res = await fetch(url.toString(), { cache: 'no-store' })
  if (!res.ok) throw new Error(`OKX API error: ${res.status} ${path}`)

  const json = await res.json()
  if (json.code !== '0') throw new Error(`OKX error ${json.code}: ${json.msg}`)

  return json.data as T[]
}

export const hasApiKey = () =>
  Boolean(process.env.OKX_API_KEY && process.env.OKX_SECRET_KEY && process.env.OKX_PASSPHRASE)
