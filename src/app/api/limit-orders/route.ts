import { NextResponse } from 'next/server'
import { getPendingLimitOrders } from '@/lib/okx/trading-api'
import { hasApiKey } from '@/lib/okx/client'

export const dynamic = 'force-dynamic'

export async function GET() {
  if (!hasApiKey()) {
    return NextResponse.json({ available: false })
  }

  try {
    const orders = await getPendingLimitOrders()
    return NextResponse.json({ available: true, orders })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
