export type MessageStatus = 'pending' | 'open' | 'closed'

export type ReplyAuthor = 'visitor' | 'agent'

export interface Reply {
  text: string
  author: ReplyAuthor
  sent_at: string
}

export interface Message {
  id: string
  name: string
  email: string
  message: string
  status: MessageStatus
  created_at: string
  replies: Reply[]
  unread_by_agent: boolean
}

export interface MessageUpdate {
  status: MessageStatus
}

export interface MessageReply {
  reply_text: string
}

export interface UnreadCount {
  count: number
}
