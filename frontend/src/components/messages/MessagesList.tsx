import { useMemo, useState } from 'react'
import { Link, useRouterState } from '@tanstack/react-router'
import { Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { messagesApi } from '@/api/messages/messagesApi'
import type { Message, MessageStatus } from '@/api/messages/model'
import { statusConfig } from '@/api/messages/statusConfig'

const STATUS_OPTIONS: Array<MessageStatus | 'all'> = [
  'all',
  'pending',
  'open',
  'closed',
]

function useActiveMessageId(): string | undefined {
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  const match = pathname.match(/\/admin\/messages\/([^/]+)/)
  return match?.[1]
}

function formatRelative(iso: string): string {
  const date = new Date(iso)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMin = Math.floor(diffMs / 60000)
  if (diffMin < 1) return 'Just now'
  if (diffMin < 60) return `${diffMin}m`
  const diffHr = Math.floor(diffMin / 60)
  if (diffHr < 24) return `${diffHr}h`
  const diffDay = Math.floor(diffHr / 24)
  if (diffDay === 1) return 'Yesterday'
  if (diffDay < 7) return `${diffDay}d`
  return date.toLocaleDateString()
}

function ThreadRow({
  message,
  active,
}: {
  message: Message
  active: boolean
}) {
  const lastEvent = message.replies[message.replies.length - 1]
  const preview = lastEvent?.text ?? message.message
  const lastAt = lastEvent?.sent_at ?? message.created_at

  return (
    <Link
      to="/admin/messages/$messageId"
      params={{ messageId: message.id }}
      className={`flex flex-col items-start gap-1 px-4 py-3 text-sm leading-tight transition-colors border-l-2 ${
        active
          ? 'bg-muted border-primary'
          : 'border-transparent hover:bg-muted/60'
      }`}
    >
      <div className="flex w-full items-center gap-2">
        {message.unread_by_agent && (
          <span
            aria-hidden
            className="size-2 shrink-0 rounded-full bg-primary"
          />
        )}
        <span
          className={`truncate ${message.unread_by_agent ? 'font-semibold text-foreground' : 'font-medium text-foreground'}`}
        >
          {message.name}
        </span>
        <span className="ml-auto text-xs text-muted-foreground shrink-0">
          {formatRelative(lastAt)}
        </span>
      </div>
      <span className="line-clamp-2 text-xs text-muted-foreground whitespace-break-spaces">
        {preview}
      </span>
    </Link>
  )
}

export function MessagesList() {
  const api = messagesApi()
  const [statusFilter, setStatusFilter] = useState<MessageStatus | 'all'>('all')
  const [unreadOnly, setUnreadOnly] = useState(false)
  const [search, setSearch] = useState('')

  const { data: messages = [] } = api.useMessagesQuery(
    statusFilter === 'all' ? undefined : statusFilter,
  )
  const activeId = useActiveMessageId()

  const filtered = useMemo(() => {
    let list = messages
    if (unreadOnly) list = list.filter((m) => m.unread_by_agent)
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(
        (m) =>
          m.name.toLowerCase().includes(q) ||
          m.email.toLowerCase().includes(q) ||
          m.message.toLowerCase().includes(q),
      )
    }
    return list
  }, [messages, unreadOnly, search])

  return (
    <div className="flex h-full flex-col">
      <div className="p-4 space-y-3 shrink-0">
        <h2 className="text-base font-semibold tracking-tight text-foreground">
          Messages
        </h2>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground/70" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search conversations..."
            className="h-9 pl-9 rounded-lg border-0 bg-muted shadow-none focus-visible:ring-2 focus-visible:ring-ring/40"
          />
        </div>

        <div className="flex items-center gap-1 text-xs">
          {STATUS_OPTIONS.map((s) => {
            const isActive = statusFilter === s
            const label = s === 'all' ? 'All' : statusConfig[s].label
            return (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-2.5 py-1 rounded-full font-medium transition-colors ${
                  isActive
                    ? 'bg-foreground text-background'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                }`}
              >
                {label}
              </button>
            )
          })}
          <button
            onClick={() => setUnreadOnly((v) => !v)}
            className={`ml-auto px-2.5 py-1 rounded-full font-medium transition-colors ${
              unreadOnly
                ? 'bg-foreground text-background'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted'
            }`}
          >
            Unread
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin">
        {filtered.length === 0 ? (
          <div className="px-4 py-8 text-center text-xs text-muted-foreground">
            {messages.length === 0 ? 'No conversations yet' : 'No matches'}
          </div>
        ) : (
          filtered.map((m) => (
            <ThreadRow key={m.id} message={m} active={m.id === activeId} />
          ))
        )}
      </div>
    </div>
  )
}

export { useActiveMessageId }
