const OKX_BASE = 'https://www.okx.com'

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
