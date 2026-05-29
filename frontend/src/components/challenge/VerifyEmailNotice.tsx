import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { MailCheck, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/hooks/useAuth'

/** Shown when a logged-in user hasn't confirmed their email yet. */
export function VerifyEmailNotice({ email }: { email?: string | null }) {
  const { authPost } = useAuth()
  const queryClient = useQueryClient()
  const [state, setState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')
  const [error, setError] = useState<string | null>(null)
  const [checking, setChecking] = useState(false)

  const resend = async () => {
    setState('sending')
    setError(null)
    try {
      await authPost('auth/resend_verification', {})
      setState('sent')
    } catch (err) {
      setState('error')
      setError(err instanceof Error ? err.message : 'Could not resend the email.')
    }
  }

  // Re-fetch the profile so the gate lifts once the email has been confirmed
  // (e.g. after clicking the link in another tab).
  const checkVerification = async () => {
    setChecking(true)
    try {
      await queryClient.refetchQueries({ queryKey: ['profile'] })
    } finally {
      setChecking(false)
    }
  }

  return (
    <div className="rounded-2xl border border-border/60 bg-brand-teal-panel p-6 text-center">
      <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-brand-orange/15">
        <MailCheck className="size-6 text-brand-orange" />
      </div>
      <h2 className="mt-4 font-display text-2xl font-bold italic text-brand-cream">
        Confirm your email first
      </h2>
      <p className="mt-2 text-sm text-foreground/75">
        We sent a confirmation link{email ? <> to <span className="text-foreground">{email}</span></> : null}. Click
        it to verify your account, then check below to continue.
      </p>

      <div className="mt-5 flex flex-col items-center justify-center gap-3 sm:flex-row">
        <Button
          onClick={checkVerification}
          disabled={checking}
          className="rounded-full"
        >
          <RefreshCw className={`size-4 ${checking ? 'animate-spin' : ''}`} />
          {checking ? 'Checking…' : "I've verified — check now"}
        </Button>

        {state === 'sent' ? (
          <span className="text-sm text-brand-cream">Sent! Check your inbox (and spam).</span>
        ) : (
          <Button
            onClick={resend}
            disabled={state === 'sending'}
            variant="outline"
            className="rounded-full border-border bg-transparent text-foreground hover:bg-white/5"
          >
            {state === 'sending' ? 'Sending…' : 'Resend email'}
          </Button>
        )}
      </div>

      {error ? <p className="mt-3 text-sm text-destructive-foreground/80">{error}</p> : null}
    </div>
  )
}
