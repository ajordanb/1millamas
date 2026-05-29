from datetime import datetime, UTC

from beanie import PydanticObjectId
from fastapi import HTTPException
from loguru import logger

from app.participant.model import (
    GOAL_KM,
    Participant,
    ParticipantCreate,
    ParticipantSelfUpdate,
)


class ParticipantService:
    """Business logic for race participants. Distance is tracked on Strava."""

    async def get_by_id(self, participant_id: str) -> Participant:
        try:
            obj_id = PydanticObjectId(participant_id)
        except Exception:
            raise HTTPException(status_code=400, detail="Invalid participant ID")
        doc = await Participant.get(obj_id)
        if not doc:
            raise HTTPException(status_code=404, detail="Participant not found")
        return doc

    async def get_me(self, email: str) -> Participant | None:
        return await Participant.by_email(email)

    async def register(
        self,
        email: str,
        data: ParticipantCreate,
        donation_proof_url: str | None,
    ) -> Participant:
        """Register the current user for the race. Auto-approved on upload."""
        existing = await Participant.by_email(email)
        if existing:
            raise HTTPException(
                status_code=400,
                detail="You're already registered. Edit your registration from your dashboard.",
            )
        participant = Participant(
            user_email=email,
            full_name=data.full_name,
            display_name=data.display_name,
            city=data.city,
            phone=data.phone,
            discipline=data.discipline,
            goal_km=GOAL_KM[data.discipline],
            donation_proof_url=donation_proof_url,
        )
        await participant.insert()
        logger.info("Registered participant {} ({})", email, data.discipline)
        return participant

    async def update_me(
        self,
        email: str,
        data: ParticipantSelfUpdate,
        donation_proof_url: str | None = None,
    ) -> Participant:
        participant = await Participant.by_email(email)
        if not participant:
            raise HTTPException(status_code=404, detail="You are not registered yet.")
        update = data.model_dump(exclude_unset=True)
        # Changing discipline re-derives the goal.
        if update.get("discipline") is not None:
            participant.discipline = update["discipline"]
            participant.goal_km = GOAL_KM[participant.discipline]
        for field in ("full_name", "display_name", "city", "phone"):
            if update.get(field) is not None:
                setattr(participant, field, update[field])
        if donation_proof_url:
            participant.donation_proof_url = donation_proof_url
        participant.updated_at = datetime.now(UTC)
        await participant.save()
        return participant

    async def list_all(self, skip: int = 0, limit: int = 500) -> list[Participant]:
        return await Participant.find().sort("-created_at").skip(skip).limit(limit).to_list()

    async def delete(self, participant_id: str) -> None:
        participant = await self.get_by_id(participant_id)
        await participant.delete()
        logger.info("Deleted participant {}", participant_id)
