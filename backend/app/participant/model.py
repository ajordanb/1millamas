from datetime import datetime, UTC
from enum import Enum

from beanie import Document, PydanticObjectId
from pydantic import BaseModel, EmailStr, Field
from pymongo import ASCENDING, IndexModel


class Discipline(str, Enum):
    run = "run"
    bike = "bike"


# Distance goals per the poster: runners 800 km, cyclists 3,200 km.
# Distance itself is tracked on Strava — these are shown for reference.
GOAL_KM: dict[Discipline, int] = {
    Discipline.run: 800,
    Discipline.bike: 3200,
}


class ParticipantBase(BaseModel):
    full_name: str = Field(min_length=1, max_length=120, description="Participant's full name")
    display_name: str = Field(
        min_length=1, max_length=60, description="Public name (e.g. on Strava)"
    )
    city: str | None = Field(default=None, max_length=120, description="Where they're participating from")
    phone: str | None = Field(default=None, max_length=40, description="Contact phone number")
    discipline: Discipline = Field(description="Run or bike — determines the distance goal")


class ParticipantCreate(ParticipantBase):
    """Fields parsed from the multipart registration form (the image is separate)."""


class ParticipantSelfUpdate(BaseModel):
    """Fields a participant may edit about themselves."""
    full_name: str | None = Field(default=None, min_length=1, max_length=120)
    display_name: str | None = Field(default=None, min_length=1, max_length=60)
    city: str | None = Field(default=None, max_length=120)
    phone: str | None = Field(default=None, max_length=40)
    discipline: Discipline | None = None


class Participant(Document, ParticipantBase):
    user_email: EmailStr = Field(description="Email of the linked user account (unique)")
    goal_km: int = Field(description="Distance goal in km, derived from discipline")
    donation_proof_url: str | None = Field(
        default=None, description="URL of the uploaded GoFundMe donation screenshot"
    )
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(UTC))

    class Settings:
        name = "Participant"
        indexes = [
            IndexModel("user_email", unique=True),
            IndexModel([("discipline", ASCENDING)], name="discipline_idx"),
        ]

    def __repr__(self) -> str:
        return f"<Participant {self.display_name} ({self.discipline})>"

    @classmethod
    async def by_email(cls, email: str) -> "Participant | None":
        return await cls.find_one({"user_email": email})


class ProofUrlOut(BaseModel):
    """A short-lived link to view a participant's donation screenshot."""
    url: str


class ParticipantOut(BaseModel):
    """Authenticated/admin view of a participant (includes contact info)."""
    id: str
    user_email: str
    full_name: str
    display_name: str
    city: str | None = None
    phone: str | None = None
    discipline: Discipline
    goal_km: int
    donation_proof_url: str | None = None
    created_at: datetime

    @classmethod
    def from_doc(cls, doc: "Participant") -> "ParticipantOut":
        return cls(
            id=str(doc.id),
            user_email=str(doc.user_email),
            full_name=doc.full_name,
            display_name=doc.display_name,
            city=doc.city,
            phone=doc.phone,
            discipline=doc.discipline,
            goal_km=doc.goal_km,
            donation_proof_url=doc.donation_proof_url,
            created_at=doc.created_at,
        )
