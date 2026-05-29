import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { _publicGet, _publicPost } from '@/api/helpers'
import type { Thread, VisitorReply } from './model'

const BASE = 'public/messages'
export const MY_THREAD_KEY = ['publicMessages', 'me'] as const

export function useVerifyLink() {
  const queryClient = useQueryClient()
  return useMutation({
    // Backend expects `token` as a query param, not a body.
    mutationFn: (token: string) =>
      _publicPost<Thread>(`${BASE}/verify-link`, null, { token }),
    onSuccess: (data) => queryClient.setQueryData(MY_THREAD_KEY, data),
  })
}

export function useMyThreadQuery(enabled = true) {
  return useQuery({
    queryKey: MY_THREAD_KEY,
    queryFn: () => _publicGet<Thread>(`${BASE}/me`),
    enabled,
    retry: false,
    refetchOnWindowFocus: true,
    staleTime: 10_000,
  })
}

export function usePostVisitorReply() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (text: string) => {
      const body: VisitorReply = { text }
      return _publicPost<Thread>(`${BASE}/me/reply`, body)
    },
    onSuccess: (data) => queryClient.setQueryData(MY_THREAD_KEY, data),
  })
}
