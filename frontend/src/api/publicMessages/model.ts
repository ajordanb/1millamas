import type { MessageStatus, Reply } from '@/api/messages/model'

/**
 * Visitor-facing thread DTO returned by /public/messages endpoints.
 * Intentionally omits admin-only fields like `email` and `unread_by_agent`.
 */
export interface Thread {
  id: string
  name: string
  message: string
  status: MessageStatus
  created_at: string
  replies: Reply[]
}

export interface VisitorReply {
  text: string
}
