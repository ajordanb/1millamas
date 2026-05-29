from datetime import datetime, UTC, timedelta
from enum import Enum
from typing import Self, List

from pydantic import BaseModel, Field
from beanie import PydanticObjectId, Document
from pymongo import IndexModel
from bson import ObjectId
from fastapi import HTTPException

from app.core.config import settings


class MagicType(str, Enum):
    magic = "magic_link"
    recovery = "password_recovery"

class MagicBase(BaseModel):
    identifier: PydanticObjectId = Field(description="ID of the user this magic link is for")
    requested_on: datetime = Field(description="When the magic link was requested")
    link_type: MagicType = Field(description="Type of magic link (magic_link or password_recovery)")
    granted: bool = Field(description="Whether access has been granted using this link")
    payload: dict = Field(description="Additional data associated with the magic link")
    model_config = {
        "json_encoders": {
            PydanticObjectId: str
        }
    }


class MagicLink(Document, MagicBase):
    class Settings:
        name = "MagicLinK"
        indexes = [
            IndexModel("identifier", unique=False)
        ]

    @property
    def created_on(self):
        return self.id.generation_time

    @classmethod
    async def by_id(cls, _id: PydanticObjectId | str) -> Self:
        """Get a user by id"""
        if isinstance(_id, str):
            _id = ObjectId(_id)
        return await cls.get(_id)

    @classmethod
    async def by_type(cls, _type: MagicType, limit: int = 10) -> List[Self]:
        return await cls.find({"link_type": _type}).sort("-_id").limit(limit).to_list()

    @classmethod
    async def by_identifier(cls, identifier: PydanticObjectId | str, limit: int = 10) -> List[Self]:
        if isinstance(identifier, str):
            identifier = ObjectId(identifier)
        return await cls.find({"identifier": identifier}).sort("-_id").limit(limit).to_list()

    @classmethod
    async def by_identifier_and_type(cls, identifier: PydanticObjectId | str,_type: MagicType,  limit: int = 10) -> List[Self]:
        if isinstance(identifier, str):
            identifier = ObjectId(identifier)
        return await cls.find({"identifier": identifier, "link_type": _type}).sort("-_id").limit(limit).to_list()

    @classmethod
    async def request_magic(cls, identifier: PydanticObjectId | str, _type: MagicType) -> Self:
        latest_links = await cls.by_identifier_and_type(identifier=identifier,_type= _type,limit= 1)
        if latest_links:
            latest_created_on = latest_links[0].created_on
            _threshold = datetime.now(UTC) - timedelta(seconds=settings.magic_link_refresh_seconds)
            if latest_created_on > _threshold:
                raise HTTPException(status_code = 429, detail="Link cannot be requested again")
            else:
                magic_link = cls.generate_magic_link(identifier,_type, True)
                await magic_link.save()
                return magic_link
        else:
            magic_link = cls.generate_magic_link(identifier, _type,True)
            await magic_link.save()  # Save to database
            return magic_link

    @classmethod
    def generate_magic_link(cls,identifier: PydanticObjectId,_type:MagicType, granted: bool)-> Self:
        dt = datetime.now(UTC)
        return cls(
            identifier=identifier,
            requested_on=dt,
            granted=granted,
            link_type=_type,
            payload= {
                "expiry": (dt + timedelta(minutes=settings.email_reset_token_expire_minutes)).isoformat(),
            }
        )