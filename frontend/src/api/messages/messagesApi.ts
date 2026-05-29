import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/hooks/useAuth'
import type { Message, MessageStatus, MessageReply, UnreadCount } from './model'

const BASE = 'messages'
const UNREAD_COUNT_KEY = ['messages', 'unread-count']

export function messagesApi() {
  const { authGet, authPatch, authPost, authDelete } = useAuth()
  const queryClient = useQueryClient()

  const invalidateUnreadCount = () =>
    queryClient.invalidateQueries({ queryKey: UNREAD_COUNT_KEY })

  const useMessagesQuery = (status?: MessageStatus) =>
    useQuery({
      queryKey: ['messages', status ?? 'all'],
      queryFn: async () => {
        const result = await authGet<Message[]>(BASE, {
          params: status ? { status } : undefined,
        })
        return result as Message[]
      },
    })

  const useMessageQuery = (id: string) =>
    useQuery({
      queryKey: ['messages', id],
      queryFn: async () => {
        const result = (await authGet<Message>(`${BASE}/${id}`)) as Message
        if (result.unread_by_agent === false) {
          invalidateUnreadCount()
          queryClient.invalidateQueries({ queryKey: ['messages', 'all'] })
        }
        return result
      },
      enabled: !!id,
    })

  const useUnreadCountQuery = () =>
    useQuery({
      queryKey: UNREAD_COUNT_KEY,
      queryFn: async () => {
        const result = await authGet<UnreadCount>(`${BASE}/unread-count`)
        return result as UnreadCount
      },
      refetchInterval: 30_000,
      refetchOnWindowFocus: true,
      staleTime: 10_000,
    })

  const useUpdateMessageStatus = () =>
    useMutation({
      mutationFn: async ({ id, status }: { id: string; status: MessageStatus }) => {
        const result = await authPatch<Message>(`${BASE}/${id}`, { status })
        return result as Message
      },
      onSuccess: (_, { id }) => {
        queryClient.invalidateQueries({ queryKey: ['messages'] })
        queryClient.invalidateQueries({ queryKey: ['messages', id] })
      },
    })

  const useDeleteMessage = () =>
    useMutation({
      mutationFn: async (id: string) => {
        return authDelete(`${BASE}/${id}`)
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['messages'] })
        invalidateUnreadCount()
      },
    })

  const useReplyToMessage = () =>
    useMutation({
      mutationFn: async ({ id, reply_text }: { id: string; reply_text: string }) => {
        const body: MessageReply = { reply_text }
        return authPost(`${BASE}/${id}/reply`, body)
      },
      onSuccess: (_, { id }) => {
        queryClient.invalidateQueries({ queryKey: ['messages', id] })
        queryClient.invalidateQueries({ queryKey: ['messages', 'all'] })
        invalidateUnreadCount()
      },
    })

  const useMarkUnread = () =>
    useMutation({
      mutationFn: async (id: string) => {
        const result = await authPost<Message>(`${BASE}/${id}/mark-unread`, {})
        return result as Message
      },
      onSuccess: (_, id) => {
        queryClient.invalidateQueries({ queryKey: ['messages', id] })
        queryClient.invalidateQueries({ queryKey: ['messages', 'all'] })
        invalidateUnreadCount()
      },
    })

  return {
    useMessagesQuery,
    useMessageQuery,
    useUnreadCountQuery,
    useUpdateMessageStatus,
    useDeleteMessage,
    useReplyToMessage,
    useMarkUnread,
  }
}
