import { useState } from 'react'
import { Check, Copy } from 'lucide-react'

/** A copy-able join code badge (for the Challenge Hound access code). */
export function JoinCode({ code }: { code: string }) {
  const [copied, setCopied] = useState(false)

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      /* clipboard unavailable — the code is still visible to type */
    }
  }

  return (
    <div className="inline-flex items-center gap-2 rounded-xl border border-border bg-black/15 px-3 py-2">
      <span className="text-xs uppercase tracking-wide text-foreground/50">Join code</span>
      <code className="font-mono text-base font-bold tracking-widest text-brand-cream">{code}</code>
      <button
        type="button"
        onClick={copy}
        aria-label="Copy join code"
        className="ml-1 rounded-md p-1 text-foreground/70 transition-colors hover:bg-white/10 hover:text-foreground"
      >
        {copied ? <Check className="size-4 text-brand-orange" /> : <Copy className="size-4" />}
      </button>
    </div>
  )
}
