'use client'
import { useQuery } from '@tanstack/react-query'
import { SmartMoneySignal, SmartMoneyTrader } from '@/types/okx'

function SignalRow({ signal }: { signal: SmartMoneySignal }) {
  const longPct = Math.round(signal.longRatio * 100)
  const shortPct = 100 - longPct
  const bullish = longPct >= 50

  return (
    <div className="mb-2">
      <div className="flex justify-between items-center mb-0.5">
        <span className="text-xs font-mono" style={{ color: 'var(--text-primary)' }}>
          {signal.coin}
        </span>
        <span
          className="text-xs font-bold"
          style={{ color: bullish ? 'var(--color-buy)' : 'var(--color-sell)' }}
        >
          {bullish ? '롱' : '숏'} {bullish ? longPct : shortPct}%
        </span>
      </div>
      <div className="h-1.5 rounded overflow-hidden flex" style={{ background: 'var(--bg-row-hover)' }}>
        <div
          className="h-full transition-all duration-500"
          style={{ width: `${longPct}%`, background: 'var(--color-buy)' }}
        />
        <div
          className="h-full transition-all duration-500"
          style={{ width: `${shortPct}%`, background: 'var(--color-sell)' }}
        />
      </div>
    </div>
  )
}

function TraderRow({ trader }: { trader: SmartMoneyTrader }) {
  const profitStr =
    trader.profit >= 0
      ? `+$${(trader.profit / 1000).toFixed(1)}K`
      : `-$${(Math.abs(trader.profit) / 1000).toFixed(1)}K`

  return (
    <div
      className="flex items-center justify-between py-1.5 px-2 rounded text-xs"
      style={{ background: 'var(--bg-row-hover)' }}
    >
      <div className="truncate max-w-[90px]" style={{ color: 'var(--text-primary)' }}>
        {trader.nickName}
      </div>
      <div className="flex gap-2 shrink-0">
        <span style={{ color: trader.profit >= 0 ? 'var(--color-buy)' : 'var(--color-sell)' }}>
          {profitStr}
        </span>
        <span style={{ color: 'var(--text-muted)' }}>
          {Math.round(trader.winRate * 100)}%
        </span>
      </div>
    </div>
  )
}

export function SmartMoneyPanel() {
  const { data: signalData, isLoading: loadingSignals } = useQuery({
    queryKey: ['smartmoney-signals'],
    queryFn: async () => {
      const res = await fetch('/api/smartmoney/signals')
      return res.json() as Promise<{ available: boolean; signals?: SmartMoneySignal[] }>
    },
    refetchInterval: 60_000,
    staleTime: 55_000,
  })

  const { data: traderData, isLoading: loadingTraders } = useQuery({
    queryKey: ['smartmoney-traders'],
    queryFn: async () => {
      const res = await fetch('/api/smartmoney/traders')
      return res.json() as Promise<{ available: boolean; traders?: SmartMoneyTrader[] }>
    },
    refetchInterval: 120_000,
    staleTime: 115_000,
  })

  if (!signalData?.available && !loadingSignals) {
    return (
      <div className="p-4">
        <div className="text-xs mb-2" style={{ color: 'var(--text-muted)' }}>SMART MONEY</div>
        <div
          className="rounded p-3 text-center"
          style={{ background: 'var(--bg-row-hover)', border: '1px solid var(--border)' }}
        >
          <div className="text-lg mb-2">🔑</div>
          <p className="text-xs font-bold mb-1" style={{ color: 'var(--text-primary)' }}>
            API 키 연결 필요
          </p>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            .env.local에 OKX API 키를 설정하면
          </p>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            스마트머니 시그널을 확인할 수 있습니다
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-3">
      {/* 상단 트레이더 롱/숏 비율 */}
      <div className="mb-3">
        <div className="text-xs mb-2 flex justify-between" style={{ color: 'var(--text-muted)' }}>
          <span>TOP TRADER L/S</span>
          <span style={{ color: 'var(--text-muted)', fontSize: '10px' }}>1H</span>
        </div>
        {loadingSignals ? (
          <div className="text-xs" style={{ color: 'var(--text-muted)' }}>로딩 중...</div>
        ) : (
          signalData?.signals?.map((s) => <SignalRow key={s.coin} signal={s} />)
        )}
      </div>

      {/* 구분선 */}
      <div className="my-3" style={{ borderTop: '1px solid var(--border)' }} />

      {/* 리더 트레이더 목록 */}
      <div>
        <div className="text-xs mb-2" style={{ color: 'var(--text-muted)' }}>
          LEAD TRADERS
        </div>
        {loadingTraders ? (
          <div className="text-xs" style={{ color: 'var(--text-muted)' }}>로딩 중...</div>
        ) : (
          <div className="space-y-1">
            {traderData?.traders?.map((t) => <TraderRow key={t.id} trader={t} />)}
          </div>
        )}
      </div>
    </div>
  )
}
