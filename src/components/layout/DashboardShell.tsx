'use client'
import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
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
import { WhaleFeed } from '../whale/WhaleFeed'

const CandleChart = dynamic(
  () => import('../market/CandleChart').then(m => m.CandleChart),
  {
    ssr: false,
    loading: () => (
      <div className="flex-1 flex items-center justify-center" style={{ background: 'var(--bg-base)' }}>
        <span className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>
          차트 초기화 중...
        </span>
      </div>
    ),
  },
)

type MobileTab = 'whale' | 'chart' | 'market'

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false)
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])
  return isMobile
}

const MOBILE_TABS: { key: MobileTab; label: string }[] = [
  { key: 'whale', label: '고래 피드' },
  { key: 'chart', label: '캔들 차트' },
  { key: 'market', label: '마켓 데이터' },
]

export function DashboardShell() {
  const { isConnected } = useWhaleStream()
  const [mobileTab, setMobileTab] = useState<MobileTab>('whale')
  const isMobile = useIsMobile()
  useCvd()
  useLiquidations()

  const rightPanelContent = (
    <>
      <FundingRateBar />
      <OIMoversTable />
      <SmartMoneyPanel />
      <OrderBookImbalanceBar />
      <LiquidationFeed />
      <CvdChart />
    </>
  )

  return (
    <div className="flex flex-col overflow-hidden" style={{ height: '100dvh', background: 'var(--bg-base)' }}>
      <TopBar isConnected={isConnected} />
      <MarketOverviewStrip />
      <CoinTabBar />

      {isMobile ? (
        // 모바일: 하단 탭 네비게이션
        <div className="flex flex-col flex-1 overflow-hidden">
          {/* 고래 피드 */}
          <div
            className="flex flex-col"
            style={{ flex: 1, overflow: 'hidden', display: mobileTab === 'whale' ? 'flex' : 'none' }}
          >
            <WhaleFeed />
          </div>

          {/* 캔들 차트 */}
          <div
            className="flex flex-col"
            style={{ flex: 1, overflow: 'hidden', display: mobileTab === 'chart' ? 'flex' : 'none' }}
          >
            <CandleChart />
          </div>

          {/* 마켓 데이터 */}
          <div
            style={{
              flex: 1,
              overflowY: 'auto',
              display: mobileTab === 'market' ? 'block' : 'none',
              background: 'var(--bg-panel)',
            }}
          >
            {rightPanelContent}
          </div>

          {/* 하단 탭 바 */}
          <div
            className="shrink-0 flex border-t"
            style={{ background: 'var(--bg-panel)', borderColor: 'var(--border)' }}
          >
            {MOBILE_TABS.map(tab => (
              <button
                key={tab.key}
                onClick={() => setMobileTab(tab.key)}
                className="flex-1 py-3 text-xs font-mono border-t-2 transition-colors"
                style={{
                  borderColor: mobileTab === tab.key ? 'var(--buy)' : 'transparent',
                  color: mobileTab === tab.key ? 'var(--text-primary)' : 'var(--text-muted)',
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      ) : (
        // 데스크탑: 기존 좌우 패널 레이아웃
        <div className="flex flex-1 overflow-hidden">
          <LeftPanelTabs />
          <div
            className="w-72 flex flex-col overflow-y-auto shrink-0"
            style={{ background: 'var(--bg-panel)' }}
          >
            {rightPanelContent}
          </div>
        </div>
      )}
    </div>
  )
}
