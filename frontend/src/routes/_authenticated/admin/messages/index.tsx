import { createFileRoute } from '@tanstack/react-router'
import { MessageSquare } from 'lucide-react'

export const Route = createFileRoute('/_authenticated/admin/messages/')({
  component: MessagesIndex,
})

function MessagesIndex() {
  return (
    <div className="flex flex-1 items-center justify-center">
      <div className="flex flex-col items-center gap-3 text-center px-6">
        <div className="flex size-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
          <MessageSquare className="size-6" />
        </div>
        <h2 className="text-lg font-medium tracking-tight text-foreground">
          Select a conversation
        </h2>
        <p className="text-sm text-muted-foreground max-w-sm">
          Pick a thread from the list to read and reply.
        </p>
      </div>
    </div>
  )
}
