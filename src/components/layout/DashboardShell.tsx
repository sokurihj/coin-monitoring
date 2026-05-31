'use client'
import { useWhaleStream } from '@/hooks/useWhaleStream'
import { useCvd } from '@/hooks/useCvd'
import { useLiquidations } from '@/hooks/useLiquidations'
import { TopBar } from './TopBar'
import { CoinTabBar } from './CoinTabBar'
import { MarketOverviewStrip } from '../market/MarketOverviewStrip'
import { FundingRateBar } from '../market/FundingRateBar'
import { OIMoversTable } from '../oi/OIMoversTable'
import { SmartMoneyPanel } from '../smartmoney/SmartMoneyPanel'
import { CvdChart } from '../market/CvdChart'
import { OrderBookImbalanceBar } from '../market/OrderBookImbalanceBar'
import { LiquidationFeed } from '../market/LiquidationFeed'
import { LeftPanelTabs } from './LeftPanelTabs'

export function DashboardShell() {
  const { isConnected } = useWhaleStream()
  useCvd()
  useLiquidations()

  return (
    <div className="flex flex-col h-screen overflow-hidden" style={{ background: 'var(--bg-base)' }}>
      <TopBar isConnected={isConnected} />
      <MarketOverviewStrip />
      <CoinTabBar />

      <div className="flex flex-1 overflow-hidden">
        {/* 왼쪽: 탭 패널 (고래 피드 / 캔들 차트) */}
        <LeftPanelTabs />

        {/* 오른쪽: 사이드 패널 */}
        <div
          className="w-72 flex flex-col overflow-y-auto shrink-0"
          style={{ background: 'var(--bg-panel)' }}
        >
          <FundingRateBar />
          <OIMoversTable />
          <SmartMoneyPanel />
          <OrderBookImbalanceBar />
          <LiquidationFeed />
          <CvdChart />
        </div>
      </div>
    </div>
  )
}
