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

export const Route = createFileRoute('/login')({
  component: LoginPage,
})

const loginSchema = z.object({
  email: z.email('Enter a valid email'),
  password: z.string().min(1, 'Password is required'),
})

type LoginValues = z.infer<typeof loginSchema>

function LoginPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { basicLogin, isAuthenticated, hasRole } = useAuth()
  const navigate = useNavigate()

  // Redirect once authenticated (covers both email and Google sign-in).
  useEffect(() => {
    if (isAuthenticated) {
      navigate({ to: hasRole('admin') ? '/admin/participants' : '/me', replace: true })
    }
  }, [isAuthenticated, hasRole, navigate])

  const form = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  })

  const onSubmit = async (values: LoginValues) => {
    setIsLoading(true)
    setError(null)
    try {
      await basicLogin(values.email, values.password)
      // redirect handled by the effect above
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <AuthShell
      title="Welcome back"
      subtitle="Sign in to manage your race"
      footer={
        <span className="text-foreground/70">
          New here?{' '}
          <Link to="/signup" className="font-semibold text-brand-orange hover:underline">
            Create an account
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
            onDone={() => {
              /* effect redirects */
            }}
          />
          <OrDivider label="or sign in with email" />
        </>
      ) : null}

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
                  <Input type="password" placeholder="••••••••" autoComplete="current-password" disabled={isLoading} className={authInputClass} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button type="submit" className="h-11 w-full rounded-xl text-base font-bold uppercase tracking-wide" disabled={isLoading}>
            {isLoading ? 'Signing in…' : 'Sign in'}
          </Button>
        </form>
      </Form>
    </AuthShell>
  )
}
