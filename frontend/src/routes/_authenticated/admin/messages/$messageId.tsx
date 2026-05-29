import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState, useRef, useEffect } from 'react'
import { ArrowLeft, Send, Trash2, Mail, ChevronDown, Check } from 'lucide-react'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { ThreadBubbles } from '@/components/messages/ThreadBubbles'
import { useApi } from '@/api/api'
import { statusConfig } from '@/api/messages/statusConfig'
import type { MessageStatus } from '@/api/messages/model'

export const Route = createFileRoute('/_authenticated/admin/messages/$messageId')({
  component: MessageDetailPage,
})

function StatusDropdown({
  value,
  onChange,
  isPending,
}: {
  value: MessageStatus
  onChange: (s: MessageStatus) => void
  isPending: boolean
}) {
  const cfg = statusConfig[value]
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          disabled={isPending}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${cfg.badge} hover:opacity-80`}
        >
          <span className={`size-1.5 rounded-full ${cfg.dot}`} />
          {cfg.label}
          <ChevronDown className="size-3 ml-0.5" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-36 rounded-xl border-0 shadow-lg">
        {(Object.keys(statusConfig) as MessageStatus[]).map((s) => (
          <DropdownMenuItem
            key={s}
            onClick={() => onChange(s)}
            className="flex items-center gap-2 text-xs rounded-lg"
          >
            <span className={`size-1.5 rounded-full ${statusConfig[s].dot}`} />
            {statusConfig[s].label}
            {s === value && <Check className="size-3 ml-auto text-muted-foreground" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function MessageDetailPage() {
  const { messageId } = Route.useParams()
  const navigate = useNavigate()
  const api = useApi()

  const [replyText, setReplyText] = useState('')
  const [selectedStatus, setSelectedStatus] = useState<MessageStatus | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState(false)
  const [replySuccess, setReplySuccess] = useState(false)
  const [markedUnread, setMarkedUnread] = useState(false)
  const replySuccessTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const unreadTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const scrollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const threadEndRef = useRef<HTMLDivElement>(null)

  const { data: msg, isLoading, error } = api.messages.useMessageQuery(messageId)
  const updateStatus = api.messages.useUpdateMessageStatus()
  const deleteMessage = api.messages.useDeleteMessage()
  const replyToMessage = api.messages.useReplyToMessage()
  const markUnread = api.messages.useMarkUnread()

  const currentStatus = selectedStatus ?? (msg?.status as MessageStatus | undefined)

  // Reset transient state when switching threads
  useEffect(() => {
    setSelectedStatus(null)
    setDeleteConfirm(false)
    setReplySuccess(false)
    setMarkedUnread(false)
    setReplyText('')
  }, [messageId])

  useEffect(() => {
    return () => {
      if (replySuccessTimerRef.current) clearTimeout(replySuccessTimerRef.current)
      if (unreadTimerRef.current) clearTimeout(unreadTimerRef.current)
      if (scrollTimerRef.current) clearTimeout(scrollTimerRef.current)
    }
  }, [])

  const handleStatusChange = async (s: MessageStatus) => {
    setSelectedStatus(s)
    await updateStatus.mutateAsync({ id: messageId, status: s })
  }

  const handleDelete = async () => {
    if (!deleteConfirm) {
      setDeleteConfirm(true)
      return
    }
    try {
      await deleteMessage.mutateAsync(messageId)
      navigate({ to: '/admin/messages' })
    } catch {
      setDeleteConfirm(false)
    }
  }

  const handleMarkUnread = async () => {
    await markUnread.mutateAsync(messageId)
    setMarkedUnread(true)
    if (unreadTimerRef.current) clearTimeout(unreadTimerRef.current)
    unreadTimerRef.current = setTimeout(() => setMarkedUnread(false), 2000)
  }

  const handleReply = async () => {
    if (!replyText.trim()) return
    await replyToMessage.mutateAsync({ id: messageId, reply_text: replyText })
    setReplyText('')
    setReplySuccess(true)
    if (replySuccessTimerRef.current) clearTimeout(replySuccessTimerRef.current)
    replySuccessTimerRef.current = setTimeout(() => setReplySuccess(false), 3000)
    if (scrollTimerRef.current) clearTimeout(scrollTimerRef.current)
    scrollTimerRef.current = setTimeout(
      () => threadEndRef.current?.scrollIntoView({ behavior: 'smooth' }),
      100,
    )
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      handleReply()
    }
  }

  if (isLoading) {
    return (
      <div className="flex flex-col h-full rounded-2xl bg-card shadow-[0_2px_12px_-4px_rgb(0,0,0,0.06)] overflow-hidden">
        <div className="flex items-center gap-4 p-4">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-7 w-20 ml-auto rounded-full" />
        </div>
        <div className="flex-1 p-6 space-y-4">
          <Skeleton className="h-24 w-3/4 rounded-2xl" />
          <Skeleton className="h-20 w-2/3 ml-auto rounded-2xl" />
        </div>
      </div>
    )
  }

  if (error || !msg) {
    return (
      <div className="rounded-2xl bg-destructive/10 p-4">
        <p className="text-sm text-destructive">Message not found.</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full rounded-2xl bg-card shadow-[0_2px_12px_-4px_rgb(0,0,0,0.06)] overflow-hidden">
      {/* Ticket header */}
      <div className="flex items-center gap-3 px-4 py-3 shrink-0">
        <button
          onClick={() => navigate({ to: '/admin/messages' })}
          aria-label="Back to conversations"
          className="md:hidden flex items-center justify-center size-8 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted"
        >
          <ArrowLeft className="size-4" />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-foreground truncate">{msg.name}</span>
            <span className="text-muted-foreground text-sm hidden sm:inline">·</span>
            <a
              href={`mailto:${msg.email}`}
              className="text-sm text-muted-foreground hover:text-foreground hover:underline truncate hidden sm:inline"
            >
              {msg.email}
            </a>
          </div>
          <p className="text-xs text-muted-foreground">
            Received {new Date(msg.created_at).toLocaleString()}
          </p>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {currentStatus && (
            <StatusDropdown
              value={currentStatus}
              onChange={handleStatusChange}
              isPending={updateStatus.isPending}
            />
          )}

          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={handleMarkUnread}
                disabled={markUnread.isPending}
                aria-label="Mark as unread"
                className={`flex items-center justify-center size-8 rounded-full transition-colors ${
                  markedUnread
                    ? 'bg-green-100 text-green-700'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                }`}
              >
                {markedUnread ? <Check className="size-4" /> : <Mail className="size-4" />}
              </button>
            </TooltipTrigger>
            <TooltipContent>
              {markedUnread ? 'Marked unread' : 'Mark as unread'}
            </TooltipContent>
          </Tooltip>

          <button
            onClick={handleDelete}
            disabled={deleteMessage.isPending}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              deleteConfirm
                ? 'bg-red-600 text-white hover:bg-red-700'
                : 'text-muted-foreground hover:text-destructive hover:bg-destructive/10'
            }`}
          >
            <Trash2 className="size-3.5" />
            {deleteConfirm ? 'Confirm' : 'Delete'}
          </button>
          {deleteConfirm && (
            <button
              onClick={() => setDeleteConfirm(false)}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors px-2"
            >
              Cancel
            </button>
          )}
        </div>
      </div>

      {/* Conversation thread */}
      <div className="flex-1 overflow-y-auto scrollbar-thin px-6 py-4 bg-muted/40">
        <ThreadBubbles
          visitorName={msg.name}
          initialMessage={msg.message}
          initialSentAt={msg.created_at}
          replies={msg.replies}
          perspective="admin"
        />
        <div ref={threadEndRef} />
      </div>

      {/* Reply composer */}
      <div className="bg-card px-4 py-3 shrink-0">
        {replySuccess && (
          <p className="text-xs text-green-600 mb-2">Reply sent successfully.</p>
        )}
        {replyToMessage.isError && (
          <p className="text-xs text-destructive mb-2">Failed to send reply. Try again.</p>
        )}
        <div className="flex gap-3 items-end">
          <Textarea
            placeholder={`Reply to ${msg.name}… (Ctrl+Enter to send)`}
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={3}
            disabled={replyToMessage.isPending}
            className="flex-1 resize-none text-sm rounded-xl border-0 bg-muted shadow-none focus-visible:ring-2 focus-visible:ring-ring/40"
          />
          <button
            onClick={handleReply}
            disabled={!replyText.trim() || replyToMessage.isPending}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-foreground text-background text-sm font-medium transition-opacity disabled:opacity-40 hover:opacity-80 shrink-0"
          >
            <Send className="size-4" />
            {replyToMessage.isPending ? 'Sending…' : 'Send'}
          </button>
        </div>
      </div>
    </div>
  )
}
