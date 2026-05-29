import { createFileRoute } from '@tanstack/react-router'
import * as z from 'zod'
import { VerifyTokenGate } from '@/components/VerifyTokenGate'
import { useVerifyLink } from '@/api/publicMessages/publicMessagesApi'

const verifySearchSchema = z.object({
  t: z.string().optional(),
})

export const Route = createFileRoute('/conversations/verify')({
  validateSearch: verifySearchSchema,
  component: ConversationsVerify,
})

function ConversationsVerify() {
  const { t } = Route.useSearch()
  const { mutateAsync } = useVerifyLink()

  return (
    <VerifyTokenGate
      token={t}
      onVerify={mutateAsync}
      redirectOnSuccess="/conversations/me"
      errorCta={{ label: 'Start a new conversation', to: '/contact' }}
    />
  )
}
