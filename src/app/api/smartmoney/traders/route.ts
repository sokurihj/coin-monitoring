import { NextResponse } from 'next/server'
import { hasApiKey } from '@/lib/okx/client'

export const dynamic = 'force-dynamic'

export async function GET() {
  if (!hasApiKey()) {
    return NextResponse.json({ available: false })
  }
  // API 키 연동 시 실제 smartmoney API 호출 구현
  return NextResponse.json({ available: true, traders: [] })
}
