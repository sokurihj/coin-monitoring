'use client'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { AlertSettings } from '@/types/whale'
import { MONITORED_COINS, WHALE_THRESHOLDS } from '@/lib/constants'

interface AlertStore extends AlertSettings {
  update: (partial: Partial<AlertSettings>) => void
}

export const useAlertStore = create<AlertStore>()(
  persist(
    (set) => ({
      enabled: true,
      soundEnabled: false,
      megaThresholdUsd: WHALE_THRESHOLDS.mega,
      largeThresholdUsd: WHALE_THRESHOLDS.large,
      mediumThresholdUsd: WHALE_THRESHOLDS.medium,
      enabledCoins: [...MONITORED_COINS],
      fundingRateAlert: 0.0005,
      oiDeltaAlert: 0.05,
      update: (partial) => set(partial),
    }),
    { name: 'whale-alert-settings' }
  )
)
