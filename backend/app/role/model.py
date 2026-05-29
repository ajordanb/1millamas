from datetime import datetime
from typing import List, Self

from beanie import PydanticObjectId, Document
from pydantic import BaseModel, Field
from pymongo import IndexModel


class RoleBase(BaseModel):
    name: str = Field(description="Name of the role")
    description: str = Field(default=None, description="Description of what this role provides")
    created_by: str = Field(default=None, description="User who created this role")
    scopes: List[str] = Field(default_factory=list, description="List of permission scopes this role grants")

    model_config = {
        "json_encoders": {
            PydanticObjectId: str
        }
    }


class RoleOut(RoleBase):
    id: PydanticObjectId = Field(alias="_id", description="Unique identifier for the role")

    model_config = {
        "populate_by_name": True,
        "json_encoders": {
            PydanticObjectId: str
        }
    }

class Role(Document, RoleBase):
    class Settings:
        name = "Role"
        indexes = [
            IndexModel("name", unique=True)
        ]

    @property
    def created(self) -> datetime:
        """Datetime user was created from ID"""
        return self.id.generation_time

    @classmethod
    async def all_roles(cls, skip: int = 0, limit: int = 100) -> List[Self]:
        """Get all roles"""
        return await cls.find().skip(skip).limit(limit).to_list()

    @classmethod
    async def by_id(cls, _id: PydanticObjectId | str) -> Self:
        """Get a role by id"""
        if isinstance(_id, PydanticObjectId):
            _id = str(_id)
        return await cls.get(_id)

    @classmethod
    async def by_name(cls, _name: str) -> Self:
        """Get a role by name"""
        return await cls.find_one({"name": _name})
