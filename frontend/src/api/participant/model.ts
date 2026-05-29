export type Discipline = 'run' | 'bike'

export interface Participant {
  id: string
  user_email: string
  full_name: string
  display_name: string
  city: string | null
  phone: string | null
  discipline: Discipline
  goal_km: number
  donation_proof_url: string | null
  created_at: string
}

export interface RegisterParticipantInput {
  full_name: string
  display_name: string
  discipline: Discipline
  city?: string
  phone?: string
  donation_proof: File
}

export interface UpdateParticipantInput {
  full_name?: string
  display_name?: string
  discipline?: Discipline
  city?: string
  phone?: string
  donation_proof?: File | null
}
