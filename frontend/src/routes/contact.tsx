import { createFileRoute, Link } from '@tanstack/react-router'
import { ContactForm } from '@/components/ContactForm'

export const Route = createFileRoute('/contact')({
  component: ContactPage,
})

function ContactPage() {
  return (
    <div className="min-h-dvh flex flex-col items-center justify-center px-6 py-12 bg-background">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Get in touch
          </h1>
          <p className="text-sm text-muted-foreground">
            Send me a message and I'll reply by email.
          </p>
        </div>

        <div className="rounded-3xl bg-card/70 backdrop-blur-sm shadow-[0_8px_40px_-12px_rgb(0,0,0,0.15)] p-6 sm:p-8">
          <ContactForm />
        </div>

        <div className="text-center">
          <Link
            to="/"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            &larr; Back
          </Link>
        </div>
      </div>
    </div>
  )
}
