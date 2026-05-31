import { NextResponse } from 'next/server'
import { hasApiKey } from '@/lib/okx/client'
import { getLeadTraders, parseTrader } from '@/lib/okx/smartmoney-api'

export const dynamic = 'force-dynamic'

export async function GET() {
  if (!hasApiKey()) {
    return NextResponse.json({ available: false })
  }

  const raw = await getLeadTraders()
  const traders = raw.slice(0, 5).map(parseTrader)

  return NextResponse.json({ available: true, traders })
}
