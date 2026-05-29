import logoUrl from '@/assets/images/1millalogo.svg'
import { cn } from '@/lib/utils'

export function Logo({ className }: { className?: string }) {
  return (
    <img
      src={logoUrl}
      alt="Una Milla Más"
      className={cn('select-none', className)}
      draggable={false}
    />
  )
}
