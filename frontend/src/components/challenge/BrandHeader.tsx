import { Link } from '@tanstack/react-router'
import { Logo } from './Logo'
import { useAuth } from '@/hooks/useAuth'

/** Shared top bar for the inner public pages (rules, leaderboard). */
export function BrandHeader() {
  const { isAuthenticated, hasRole } = useAuth()
  const dashboardTo = hasRole('admin') ? '/admin/participants' : '/me'

  return (
    <header className="sticky top-0 z-20 border-b border-border/60 bg-brand-teal/85 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4 sm:px-6">
        <Link to="/" className="flex items-center gap-2">
          <Logo className="h-8 w-auto" />
        </Link>
        <nav className="flex items-center gap-1 text-sm font-semibold uppercase tracking-wide sm:gap-2">
          <Link
            to="/rules"
            className="rounded-full px-3 py-1.5 text-foreground/80 transition-colors hover:bg-white/5 hover:text-foreground [&.active]:text-brand-orange"
          >
            Rules
          </Link>
          {isAuthenticated ? (
            <Link
              to={dashboardTo}
              className="rounded-full bg-primary px-4 py-1.5 text-primary-foreground transition-opacity hover:opacity-90"
            >
              Dashboard
            </Link>
          ) : (
            <Link
              to="/login"
              className="rounded-full bg-primary px-4 py-1.5 text-primary-foreground transition-opacity hover:opacity-90"
            >
              Sign in
            </Link>
          )}
        </nav>
      </div>
    </header>
  )
}
