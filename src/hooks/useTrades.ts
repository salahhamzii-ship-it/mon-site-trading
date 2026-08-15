import { useState, useEffect, useCallback } from 'react'
import type { Trade } from '../types'

const STORAGE_KEY = 'nq_trades'

export function useTrades() {
  const [trades, setTrades] = useState<Trade[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      return stored ? JSON.parse(stored) : []
    } catch {
      return []
    }
  })

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trades))
  }, [trades])

  const addTrade = useCallback((trade: Trade) => {
    setTrades((prev) => [trade, ...prev])
  }, [])

  const updateTrade = useCallback((id: string, updates: Partial<Trade>) => {
    setTrades((prev) => prev.map((t) => (t.id === id ? { ...t, ...updates } : t)))
  }, [])

  const deleteTrade = useCallback((id: string) => {
    setTrades((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const getTradesByDate = useCallback(
    (date: string) => trades.filter((t) => t.date.startsWith(date)),
    [trades]
  )

  return { trades, addTrade, updateTrade, deleteTrade, getTradesByDate }
}
