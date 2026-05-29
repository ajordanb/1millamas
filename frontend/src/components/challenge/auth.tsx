import type { ReactNode } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import { GoogleLogin } from '@react-oauth/google'
import { FcGoogle } from 'react-icons/fc'
import { Button } from '@/components/ui/button'
import { Logo } from '@/components/challenge/Logo'
import { useAuth } from '@/hooks/useAuth'

export const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID

/** Teal full-screen shell with the wordmark and a centered card. */
export function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string
  subtitle?: string
  children: ReactNode
  footer?: ReactNode
}) {
  return (
    <main className="relative flex min-h-dvh flex-col items-center justify-center bg-brand-teal px-6 py-12 text-foreground">
      <div className="w-full max-w-sm">
        <Link to="/" className="mb-8 flex justify-center">
          <Logo className="h-12 w-auto" />
        </Link>

        <div className="text-center">
          <h1 className="font-display text-3xl font-bold italic text-brand-cream">{title}</h1>
          {subtitle ? <p className="mt-1 text-sm text-foreground/70">{subtitle}</p> : null}
        </div>

        <div className="mt-6 rounded-2xl border border-border/60 bg-brand-teal-panel p-6 sm:p-7">
          {children}
        </div>

        {footer ? <div className="mt-6 text-center text-sm">{footer}</div> : null}
      </div>
    </main>
  )
}

export const authInputClass =
  'h-11 rounded-xl border border-border bg-black/15 text-foreground placeholder:text-foreground/40 shadow-none focus-visible:ring-2 focus-visible:ring-ring/50'

/** Google sign-in button. Calls onDone() after a successful social login. */
export function GoogleAuthButton({
  disabled,
  onError,
  onLoadingChange,
  onDone,
}: {
  disabled: boolean
  onError: (msg: string) => void
  onLoadingChange: (loading: boolean) => void
  onDone: () => void
}) {
  const { socialLogin } = useAuth()
  useNavigate() // keep router context warm for callers

  if (!GOOGLE_CLIENT_ID) return null

  return (
    <div className="relative h-11 w-full">
      <Button
        variant="outline"
        className="pointer-events-none absolute inset-0 h-11 w-full rounded-xl border border-border bg-black/15 text-foreground shadow-none hover:bg-black/20"
        disabled={disabled}
        type="button"
        tabIndex={-1}
      >
        <FcGoogle className="mr-2 size-5" />
        Continue with Google
      </Button>
      <div className="absolute inset-0 z-10 overflow-hidden rounded-xl opacity-0 [&>*]:!h-full [&>*]:!w-full">
        <GoogleLogin
          onSuccess={async (credentialResponse) => {
            if (!credentialResponse.credential) {
              onError('Google login failed, please try again.')
              return
            }
            onLoadingChange(true)
            try {
              await socialLogin({
                provider: 'google',
                data: { credential: credentialResponse.credential },
              })
              onDone()
            } catch {
              onError('Google login failed, please try again.')
            } finally {
              onLoadingChange(false)
            }
          }}
          onError={() => onError('OAuth error, please try again.')}
          theme="outline"
          size="large"
          shape="rectangular"
          width="320"
        />
      </div>
    </div>
  )
}

export function OrDivider({ label }: { label: string }) {
  return (
    <div className="relative flex items-center justify-center py-1">
      <span className="px-2 text-xs uppercase tracking-wide text-foreground/50">{label}</span>
    </div>
  )
}
