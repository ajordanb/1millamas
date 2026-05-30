import { createFileRoute, Link } from '@tanstack/react-router'
import { Logo } from '@/components/challenge/Logo'
import { useAuth } from '@/hooks/useAuth'
import { challenge } from '@/data/challenge'

export const Route = createFileRoute('/')({
  component: Landing,
})

function Landing() {
  const { isAuthenticated, hasRole } = useAuth()
  const dashboardTo = hasRole('admin') ? '/admin/participants' : '/me'

  return (
    <main className="relative flex h-dvh flex-col overflow-hidden bg-brand-teal text-foreground">
      {/* soft glow accents */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(60% 50% at 50% 0%, rgba(255,107,26,0.14), transparent 70%), radial-gradient(50% 45% at 50% 100%, rgba(242,214,128,0.10), transparent 70%)',
        }}
      />

      {/* top bar */}
      <header className="relative z-10 flex items-center justify-end gap-1 px-4 py-5 text-xs font-semibold uppercase tracking-wide sm:gap-3 sm:px-8 sm:text-sm">
        <Link
          to="/rules"
          className="rounded-full px-3 py-1.5 text-foreground/80 transition-colors hover:text-foreground"
        >
          Rules
        </Link>
        {challenge.gofundmeUrl ? (
          <a
            href={challenge.gofundmeUrl}
            target="_blank"
            rel="noreferrer"
            className="rounded-full bg-secondary px-4 py-1.5 text-secondary-foreground transition-opacity hover:opacity-90"
          >
            Donate
          </a>
        ) : null}
        {isAuthenticated ? (
          <Link
            to={dashboardTo}
            className="rounded-full px-3 py-1.5 text-foreground/80 transition-colors hover:text-foreground"
          >
            Dashboard
          </Link>
        ) : (
          <Link
            to="/login"
            className="rounded-full px-3 py-1.5 text-foreground/80 transition-colors hover:text-foreground"
          >
            Sign in
          </Link>
        )}
      </header>

      {/* hero */}
      <div className="relative z-10 flex flex-1 flex-col items-center justify-center px-6 text-center">
        <p className="mb-6 text-xs font-bold uppercase tracking-[0.3em] text-brand-cream sm:text-sm">
          {challenge.kicker}
        </p>

        <Logo className="w-full max-w-md sm:max-w-xl" />

        <h1 className="mt-8 font-display text-2xl font-black italic leading-tight text-brand-cream sm:text-4xl">
          {challenge.tagline[0]}
          <br />
          {challenge.tagline[1]}
        </h1>

        <p className="mt-3 text-sm uppercase tracking-[0.25em] text-foreground/70 sm:text-base">
          {challenge.subTagline}
        </p>

        <div className="mt-9 flex flex-col items-center gap-3 sm:flex-row">
          <Link
            to="/signup"
            className="inline-flex h-12 items-center justify-center rounded-full bg-primary px-8 text-base font-bold uppercase tracking-wide text-primary-foreground shadow-lg shadow-black/20 transition-transform hover:scale-[1.02] active:scale-95"
          >
            Sign up to race
          </Link>
          <Link
            to="/login"
            className="inline-flex h-12 items-center justify-center rounded-full border border-border px-7 text-sm font-semibold uppercase tracking-wide text-foreground/90 transition-colors hover:bg-white/5"
          >
            Already in? Sign in
          </Link>
        </div>
      </div>

      {/* footer */}
      <footer className="relative z-10 flex items-center justify-center gap-3 px-6 py-5 text-xs uppercase tracking-[0.25em] text-brand-orange">
        <span>{challenge.dates}</span>
      </footer>
    </main>
  )
}
