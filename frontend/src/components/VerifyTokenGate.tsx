import { useEffect, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { Loader2 } from 'lucide-react'
import {
  StandaloneCard,
  StandaloneErrorCard,
  type StandaloneCardCta,
} from '@/components/StandaloneCard'

type Status = 'verifying' | 'success' | 'error'

interface VerifyTokenGateProps {
  /**
   * The token to verify. If null/empty, the gate immediately shows the error state.
   */
  token: string | null | undefined
  /**
   * Verification call. Resolve = success, reject = failure.
   * Typically a mutation's mutateAsync.
   */
  onVerify: (token: string) => Promise<unknown>
  /**
   * Where to navigate after a successful verification.
   */
  redirectOnSuccess: string
  /**
   * Optional CTA shown in the error state.
   */
  errorCta?: StandaloneCardCta
  /**
   * Title shown while verifying. Defaults to "Verifying your link...".
   */
  verifyingTitle?: string
  /**
   * Title shown on error. Defaults to "This link didn't work".
   */
  errorTitle?: string
}

/**
 * Generic UX shell for email-link verification flows. Handles verifying →
 * success (auto-navigate) → error (card with optional CTA). No domain
 * logic — the caller supplies the verify function and redirect target.
 * Reusable for thread magic links, passwordless login, etc.
 */
export function VerifyTokenGate({
  token,
  onVerify,
  redirectOnSuccess,
  errorCta,
  verifyingTitle = 'Verifying your link...',
  errorTitle = "This link didn't work",
}: VerifyTokenGateProps) {
  const [status, setStatus] = useState<Status>('verifying')
  const [errorMsg, setErrorMsg] = useState<string>('')
  const navigate = useNavigate()

  // Mount-once verification: the token comes from the URL when this route
  // loads, and on success we navigate away. Re-running on prop changes
  // would re-verify unnecessarily, so deps stay empty.
  useEffect(() => {
    if (!token) {
      setStatus('error')
      setErrorMsg('The link is missing its token.')
      return
    }

    let cancelled = false
    ;(async () => {
      try {
        await onVerify(token)
        if (cancelled) return
        setStatus('success')
        navigate({ to: redirectOnSuccess, replace: true })
      } catch (err) {
        if (cancelled) return
        setStatus('error')
        setErrorMsg(
          err instanceof Error
            ? err.message
            : 'The link is invalid or has expired.',
        )
      }
    })()

    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (status === 'error') {
    return (
      <StandaloneErrorCard title={errorTitle} body={errorMsg} cta={errorCta} />
    )
  }

  return (
    <StandaloneCard>
      <div className="flex flex-col items-center gap-3">
        <Loader2
          className={`${status === 'verifying' ? 'size-8' : 'size-6'} text-primary animate-spin`}
        />
        <p className="text-sm text-muted-foreground">
          {status === 'verifying' ? verifyingTitle : 'Redirecting...'}
        </p>
      </div>
    </StandaloneCard>
  )
}
