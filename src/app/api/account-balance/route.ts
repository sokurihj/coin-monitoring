import { NextResponse } from 'next/server'
import { getAccountBalance } from '@/lib/okx/trading-api'
import { hasApiKey } from '@/lib/okx/client'

export const dynamic = 'force-dynamic'

export async function GET() {
  if (!hasApiKey()) {
    return NextResponse.json({ available: false })
  }

  try {
    const balance = await getAccountBalance()
    return NextResponse.json({ available: true, balance })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
