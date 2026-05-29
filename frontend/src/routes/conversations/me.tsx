import { createFileRoute, Link } from '@tanstack/react-router'
import { useEffect, useRef, useState } from 'react'
import { Loader2, Lock, Send } from 'lucide-react'
import { Textarea } from '@/components/ui/textarea'
import { ThreadBubbles } from '@/components/messages/ThreadBubbles'
import {
  StandaloneCard,
  StandaloneErrorCard,
} from '@/components/StandaloneCard'
import {
  useMyThreadQuery,
  usePostVisitorReply,
} from '@/api/publicMessages/publicMessagesApi'
import { PublicApiError } from '@/api/helpers'

const AGENT_LABEL = 'Jordan'
const NEW_CONVERSATION_CTA = {
  label: 'Start a new conversation',
  to: '/contact',
} as const

export const Route = createFileRoute('/conversations/me')({
  component: ConversationsMe,
})

function ConversationsMe() {
  const { data: thread, isLoading, error } = useMyThreadQuery()
  const postReply = usePostVisitorReply()

  const [replyText, setReplyText] = useState('')
  const threadEndRef = useRef<HTMLDivElement>(null)
  const scrollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    // Auto-scroll to the latest message when the thread grows. Cleanup
    // clears any pending timer on unmount or before the next run.
    if (!thread) return
    if (scrollTimerRef.current) clearTimeout(scrollTimerRef.current)
    scrollTimerRef.current = setTimeout(
      () => threadEndRef.current?.scrollIntoView({ behavior: 'smooth' }),
      50,
    )
    return () => {
      if (scrollTimerRef.current) clearTimeout(scrollTimerRef.current)
    }
  }, [thread])

  if (isLoading) {
    return (
      <StandaloneCard>
        <div className="flex flex-col items-center gap-3 py-8">
          <Loader2 className="size-7 text-primary animate-spin" />
          <p className="text-sm text-muted-foreground">Loading conversation...</p>
        </div>
      </StandaloneCard>
    )
  }

  if (error instanceof PublicApiError && error.status === 401) {
    return (
      <StandaloneErrorCard
        title="Your session has expired"
        body="Use the link from your most recent reply email to open this conversation again, or start a new one."
        cta={NEW_CONVERSATION_CTA}
      />
    )
  }

  if (error || !thread) {
    return (
      <StandaloneErrorCard
        title="We couldn't load your conversation"
        body={error instanceof Error ? error.message : 'Something went wrong.'}
        cta={NEW_CONVERSATION_CTA}
      />
    )
  }

  const replyClosedBy410 =
    postReply.error instanceof PublicApiError && postReply.error.status === 410
  const isClosed = thread.status === 'closed' || replyClosedBy410
  const replyError =
    postReply.error && !replyClosedBy410
      ? postReply.error instanceof Error
        ? postReply.error.message
        : 'Failed to send reply.'
      : null

  const handleReply = async () => {
    if (!replyText.trim()) return
    try {
      await postReply.mutateAsync(replyText)
      setReplyText('')
    } catch {
      // Error state is derived from postReply.error above.
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      handleReply()
    }
  }

  return (
    <div className="h-dvh flex flex-col bg-background">
      <div className="flex-1 min-h-0 w-full max-w-2xl mx-auto flex flex-col md:py-6 md:px-6">
        <div className="flex-1 min-h-0 flex flex-col bg-card md:rounded-3xl md:shadow-[0_8px_40px_-12px_rgb(0,0,0,0.15)] overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between gap-3 px-5 py-4 shrink-0">
            <div className="min-w-0">
              <h1 className="text-sm font-semibold tracking-tight text-foreground">
                Conversation with {AGENT_LABEL}
              </h1>
              <p className="text-xs text-muted-foreground truncate">
                Started {new Date(thread.created_at).toLocaleDateString()}
              </p>
            </div>
            <Link
              to="/"
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Portfolio &rarr;
            </Link>
          </div>

          {/* Thread */}
          <div className="flex-1 overflow-y-auto scrollbar-thin px-5 py-4 bg-muted/40">
            <ThreadBubbles
              visitorName={thread.name}
              initialMessage={thread.message}
              initialSentAt={thread.created_at}
              replies={thread.replies}
              perspective="visitor"
              agentLabel={AGENT_LABEL}
            />
            <div ref={threadEndRef} />
          </div>

          {/* Composer or closed notice */}
          {isClosed ? (
            <div className="px-5 py-4 shrink-0">
              <div className="rounded-2xl bg-muted px-4 py-3 flex items-center gap-3">
                <Lock className="size-4 text-muted-foreground shrink-0" />
                <p className="text-sm text-muted-foreground flex-1">
                  This conversation is closed.
                </p>
                <Link
                  to="/contact"
                  className="inline-flex items-center justify-center rounded-xl bg-foreground text-background px-3 py-1.5 text-xs font-medium hover:opacity-80 transition-opacity shrink-0"
                >
                  Start new
                </Link>
              </div>
            </div>
          ) : (
            <div className="px-4 py-3 shrink-0">
              {replyError && (
                <p className="text-xs text-destructive mb-2">{replyError}</p>
              )}
              <div className="flex gap-3 items-end">
                <Textarea
                  placeholder="Reply... (Ctrl+Enter to send)"
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  onKeyDown={handleKeyDown}
                  rows={3}
                  disabled={postReply.isPending}
                  className="flex-1 resize-none text-sm rounded-xl border-0 bg-muted shadow-none focus-visible:ring-2 focus-visible:ring-ring/40"
                />
                <button
                  onClick={handleReply}
                  disabled={!replyText.trim() || postReply.isPending}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-foreground text-background text-sm font-medium transition-opacity disabled:opacity-40 hover:opacity-80 shrink-0"
                >
                  <Send className="size-4" />
                  {postReply.isPending ? 'Sending...' : 'Send'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
