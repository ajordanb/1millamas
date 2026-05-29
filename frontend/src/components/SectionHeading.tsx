import type { ReactNode } from 'react'

export function SectionHeading({ children }: { children: ReactNode }) {
  return (
    <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
      {children}
    </h2>
  )
}
