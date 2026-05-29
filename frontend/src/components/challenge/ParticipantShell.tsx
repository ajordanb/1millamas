import type { ReactNode } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import { LogOut } from 'lucide-react'
import { Logo } from '@/components/challenge/Logo'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/hooks/useAuth'

/** Teal page shell for logged-in participant pages (register, dashboard). */
export function ParticipantShell({ children }: { children: ReactNode }) {
  const { logout, currentUser } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate({ to: '/' })
  }

  return (
    <div className="min-h-dvh bg-brand-teal text-foreground">
      <header className="sticky top-0 z-20 border-b border-border/60 bg-brand-teal/85 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-3xl items-center justify-between px-4 sm:px-6">
          <Link to="/">
            <Logo className="h-8 w-auto" />
          </Link>
          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-foreground/60 sm:inline">{currentUser}</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              className="rounded-full text-foreground/80 hover:bg-white/5 hover:text-foreground"
            >
              <LogOut className="size-4" />
              Log out
            </Button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-2xl px-4 py-10 sm:px-6">{children}</main>
    </div>
  )
}
