'use client'
import { useEffect, useState } from 'react'

export function TopBar({ isConnected }: { isConnected: boolean }) {
  const [time, setTime] = useState('')

  useEffect(() => {
    const tick = () => setTime(new Date().toLocaleTimeString('ko-KR', { timeZone: 'Asia/Seoul', hour12: false }) + ' KST')
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [])

  return (
    <div
      className="flex items-center justify-between px-4 h-10 border-b shrink-0"
      style={{ background: 'var(--bg-panel)', borderColor: 'var(--border)' }}
    >
      <div className="flex items-center gap-3">
        <span className="text-sm font-bold tracking-widest" style={{ color: 'var(--buy)', fontFamily: 'var(--font-mono)' }}>
          WHALE RADAR
        </span>
        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
          실시간 고래 포지션 추적
        </span>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1.5">
          <span
            className="w-1.5 h-1.5 rounded-full"
            style={{ background: isConnected ? 'var(--buy)' : 'var(--sell)', boxShadow: isConnected ? '0 0 4px var(--buy)' : 'none' }}
          />
          <span className="text-xs font-mono" style={{ color: isConnected ? 'var(--buy)' : 'var(--sell)' }}>
            {isConnected ? 'LIVE' : 'DISCONNECTED'}
          </span>
        </div>
        <span className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>
          {time}
        </span>
      </div>
    </div>
  )
}
