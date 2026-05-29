import type { ComponentProps, ReactNode } from 'react'
import { Link } from '@tanstack/react-router'
import { AlertCircle } from 'lucide-react'

type LinkTo = ComponentProps<typeof Link>['to']

export interface StandaloneCardCta {
  label: string
  to: LinkTo
}

interface StandaloneCardProps {
  children: ReactNode
}

export function StandaloneCard({ children }: StandaloneCardProps) {
  return (
    <div className="min-h-dvh flex flex-col items-center justify-center px-6 py-12 bg-background">
      <div className="w-full max-w-sm">
        <div className="rounded-3xl bg-card/70 backdrop-blur-sm shadow-[0_8px_40px_-12px_rgb(0,0,0,0.15)] p-8 text-center">
          {children}
        </div>
      </div>
    </div>
  )
}

interface StandaloneErrorCardProps {
  title: string
  body: string
  cta?: StandaloneCardCta
}

export function StandaloneErrorCard({ title, body, cta }: StandaloneErrorCardProps) {
  return (
    <StandaloneCard>
      <div className="flex flex-col items-center gap-4">
        <div className="flex size-12 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
          <AlertCircle className="size-6" />
        </div>
        <div className="space-y-1">
          <h1 className="text-base font-semibold tracking-tight text-foreground">
            {title}
          </h1>
          <p className="text-sm text-muted-foreground">{body}</p>
        </div>
        {cta && (
          <Link
            to={cta.to}
            className="mt-2 inline-flex items-center justify-center rounded-xl bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:opacity-90 transition-opacity"
          >
            {cta.label}
          </Link>
        )}
      </div>
    </StandaloneCard>
  )
}
