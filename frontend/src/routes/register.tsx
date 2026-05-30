import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Bike, ExternalLink, Footprints, Upload } from 'lucide-react'
import { ParticipantShell } from '@/components/challenge/ParticipantShell'
import { VerifyEmailNotice } from '@/components/challenge/VerifyEmailNotice'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { useAuth } from '@/hooks/useAuth'
import { participantApi } from '@/api/participant/participantApi'
import { userApi } from '@/api/user/userApi'
import { challenge } from '@/data/challenge'
import { cn } from '@/lib/utils'

export const Route = createFileRoute('/register')({
  component: RegisterRacePage,
})

const MAX_BYTES = 10 * 1024 * 1024

const schema = z.object({
  discipline: z.enum(['run', 'bike']),
  full_name: z.string().min(1, 'Your name is required'),
  display_name: z.string().min(1, 'A display name is required'),
  city: z.string().optional(),
  phone: z.string().optional(),
  donation_proof: z
    .instanceof(File, { message: 'Upload a screenshot of your donation' })
    .refine((f) => f.size <= MAX_BYTES, 'Image must be under 10 MB')
    .refine((f) => f.type.startsWith('image/'), 'File must be an image'),
})

type FormValues = z.infer<typeof schema>

function RegisterRacePage() {
  const { isAuthenticated } = useAuth()
  const navigate = useNavigate()
  const api = participantApi()
  const { data: existing, isLoading: checking } = api.useMyRegistrationQuery()
  const registerMutation = api.useRegister()
  const { data: profile } = userApi().useUserProfileQuery()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!isAuthenticated) navigate({ to: '/login' })
  }, [isAuthenticated, navigate])

  // Already registered → straight to the dashboard.
  useEffect(() => {
    if (existing) navigate({ to: '/me', replace: true })
  }, [existing, navigate])

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { discipline: 'run', full_name: '', display_name: '', city: '', phone: '' },
  })

  // Prefill the name from the account profile (set at sign-up, incl. via Google).
  useEffect(() => {
    if (profile?.name) {
      if (!form.getValues('full_name')) form.setValue('full_name', profile.name)
      if (!form.getValues('display_name')) form.setValue('display_name', profile.name)
    }
  }, [profile, form])

  const discipline = form.watch('discipline')
  const goalKm = challenge.goals[discipline].km

  const onSubmit = async (values: FormValues) => {
    setError(null)
    try {
      await registerMutation.mutateAsync({
        full_name: values.full_name,
        display_name: values.display_name,
        discipline: values.discipline,
        city: values.city || undefined,
        phone: values.phone || undefined,
        donation_proof: values.donation_proof,
      })
      navigate({ to: '/me', replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed')
    }
  }

  if (!isAuthenticated || checking || existing) return null

  // Email verification is required before registering for a race.
  if (profile && !profile.email_confirmed) {
    return (
      <ParticipantShell>
        <h1 className="font-display text-4xl font-black italic text-brand-cream sm:text-5xl">
          Register your race
        </h1>
        <p className="mt-2 text-foreground/70">One quick step before you can sign up.</p>
        <div className="mt-6">
          <VerifyEmailNotice email={profile.email ?? profile.username} />
        </div>
      </ParticipantShell>
    )
  }

  const submitting = registerMutation.isPending

  return (
    <ParticipantShell>
      <h1 className="font-display text-4xl font-black italic text-brand-cream sm:text-5xl">
        Register your race
      </h1>
      <p className="mt-2 text-foreground/70">
        Pick your discipline, tell us who you are, and upload proof of your GoFundMe donation.
      </p>
      <p className="mt-3 rounded-xl bg-black/15 px-4 py-3 text-xs text-foreground/60">
        {challenge.feeNote} You'll get the challenge join code right after you register.
      </p>

      {challenge.gofundmeUrl ? (
        <div className="mt-4 flex flex-col gap-2 rounded-xl border border-border/60 bg-brand-teal-panel p-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-foreground/80">
            Step 1: make your donation ({challenge.minDonation} minimum), then upload the screenshot below.
          </p>
          <a
            href={challenge.gofundmeUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-full bg-secondary px-5 text-sm font-bold uppercase tracking-wide text-secondary-foreground transition-opacity hover:opacity-90"
          >
            Donate on GoFundMe <ExternalLink className="size-4" />
          </a>
        </div>
      ) : null}

      {error ? (
        <div role="alert" className="mt-6 rounded-xl bg-destructive/15 px-3 py-2.5 text-sm text-destructive-foreground">
          {error}
        </div>
      ) : null}

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="mt-6 space-y-6">
          {/* discipline toggle */}
          <FormField
            control={form.control}
            name="discipline"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs font-semibold uppercase tracking-wide text-foreground/70">
                  I'm a…
                </FormLabel>
                <div className="grid grid-cols-2 gap-3">
                  {(['run', 'bike'] as const).map((d) => {
                    const Icon = d === 'run' ? Footprints : Bike
                    const active = field.value === d
                    return (
                      <button
                        type="button"
                        key={d}
                        onClick={() => field.onChange(d)}
                        className={cn(
                          'flex flex-col items-center gap-2 rounded-2xl border p-5 transition-colors',
                          active
                            ? 'border-brand-orange bg-brand-orange/10 text-brand-cream'
                            : 'border-border bg-black/10 text-foreground/70 hover:bg-black/20',
                        )}
                      >
                        <Icon className={cn('size-7', active && 'text-brand-orange')} />
                        <span className="font-bold uppercase tracking-wide">
                          {challenge.goals[d].label}
                        </span>
                        <span className="text-xs text-foreground/60">
                          {challenge.goals[d].km.toLocaleString()} km
                        </span>
                      </button>
                    )
                  })}
                </div>
                <FormDescription className="text-foreground/50">
                  Your goal will be {goalKm.toLocaleString()} km.
                </FormDescription>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="full_name"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs font-semibold uppercase tracking-wide text-foreground/70">
                  Full name
                </FormLabel>
                <FormControl>
                  <Input placeholder="Jane Runner" className={inputClass} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="display_name"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs font-semibold uppercase tracking-wide text-foreground/70">
                  Display name
                </FormLabel>
                <FormControl>
                  <Input placeholder="How you appear on Strava" className={inputClass} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="city"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-semibold uppercase tracking-wide text-foreground/70">
                    City <span className="font-normal lowercase text-foreground/40">(optional)</span>
                  </FormLabel>
                  <FormControl>
                    <Input placeholder="Bogotá" className={inputClass} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-semibold uppercase tracking-wide text-foreground/70">
                    Phone <span className="font-normal lowercase text-foreground/40">(optional)</span>
                  </FormLabel>
                  <FormControl>
                    <Input placeholder="+57 300 000 0000" className={inputClass} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* donation proof upload */}
          <FormField
            control={form.control}
            name="donation_proof"
            render={({ field: { value, onChange } }) => (
              <FormItem>
                <FormLabel className="text-xs font-semibold uppercase tracking-wide text-foreground/70">
                  Donation screenshot · {challenge.minDonation} minimum
                </FormLabel>
                <FormControl>
                  <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-border bg-black/10 px-4 py-8 text-center transition-colors hover:bg-black/20">
                    <Upload className="size-6 text-brand-orange" />
                    <span className="text-sm text-foreground/80">
                      {value ? (value as File).name : 'Tap to upload your GoFundMe donation proof'}
                    </span>
                    <span className="text-xs text-foreground/40">JPEG, PNG or WebP · up to 10 MB</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => onChange(e.target.files?.[0])}
                    />
                  </label>
                </FormControl>
                <FormDescription className="text-foreground/50">
                  {challenge.gofundmeUrl ? (
                    <>
                      Haven't donated yet?{' '}
                      <a
                        href={challenge.gofundmeUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="font-semibold text-brand-orange hover:underline"
                      >
                        Donate on GoFundMe
                      </a>{' '}
                      ({challenge.minDonation} minimum), then come back and upload your proof.
                    </>
                  ) : (
                    `Donate at least ${challenge.minDonation} on our GoFundMe page first, then upload your proof here.`
                  )}
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <Button
            type="submit"
            className="h-12 w-full rounded-full text-base font-bold uppercase tracking-wide"
            disabled={submitting}
          >
            {submitting ? 'Submitting…' : 'Complete registration'}
          </Button>
        </form>
      </Form>
    </ParticipantShell>
  )
}

const inputClass =
  'h-11 rounded-xl border border-border bg-black/15 text-foreground placeholder:text-foreground/40 shadow-none focus-visible:ring-2 focus-visible:ring-ring/50'
