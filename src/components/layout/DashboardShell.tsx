'use client'
import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import { useWhaleStream } from '@/hooks/useWhaleStream'
import { useCvd } from '@/hooks/useCvd'
import { TopBar } from './TopBar'
import { CoinTabBar } from './CoinTabBar'
import { MarketOverviewStrip } from '../market/MarketOverviewStrip'
import { OIMoversTable } from '../oi/OIMoversTable'
import { CvdChart } from '../market/CvdChart'
import { LeftPanelTabs } from './LeftPanelTabs'
import { WhaleFeed } from '../whale/WhaleFeed'
import { TradingJournal } from '../journal/TradingJournal'

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

type MobileTab = 'whale' | 'chart' | 'market' | 'journal'

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
  { key: 'journal', label: '매매일지' },
]

export function DashboardShell() {
  const { isConnected } = useWhaleStream()
  const [mobileTab, setMobileTab] = useState<MobileTab>('whale')
  const isMobile = useIsMobile()
  useCvd()

  const rightPanelContent = (
    <>
      <OIMoversTable />
      <CvdChart />
    </>
  )
  // 모바일에서도 우측 패널 컨텐츠 동일 사용

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

          {/* 매매일지 */}
          <div
            className="flex flex-col"
            style={{ flex: 1, overflow: 'hidden', display: mobileTab === 'journal' ? 'flex' : 'none' }}
          >
            <TradingJournal />
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
            className="w-72 flex flex-col overflow-hidden shrink-0"
            style={{ background: 'var(--bg-panel)' }}
          >
            <div className="shrink-0 overflow-y-auto">
              <OIMoversTable />
            </div>
            <CvdChart />
          </div>
        </div>
      )}
    </div>
  )
}
