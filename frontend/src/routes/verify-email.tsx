import { createFileRoute, Link } from '@tanstack/react-router'
import { useEffect, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { CheckCircle2, XCircle } from 'lucide-react'
import { AuthShell } from '@/components/challenge/auth'
import { _jsonPostRequest } from '@/api/helpers'
import { useAuth } from '@/hooks/useAuth'

export const Route = createFileRoute('/verify-email')({
  validateSearch: (search: Record<string, unknown>) => ({
    token: typeof search.token === 'string' ? search.token : '',
  }),
  component: VerifyEmailPage,
})

type Status = 'verifying' | 'success' | 'error'

function VerifyEmailPage() {
  const { token } = Route.useSearch()
  const { isAuthenticated } = useAuth()
  const queryClient = useQueryClient()
  const [status, setStatus] = useState<Status>('verifying')
  const [message, setMessage] = useState('')
  const ran = useRef(false)

  useEffect(() => {
    if (ran.current) return // guard against StrictMode double-invoke
    ran.current = true

    if (!token) {
      setStatus('error')
      setMessage('This verification link is missing its token.')
      return
    }

    _jsonPostRequest('auth/verify_email', { token })
      .then((res) => {
        setStatus('success')
        setMessage((res as { message?: string })?.message ?? 'Your email is confirmed.')
        // refresh the cached profile so /register sees the verified state
        queryClient.invalidateQueries({ queryKey: ['profile'] })
      })
      .catch((err) => {
        setStatus('error')
        setMessage(
          err instanceof Error
            ? err.message
            : 'This link is invalid or has expired.',
        )
      })
  }, [token, queryClient])

  return (
    <AuthShell title="Email verification">
      {status === 'verifying' ? (
        <div className="flex flex-col items-center gap-3 py-6">
          <div className="size-7 animate-spin rounded-full border-2 border-brand-orange border-t-transparent" />
          <p className="text-sm text-foreground/70">Confirming your email…</p>
        </div>
      ) : status === 'success' ? (
        <div className="flex flex-col items-center gap-4 py-4 text-center">
          <CheckCircle2 className="size-10 text-brand-orange" />
          <p className="text-foreground/85">{message}</p>
          <Link
            to={isAuthenticated ? '/register' : '/login'}
            className="inline-flex h-11 items-center justify-center rounded-full bg-primary px-7 text-sm font-bold uppercase tracking-wide text-primary-foreground transition-transform hover:scale-[1.02] active:scale-95"
          >
            {isAuthenticated ? 'Register for the race' : 'Sign in'}
          </Link>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-4 py-4 text-center">
          <XCircle className="size-10 text-destructive-foreground/80" />
          <p className="text-foreground/85">{message}</p>
          <Link
            to={isAuthenticated ? '/register' : '/login'}
            className="text-sm font-semibold text-brand-orange hover:underline"
          >
            {isAuthenticated ? 'Back to registration' : 'Back to sign in'}
          </Link>
        </div>
      )}
    </AuthShell>
  )
}
