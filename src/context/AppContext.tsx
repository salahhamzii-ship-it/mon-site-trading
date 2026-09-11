import { createContext, useContext, useState, useEffect, useRef, type ReactNode } from 'react'

type Theme = 'dark' | 'light'

export interface BridgeInstrument {
  last?: string | number
  lastUpdate?: string
  j1_settle?: string | number
  j1_high?: string | number
  j1_low?: string | number
  [key: string]: unknown
}

export interface BridgeData {
  NQ?: BridgeInstrument
  ES?: BridgeInstrument
  GC?: BridgeInstrument
  CL?: BridgeInstrument
  _fetchedAt?: string
  error?: string
}

interface AppContextType {
  theme: Theme
  toggleTheme: () => void
  sidebarOpen: boolean
  setSidebarOpen: (open: boolean) => void
  bridge: BridgeData
  bridgeOnline: boolean
  bridgeLastFetch: Date | null
}

const AppContext = createContext<AppContextType | null>(null)

const POLL_MS = 10_000

export function AppProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>('dark')
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [bridge, setBridge] = useState<BridgeData>({})
  const [bridgeOnline, setBridgeOnline] = useState(false)
  const [bridgeLastFetch, setBridgeLastFetch] = useState<Date | null>(null)
  const activeRef = useRef(true)

  useEffect(() => {
    activeRef.current = true
    const poll = async () => {
      try {
        const r = await fetch('/api/bridge-data', { cache: 'no-store' })
        if (r.ok) {
          const d: BridgeData = await r.json()
          if (activeRef.current && !d.error) {
            setBridge(d)
            setBridgeOnline(true)
            setBridgeLastFetch(new Date())
          }
        } else {
          if (activeRef.current) setBridgeOnline(false)
        }
      } catch {
        if (activeRef.current) setBridgeOnline(false)
      }
      if (activeRef.current) setTimeout(poll, POLL_MS)
    }
    poll()
    return () => { activeRef.current = false }
  }, [])

  const toggleTheme = () => {
    setTheme((t) => {
      const next = t === 'dark' ? 'light' : 'dark'
      document.documentElement.classList.toggle('dark', next === 'dark')
      return next
    })
  }

  return (
    <AppContext.Provider value={{ theme, toggleTheme, sidebarOpen, setSidebarOpen, bridge, bridgeOnline, bridgeLastFetch }}>
      {children}
    </AppContext.Provider>
  )
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used within AppProvider')
  return ctx
}
