import { RawFundingRate, RawInstrument, RawOpenInterest, RawTicker, RawTrade } from '@/types/okx'
import { okxFetch } from './client'

export const getTrades = (instId: string, limit = 100) =>
  okxFetch<RawTrade>('/api/v5/market/trades', { instId, limit: String(limit) })

export const getTicker = (instId: string) =>
  okxFetch<RawTicker>('/api/v5/market/ticker', { instId })

export const getSwapTickers = () =>
  okxFetch<RawTicker>('/api/v5/market/tickers', { instType: 'SWAP' })

export const getOpenInterest = (instId: string) =>
  okxFetch<RawOpenInterest>('/api/v5/public/open-interest', { instType: 'SWAP', instId })

export const getFundingRate = (instId: string) =>
  okxFetch<RawFundingRate>('/api/v5/public/funding-rate', { instId })

export const getSwapInstruments = () =>
  okxFetch<RawInstrument>('/api/v5/public/instruments', { instType: 'SWAP' })
