'use client'
import { useWhaleStore } from '@/store/whaleStore'
import { useFrequencyStore } from '@/store/frequencyStore'
import { MONITORED_COINS } from '@/lib/constants'

const TABS = ['ALL', ...MONITORED_COINS]

export function CoinTabBar() {
  const { selectedCoin, setSelectedCoin } = useWhaleStore()
  const spikes = useFrequencyStore(s => s.spikes)

  return (
    <div
      className="flex items-center gap-1 px-4 h-9 border-b shrink-0 overflow-x-auto"
      style={{ background: 'var(--bg-panel)', borderColor: 'var(--border)' }}
    >
      {TABS.map(coin => {
        const active = selectedCoin === coin
        const isSpike = coin !== 'ALL' && spikes[coin]
        return (
          <button
            key={coin}
            onClick={() => setSelectedCoin(coin)}
            className="flex items-center gap-1 px-3 py-1 text-xs font-mono rounded shrink-0 transition-colors"
            style={{
              background: active ? 'var(--buy)' : 'transparent',
              color: active ? '#000' : 'var(--text-muted)',
              fontWeight: active ? 700 : 400,
            }}
          >
            {coin}
            {isSpike && <span className="text-[10px] leading-none">🔥</span>}
          </button>
        )
      })}
    </div>
  )
}
