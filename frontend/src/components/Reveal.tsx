import { useEffect, useRef, useState, type ElementType, type ReactNode } from 'react'

/**
 * Tasteful entrance animation — fades + slides up by 12px when the element
 * enters the viewport. Plays once per element. Respects prefers-reduced-motion
 * via the .reveal styles in index.css.
 */
export function Reveal({
  children,
  delay = 0,
  as: As = 'div' as ElementType,
  className = '',
  threshold = 0.05,
  rootMargin = '-40px 0px',
}: {
  children: ReactNode
  delay?: number
  as?: ElementType
  className?: string
  threshold?: number
  rootMargin?: string
}) {
  const ref = useRef<HTMLElement | null>(null)
  const [shown, setShown] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el || shown) return
    if (typeof IntersectionObserver === 'undefined') { setShown(true); return }
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShown(true)
          io.disconnect()
        }
      },
      { threshold, rootMargin },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [shown, threshold, rootMargin])

  return (
    <As
      ref={ref}
      className={`reveal ${shown ? 'is-in' : ''} ${className}`}
      style={{ transitionDelay: shown && delay ? `${delay}ms` : undefined }}
    >
      {children}
    </As>
  )
}
