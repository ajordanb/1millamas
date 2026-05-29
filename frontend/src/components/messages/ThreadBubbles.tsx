import { useMemo } from 'react'
import { Headphones, User } from 'lucide-react'
import type { Reply, ReplyAuthor } from '@/api/messages/model'

type Perspective = 'admin' | 'visitor'

interface ThreadBubblesProps {
  visitorName: string
  initialMessage: string
  initialSentAt: string
  replies: Reply[]
  perspective: Perspective
  agentLabel?: string
}

interface Event {
  key: string
  author: ReplyAuthor
  text: string
  sentAt: string
}

export function ThreadBubbles({
  visitorName,
  initialMessage,
  initialSentAt,
  replies,
  perspective,
  agentLabel = 'Support',
}: ThreadBubblesProps) {
  const events = useMemo<Event[]>(() => {
    const initial: Event = {
      key: `initial:${initialSentAt}`,
      author: 'visitor',
      text: initialMessage,
      sentAt: initialSentAt,
    }
    const rest: Event[] = replies.map((r, i) => ({
      key: `reply:${r.sent_at}:${i}`,
      author: r.author,
      text: r.text,
      sentAt: r.sent_at,
    }))
    return [initial, ...rest].sort(
      (a, b) => new Date(a.sentAt).getTime() - new Date(b.sentAt).getTime(),
    )
  }, [initialMessage, initialSentAt, replies])

  return (
    <div className="space-y-4">
      {events.map((event) => {
        const isAgent = event.author === 'agent'
        const isSelf =
          (perspective === 'admin' && isAgent) ||
          (perspective === 'visitor' && !isAgent)
        const displayName = isAgent
          ? perspective === 'admin'
            ? 'You'
            : agentLabel
          : perspective === 'visitor'
            ? 'You'
            : visitorName

        return (
          <div
            key={event.key}
            className={`flex gap-3 ${isSelf ? 'justify-end' : ''}`}
          >
            {!isSelf && (
              <Avatar kind={isAgent ? 'agent' : 'visitor'} />
            )}
            <div className="max-w-[75%]">
              <div
                className={`flex items-baseline gap-2 mb-1 ${isSelf ? 'justify-end' : ''}`}
              >
                {isSelf && (
                  <span className="text-xs text-muted-foreground">
                    {formatTime(event.sentAt)}
                  </span>
                )}
                <span className="text-xs font-medium text-foreground">
                  {displayName}
                </span>
                {!isSelf && (
                  <span className="text-xs text-muted-foreground">
                    {formatTime(event.sentAt)}
                  </span>
                )}
              </div>
              <div
                className={
                  isAgent
                    ? `rounded-2xl px-4 py-3 shadow-sm bg-foreground text-background ${isSelf ? 'rounded-tr-sm' : 'rounded-tl-sm'}`
                    : `rounded-2xl px-4 py-3 shadow-sm bg-card ${isSelf ? 'rounded-tr-sm' : 'rounded-tl-sm'}`
                }
              >
                <p className="text-sm leading-relaxed whitespace-pre-wrap">
                  {event.text}
                </p>
              </div>
            </div>
            {isSelf && <Avatar kind={isAgent ? 'agent' : 'visitor'} />}
          </div>
        )
      })}
    </div>
  )
}

function Avatar({ kind }: { kind: 'visitor' | 'agent' }) {
  return kind === 'agent' ? (
    <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-foreground text-background mt-0.5">
      <Headphones className="size-4" />
    </div>
  ) : (
    <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-slate-200 text-slate-600 mt-0.5">
      <User className="size-4" />
    </div>
  )
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleString()
}
