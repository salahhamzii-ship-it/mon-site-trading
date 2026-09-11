import { useLocation } from 'react-router-dom'
import { useRef, useEffect, type ReactNode } from 'react'

export function PageTransition({ children }: { children: ReactNode }) {
  const { pathname } = useLocation()
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    el.classList.remove('page-enter')
    void el.offsetWidth // reflow pour reset animation
    el.classList.add('page-enter')
  }, [pathname])

  return (
    <div ref={ref} style={{ width: '100%' }}>
      {children}
    </div>
  )
}
