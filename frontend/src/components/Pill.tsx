import type { ReactNode } from 'react'

const variants = {
  skill: 'rounded-full bg-card px-4 py-1.5 text-sm text-card-foreground',
  tag: 'rounded-full bg-secondary px-2.5 py-0.5 text-xs text-secondary-foreground',
}

export function Pill({
  children,
  variant = 'skill',
}: {
  children: ReactNode
  variant?: keyof typeof variants
}) {
  return <span className={variants[variant]}>{children}</span>
}
