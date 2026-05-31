import { NextResponse } from 'next/server'
import { hasApiKey } from '@/lib/okx/client'

export const dynamic = 'force-dynamic'

export async function GET() {
  if (!hasApiKey()) {
    return NextResponse.json({ available: false })
  }
  return NextResponse.json({ available: true, signals: [] })
}
