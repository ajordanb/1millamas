import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/hooks/useAuth'
import type {
  Participant,
  RegisterParticipantInput,
  UpdateParticipantInput,
} from './model'

const ME_KEY = ['participant', 'me']
const ADMIN_KEY = ['participants', 'all']

function toFormData(input: RegisterParticipantInput | UpdateParticipantInput): FormData {
  const fd = new FormData()
  if (input.full_name != null) fd.append('full_name', input.full_name)
  if (input.display_name != null) fd.append('display_name', input.display_name)
  if (input.discipline != null) fd.append('discipline', input.discipline)
  if (input.city) fd.append('city', input.city)
  if (input.phone) fd.append('phone', input.phone)
  if (input.donation_proof) fd.append('donation_proof', input.donation_proof)
  return fd
}

/** Authenticated participant + admin operations. */
export function participantApi() {
  const { authGet, authDelete, authPostForm, authPutForm } = useAuth()
  const queryClient = useQueryClient()

  // Fetch a short-lived signed URL to view a donation screenshot (on click).
  const getMyProofUrl = async (): Promise<string> => {
    const res = (await authGet<{ url: string }>('participant/me/proof-url')) as { url: string }
    return res.url
  }
  const getParticipantProofUrl = async (id: string): Promise<string> => {
    const res = (await authGet<{ url: string }>(`participants/${id}/proof-url`)) as { url: string }
    return res.url
  }

  const useMyRegistrationQuery = () =>
    useQuery({
      queryKey: ME_KEY,
      queryFn: async () => (await authGet<Participant | null>('participant/me')) as Participant | null,
    })

  const useRegister = () =>
    useMutation({
      mutationFn: async (input: RegisterParticipantInput) =>
        (await authPostForm<Participant>('participant/register', toFormData(input))) as Participant,
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ME_KEY })
      },
    })

  const useUpdateMyRegistration = () =>
    useMutation({
      mutationFn: async (input: UpdateParticipantInput) =>
        (await authPutForm<Participant>('participant/me', toFormData(input))) as Participant,
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ME_KEY })
      },
    })

  // --- admin ---
  const useAllParticipantsQuery = () =>
    useQuery({
      queryKey: ADMIN_KEY,
      queryFn: async () => (await authGet<Participant[]>('participants')) as Participant[],
    })

  const useDeleteParticipant = () =>
    useMutation({
      mutationFn: async (id: string) => authDelete(`participants/${id}`),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ADMIN_KEY })
      },
    })

  return {
    useMyRegistrationQuery,
    useRegister,
    useUpdateMyRegistration,
    useAllParticipantsQuery,
    useDeleteParticipant,
    getMyProofUrl,
    getParticipantProofUrl,
  }
}
