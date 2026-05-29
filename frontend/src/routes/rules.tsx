import { createFileRoute, Link } from '@tanstack/react-router'
import { BrandHeader } from '@/components/challenge/BrandHeader'
import { challenge, rules } from '@/data/challenge'

export const Route = createFileRoute('/rules')({
  component: RulesPage,
})

function GoalCard({
  label,
  km,
  miles,
}: {
  label: string
  km: number
  miles: number
}) {
  return (
    <div className="rounded-2xl border border-border/60 bg-brand-teal-panel p-6 text-center">
      <p className="text-xs font-bold uppercase tracking-[0.25em] text-brand-cream">{label}</p>
      <p className="mt-3 font-display text-4xl font-black italic text-brand-orange sm:text-5xl">
        {km.toLocaleString()} KM
      </p>
      <p className="mt-1 text-sm text-foreground/70">(~{miles.toLocaleString()} miles)</p>
    </div>
  )
}

function RulesPage() {
  return (
    <div className="min-h-dvh bg-brand-teal text-foreground">
      <BrandHeader />

      <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <h1 className="font-display text-5xl font-black italic leading-none text-brand-cream sm:text-6xl">
          The Rules
        </h1>
        <p className="mt-3 text-sm uppercase tracking-[0.25em] text-brand-orange">
          {challenge.dates}, {challenge.year}
        </p>

        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <GoalCard {...challenge.goals.run} />
          <GoalCard {...challenge.goals.bike} />
        </div>

        <div className="mt-10 space-y-8">
          {rules.map((r) => (
            <section key={r.heading}>
              <h2 className="font-display text-2xl font-bold italic text-brand-cream">
                {r.heading}
              </h2>
              <p className="mt-2 leading-relaxed text-foreground/85">{r.body}</p>
            </section>
          ))}
        </div>

        <div className="mt-12 flex flex-col items-center gap-4 rounded-2xl border border-border/60 bg-brand-teal-panel p-8 text-center">
          <p className="font-display text-2xl font-bold italic text-brand-cream">
            Ready to earn the choice?
          </p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Link
              to="/signup"
              className="inline-flex h-12 items-center justify-center rounded-full bg-primary px-8 text-base font-bold uppercase tracking-wide text-primary-foreground transition-transform hover:scale-[1.02] active:scale-95"
            >
              Sign up to race
            </Link>
            {challenge.gofundmeUrl ? (
              <a
                href={challenge.gofundmeUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-12 items-center justify-center rounded-full border border-border px-7 text-sm font-semibold uppercase tracking-wide text-foreground/90 transition-colors hover:bg-white/5"
              >
                Donate on GoFundMe
              </a>
            ) : null}
          </div>
        </div>
      </main>
    </div>
  )
}
