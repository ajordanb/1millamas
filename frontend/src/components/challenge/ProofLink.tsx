import { useState, type ReactNode } from 'react'

/**
 * Opens a donation screenshot in a new tab by resolving a short-lived signed URL
 * on click. Opens the blank tab synchronously (so it isn't popup-blocked), then
 * points it at the URL once resolved.
 */
export function ProofLink({
  resolve,
  className,
  children,
}: {
  resolve: () => Promise<string>
  className?: string
  children: ReactNode
}) {
  const [loading, setLoading] = useState(false)

  const onClick = async () => {
    if (loading) return
    setLoading(true)
    // Open a blank tab synchronously so it isn't popup-blocked. Do NOT pass
    // 'noopener' here — that makes window.open() return null, and we need the handle.
    const tab = window.open('about:blank', '_blank')
    try {
      const url = await resolve()
      if (tab) {
        tab.opener = null // sever the reference now that we have the handle
        tab.location.href = url
      } else {
        // Popups fully blocked — try a direct new tab rather than losing this page.
        window.open(url, '_blank', 'noopener,noreferrer')
      }
    } catch {
      tab?.close()
    } finally {
      setLoading(false)
    }
  }

  return (
    <button type="button" onClick={onClick} disabled={loading} className={className}>
      {loading ? 'Opening…' : children}
    </button>
  )
}
