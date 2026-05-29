import { type FormEvent, useRef, useState } from 'react'
import { CheckCircle, Loader2, Send } from 'lucide-react'
import { _jsonPostRequest } from '@/api/helpers'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'

type Status = 'idle' | 'loading' | 'success' | 'error'

export function ContactForm() {
  const formRef = useRef<HTMLFormElement>(null)
  const [status, setStatus] = useState<Status>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = e.currentTarget
    const data = {
      name: (form.elements.namedItem('name') as HTMLInputElement).value,
      email: (form.elements.namedItem('email') as HTMLInputElement).value,
      message: (form.elements.namedItem('message') as HTMLTextAreaElement).value,
    }

    setStatus('loading')
    setErrorMsg('')
    try {
      await _jsonPostRequest('contact', data)
      setStatus('success')
      formRef.current?.reset()
    } catch (err) {
      setStatus('error')
      setErrorMsg(err instanceof Error ? err.message : 'Something went wrong')
    }
  }

  if (status === 'success') {
    return (
      <div className="flex items-center gap-2 rounded-lg bg-card p-4 text-sm text-card-foreground">
        <CheckCircle className="size-4 text-green-500 shrink-0" />
        <span>Thanks for reaching out! I'll get back to you soon.</span>
      </div>
    )
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="name">Name</Label>
          <Input id="name" name="name" placeholder="Your name" required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            name="email"
            type="email"
            placeholder="you@example.com"
            required
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="message">Message</Label>
        <Textarea
          id="message"
          name="message"
          placeholder="What's on your mind?"
          rows={4}
          required
        />
      </div>
      {status === 'error' && (
        <p className="text-sm text-destructive">{errorMsg}</p>
      )}
      <Button type="submit" disabled={status === 'loading'} className="gap-2">
        {status === 'loading' ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <Send className="size-4" />
        )}
        {status === 'loading' ? 'Sending...' : 'Send'}
      </Button>
    </form>
  )
}
