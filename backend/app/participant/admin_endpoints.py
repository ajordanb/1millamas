from fastapi import APIRouter, Depends, HTTPException

from app.models.util.model import Message as UtilMessage
from app.participant.model import ParticipantOut, ProofUrlOut
from app.participant.service import ParticipantService
from app.utills.dependencies import admin_access, get_participant_service, get_storage_service
from app.utills.storage.storage import StorageService

admin_participant_router = APIRouter(
    tags=["Participants (Admin)"],
    prefix="/participants",
    dependencies=[Depends(admin_access)],
)


@admin_participant_router.get("", response_model=list[ParticipantOut])
async def list_participants(
    skip: int = 0,
    limit: int = 500,
    service: ParticipantService = Depends(get_participant_service),
) -> list[ParticipantOut]:
    docs = await service.list_all(skip=skip, limit=limit)
    return [ParticipantOut.from_doc(d) for d in docs]


@admin_participant_router.get("/{participant_id}", response_model=ParticipantOut)
async def get_participant(
    participant_id: str,
    service: ParticipantService = Depends(get_participant_service),
) -> ParticipantOut:
    doc = await service.get_by_id(participant_id)
    return ParticipantOut.from_doc(doc)


@admin_participant_router.get("/{participant_id}/proof-url", response_model=ProofUrlOut)
async def participant_proof_url(
    participant_id: str,
    service: ParticipantService = Depends(get_participant_service),
    storage: StorageService = Depends(get_storage_service),
) -> ProofUrlOut:
    """Return a short-lived signed URL to view a participant's donation screenshot."""
    doc = await service.get_by_id(participant_id)
    if not doc.donation_proof_url:
        raise HTTPException(status_code=404, detail="No donation proof on file.")
    return ProofUrlOut(url=storage.view_url(doc.donation_proof_url))


@admin_participant_router.delete("/{participant_id}", response_model=UtilMessage)
async def delete_participant(
    participant_id: str,
    service: ParticipantService = Depends(get_participant_service),
) -> UtilMessage:
    await service.delete(participant_id)
    return UtilMessage(message="Participant deleted successfully")
