import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
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
import {
  AuthShell,
  GoogleAuthButton,
  OrDivider,
  authInputClass,
  GOOGLE_CLIENT_ID,
} from '@/components/challenge/auth'

export const Route = createFileRoute('/signup')({
  component: SignupPage,
})

const signupSchema = z.object({
  name: z.string().min(1, 'Your name is required'),
  email: z.email('Enter a valid email'),
  password: z
    .string()
    .min(8, 'At least 8 characters')
    .regex(/[A-Z]/, 'Include an uppercase letter')
    .regex(/[0-9]/, 'Include a number')
    .regex(/[^A-Za-z0-9]/, 'Include a special character'),
})

type SignupValues = z.infer<typeof signupSchema>

function SignupPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { register, isAuthenticated } = useAuth()
  const navigate = useNavigate()

  // Already signed in → go register for the race.
  useEffect(() => {
    if (isAuthenticated) navigate({ to: '/register' })
  }, [isAuthenticated, navigate])

  const form = useForm<SignupValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: { name: '', email: '', password: '' },
  })

  const onSubmit = async (values: SignupValues) => {
    setIsLoading(true)
    setError(null)
    try {
      await register(values.name, values.email, values.password)
      navigate({ to: '/register', replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign up failed')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <AuthShell
      title="Join the challenge"
      subtitle="Create an account to register your race"
      footer={
        <span className="text-foreground/70">
          Already have an account?{' '}
          <Link to="/login" className="font-semibold text-brand-orange hover:underline">
            Sign in
          </Link>
        </span>
      }
    >
      {error ? (
        <div role="alert" className="mb-4 rounded-xl bg-destructive/15 px-3 py-2.5 text-sm text-destructive-foreground">
          {error}
        </div>
      ) : null}

      {GOOGLE_CLIENT_ID ? (
        <>
          <GoogleAuthButton
            disabled={isLoading}
            onError={setError}
            onLoadingChange={setIsLoading}
            onDone={() => navigate({ to: '/register', replace: true })}
          />
          <OrDivider label="or sign up with email" />
        </>
      ) : null}

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs font-medium text-foreground/70">Full name</FormLabel>
                <FormControl>
                  <Input placeholder="Jane Runner" disabled={isLoading} className={authInputClass} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs font-medium text-foreground/70">Email</FormLabel>
                <FormControl>
                  <Input type="email" placeholder="you@example.com" autoComplete="email" disabled={isLoading} className={authInputClass} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs font-medium text-foreground/70">Password</FormLabel>
                <FormControl>
                  <Input type="password" placeholder="••••••••" autoComplete="new-password" disabled={isLoading} className={authInputClass} {...field} />
                </FormControl>
                <FormDescription className="text-foreground/50">
                  8+ characters with an uppercase letter, a number, and a symbol.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button type="submit" className="h-11 w-full rounded-xl text-base font-bold uppercase tracking-wide" disabled={isLoading}>
            {isLoading ? 'Creating account…' : 'Create account'}
          </Button>
        </form>
      </Form>
    </AuthShell>
  )
}
