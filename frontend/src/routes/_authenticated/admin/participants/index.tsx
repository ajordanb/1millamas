import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { Bike, Footprints, Trash2 } from 'lucide-react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ProofLink } from '@/components/challenge/ProofLink'
import { useAuth } from '@/hooks/useAuth'
import { participantApi } from '@/api/participant/participantApi'
import type { Participant } from '@/api/participant/model'

export const Route = createFileRoute('/_authenticated/admin/participants/')({
  component: AdminParticipants,
})

function DisciplineBadge({ d }: { d: Participant['discipline'] }) {
  const isRun = d === 'run'
  const Icon = isRun ? Footprints : Bike
  return (
    <Badge variant={isRun ? 'default' : 'secondary'} className="gap-1">
      <Icon className="size-3" />
      {isRun ? 'Run' : 'Bike'}
    </Badge>
  )
}

function AdminParticipants() {
  const { hasRole } = useAuth()
  const navigate = useNavigate()
  const api = participantApi()
  const { data, isLoading, isError } = api.useAllParticipantsQuery()
  const deleteMutation = api.useDeleteParticipant()
  const [confirmId, setConfirmId] = useState<string | null>(null)

  // Only admins belong here.
  useEffect(() => {
    if (!hasRole('admin')) navigate({ to: '/me', replace: true })
  }, [hasRole, navigate])

  const participants = data ?? []
  const runners = participants.filter((p) => p.discipline === 'run').length
  const cyclists = participants.filter((p) => p.discipline === 'bike').length

  const handleDelete = async (id: string) => {
    if (confirmId !== id) {
      setConfirmId(id)
      return
    }
    await deleteMutation.mutateAsync(id)
    setConfirmId(null)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Participants</h1>
        <p className="text-sm text-muted-foreground">
          {participants.length} registered · {runners} runners · {cyclists} cyclists
        </p>
      </div>

      <div className="rounded-xl border bg-card">
        {isLoading ? (
          <p className="p-8 text-center text-sm text-muted-foreground">Loading…</p>
        ) : isError ? (
          <p className="p-8 text-center text-sm text-muted-foreground">
            Couldn't load participants.
          </p>
        ) : participants.length === 0 ? (
          <p className="p-8 text-center text-sm text-muted-foreground">No registrations yet.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Display name</TableHead>
                <TableHead>Full name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Discipline</TableHead>
                <TableHead>Goal</TableHead>
                <TableHead>City</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Proof</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {participants.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.display_name}</TableCell>
                  <TableCell>{p.full_name}</TableCell>
                  <TableCell className="text-muted-foreground">{p.user_email}</TableCell>
                  <TableCell>
                    <DisciplineBadge d={p.discipline} />
                  </TableCell>
                  <TableCell className="tabular-nums">{p.goal_km.toLocaleString()} km</TableCell>
                  <TableCell>{p.city ?? '—'}</TableCell>
                  <TableCell>{p.phone ?? '—'}</TableCell>
                  <TableCell>
                    {p.donation_proof_url ? (
                      <ProofLink
                        resolve={() => api.getParticipantProofUrl(p.id)}
                        className="text-primary hover:underline"
                      >
                        View
                      </ProofLink>
                    ) : (
                      '—'
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant={confirmId === p.id ? 'destructive' : 'ghost'}
                      size="sm"
                      onClick={() => handleDelete(p.id)}
                      onBlur={() => setConfirmId((c) => (c === p.id ? null : c))}
                      disabled={deleteMutation.isPending}
                    >
                      <Trash2 className="size-4" />
                      {confirmId === p.id ? 'Confirm' : ''}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  )
}
