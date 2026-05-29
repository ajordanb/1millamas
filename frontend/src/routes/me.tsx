import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useEffect } from 'react'
import { Bike, CheckCircle2, ExternalLink, Footprints } from 'lucide-react'
import { ParticipantShell } from '@/components/challenge/ParticipantShell'
import { VerifyEmailNotice } from '@/components/challenge/VerifyEmailNotice'
import { ProofLink } from '@/components/challenge/ProofLink'
import { JoinCode } from '@/components/challenge/JoinCode'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/hooks/useAuth'
import { participantApi } from '@/api/participant/participantApi'
import { userApi } from '@/api/user/userApi'
import { challenge } from '@/data/challenge'

export const Route = createFileRoute('/me')({
  component: MyDashboard,
})

function MyDashboard() {
  const { isAuthenticated } = useAuth()
  const navigate = useNavigate()
  const api = participantApi()
  const { data: me, isLoading } = api.useMyRegistrationQuery()
  const { data: profile } = userApi().useUserProfileQuery()

  useEffect(() => {
    if (!isAuthenticated) navigate({ to: '/login' })
  }, [isAuthenticated, navigate])

  if (!isAuthenticated) return null

  if (isLoading) {
    return (
      <ParticipantShell>
        <p className="text-foreground/60">Loading…</p>
      </ParticipantShell>
    )
  }

  // Logged in but not registered yet.
  if (!me) {
    const needsVerification = profile && !profile.email_confirmed
    return (
      <ParticipantShell>
        <h1 className="font-display text-4xl font-black italic text-brand-cream sm:text-5xl">
          You're almost in
        </h1>
        <p className="mt-2 text-foreground/70">
          {needsVerification
            ? 'Confirm your email to unlock race registration.'
            : "You have an account but haven't registered for the race yet."}
        </p>
        {needsVerification ? (
          <div className="mt-6">
            <VerifyEmailNotice email={profile.email ?? profile.username} />
          </div>
        ) : (
          <Link
            to="/register"
            className="mt-6 inline-flex h-12 items-center justify-center rounded-full bg-primary px-8 text-base font-bold uppercase tracking-wide text-primary-foreground transition-transform hover:scale-[1.02] active:scale-95"
          >
            Register your race
          </Link>
        )}
      </ParticipantShell>
    )
  }

  const isRun = me.discipline === 'run'
  const Icon = isRun ? Footprints : Bike
  const challengeUrl = isRun ? challenge.challenge.run : challenge.challenge.bike
  const disciplineLabel = challenge.goals[me.discipline].label

  return (
    <ParticipantShell>
      <div className="flex items-center gap-2 text-brand-orange">
        <CheckCircle2 className="size-5" />
        <span className="text-xs font-bold uppercase tracking-[0.2em]">Registered</span>
      </div>
      <h1 className="mt-2 font-display text-4xl font-black italic text-brand-cream sm:text-5xl">
        Hey, {me.display_name}
      </h1>

      {/* registration card */}
      <div className="mt-6 rounded-2xl border border-border/60 bg-brand-teal-panel p-6">
        <div className="flex items-center gap-4">
          <div className="flex size-12 items-center justify-center rounded-xl bg-brand-orange/15">
            <Icon className="size-6 text-brand-orange" />
          </div>
          <div>
            <p className="font-display text-2xl font-bold italic text-brand-cream">
              {disciplineLabel}
            </p>
            <p className="text-sm text-foreground/70">Goal: {me.goal_km.toLocaleString()} km</p>
          </div>
        </div>
        <dl className="mt-5 grid grid-cols-2 gap-4 text-sm">
          <div>
            <dt className="text-foreground/50">Name</dt>
            <dd className="text-foreground">{me.full_name}</dd>
          </div>
          {me.city ? (
            <div>
              <dt className="text-foreground/50">City</dt>
              <dd className="text-foreground">{me.city}</dd>
            </div>
          ) : null}
          <div>
            <dt className="text-foreground/50">Donation proof</dt>
            <dd>
              {me.donation_proof_url ? (
                <ProofLink
                  resolve={api.getMyProofUrl}
                  className="text-brand-orange hover:underline"
                >
                  View upload
                </ProofLink>
              ) : (
                <span className="text-foreground/60">—</span>
              )}
            </dd>
          </div>
        </dl>
      </div>

      {/* tracking: the challenge */}
      <div className="mt-6 rounded-2xl border border-border/60 bg-brand-teal-panel p-6">
        <h2 className="font-display text-xl font-bold italic text-brand-cream">
          Track your distance
        </h2>
        <p className="mt-2 text-sm text-foreground/80">
          Join the {disciplineLabel} challenge and connect your Strava — every activity
          counts automatically toward your goal and the leaderboard.
        </p>

        {challenge.challenge.joinCode ? (
          <div className="mt-4">
            <JoinCode code={challenge.challenge.joinCode} />
          </div>
        ) : null}

        <div className="mt-4">
          {challengeUrl ? (
            <a
              href={challengeUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-primary px-6 text-sm font-bold uppercase tracking-wide text-primary-foreground transition-transform hover:scale-[1.02] active:scale-95"
            >
              Join the {disciplineLabel} challenge <ExternalLink className="size-4" />
            </a>
          ) : (
            <p className="rounded-xl bg-black/15 px-4 py-3 text-sm text-foreground/70">
              📣 We'll email you the challenge link shortly — keep an eye on your inbox.
            </p>
          )}
        </div>

        <p className="mt-4 text-xs text-foreground/55">{challenge.feeNote}</p>
      </div>

      {/* community: the strava club */}
      {challenge.stravaClubUrl ? (
        <div className="mt-6 rounded-2xl border border-border/60 bg-brand-teal-panel p-6">
          <h2 className="font-display text-xl font-bold italic text-brand-cream">Say hi</h2>
          <p className="mt-2 text-sm text-foreground/80">
            Join our Strava club for updates, questions, and cheering each other on.
          </p>
          <a
            href={challenge.stravaClubUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-5 inline-flex h-11 items-center justify-center gap-2 rounded-full border border-border px-6 text-sm font-semibold uppercase tracking-wide text-foreground/90 transition-colors hover:bg-white/5"
          >
            Join the Strava club <ExternalLink className="size-4" />
          </a>
        </div>
      ) : null}

      <div className="mt-6">
        <Button asChild variant="ghost" className="rounded-full text-foreground/70 hover:bg-white/5">
          <Link to="/rules">Read the rules →</Link>
        </Button>
      </div>
    </ParticipantShell>
  )
}
