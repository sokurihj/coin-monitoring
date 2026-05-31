'use client'
import { useWhaleStream } from '@/hooks/useWhaleStream'
import { TopBar } from './TopBar'
import { CoinTabBar } from './CoinTabBar'
import { MarketOverviewStrip } from '../market/MarketOverviewStrip'
import { FundingRateBar } from '../market/FundingRateBar'
import { WhaleFeed } from '../whale/WhaleFeed'
import { OIMoversTable } from '../oi/OIMoversTable'
import { SmartMoneyPanel } from '../smartmoney/SmartMoneyPanel'

export function DashboardShell() {
  const { isConnected } = useWhaleStream()

  return (
    <div className="flex flex-col h-screen overflow-hidden" style={{ background: 'var(--bg-base)' }}>
      <TopBar isConnected={isConnected} />
      <MarketOverviewStrip />
      <CoinTabBar />

      <div className="flex flex-1 overflow-hidden">
        {/* 왼쪽: 고래 피드 */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden" style={{ borderRight: '1px solid var(--border)' }}>
          <WhaleFeed />
        </div>

        {/* 오른쪽: 사이드 패널 */}
        <div
          className="w-64 flex flex-col overflow-y-auto shrink-0"
          style={{ background: 'var(--bg-panel)' }}
        >
          <FundingRateBar />
          <OIMoversTable />
          <SmartMoneyPanel />
        </div>
      </div>
    </div>
  )
}
