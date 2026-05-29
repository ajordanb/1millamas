export function ExpandButton({ children }: { children: string }) {
  return (
    <button
      type="button"
      className="w-full rounded-2xl border border-dashed border-border/50 p-3 text-sm text-muted-foreground hover:text-foreground hover:border-border transition-colors cursor-pointer text-center"
    >
      {children}
    </button>
  )
}
