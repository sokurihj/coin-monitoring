'use client'
import dynamic from 'next/dynamic'
import { useState } from 'react'
import { WhaleFeed } from '@/components/whale/WhaleFeed'

const CandleChart = dynamic(
  () => import('@/components/market/CandleChart').then(m => m.CandleChart),
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

type Tab = 'whale' | 'candle'

const TABS: { key: Tab; label: string }[] = [
  { key: 'whale', label: '고래 피드' },
  { key: 'candle', label: '캔들 차트' },
]

export function LeftPanelTabs() {
  const [activeTab, setActiveTab] = useState<Tab>('whale')

  return (
    <div
      className="flex-1 flex flex-col min-w-0 overflow-hidden"
      style={{ borderRight: '1px solid var(--border)' }}
    >
      {/* 탭 헤더 */}
      <div
        className="flex items-center gap-0 px-2 border-b shrink-0"
        style={{ background: 'var(--bg-panel)', borderColor: 'var(--border)' }}
      >
        {TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className="px-3 py-2 text-xs font-mono border-b-2 transition-colors"
            style={{
              borderColor: activeTab === tab.key ? 'var(--buy)' : 'transparent',
              color: activeTab === tab.key ? 'var(--text-primary)' : 'var(--text-muted)',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* 탭 콘텐츠 — 마운트 유지로 차트 재초기화 방지 */}
      <div className="flex-1 overflow-hidden flex flex-col" style={{ display: activeTab === 'whale' ? 'flex' : 'none' }}>
        <WhaleFeed />
      </div>
      <div className="flex-1 overflow-hidden flex flex-col" style={{ display: activeTab === 'candle' ? 'flex' : 'none' }}>
        <CandleChart />
      </div>
    </div>
  )
}
