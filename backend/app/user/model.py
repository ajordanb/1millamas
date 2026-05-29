from datetime import datetime, UTC
from typing import List, Self, Optional, Tuple
from beanie import PydanticObjectId, Document
from fastapi import HTTPException
from pydantic import BaseModel, Field
from pymongo import IndexModel

from app.role.model import RoleBase, Role



class Activity(BaseModel):
    payload: dict = Field(default_factory=dict, description="Additional data payload for the activity")
    activity_date: datetime = Field(default_factory=lambda: datetime.now(UTC), description="Timestamp when the activity occurred")


class LoginActivity(Activity):
    pass

class Access(BaseModel):
    scopes: List[str] = Field(default_factory=list, description="List of permission scopes granted")
    active: Optional[bool] = Field(default=True, description="Whether the access is currently active")


class APIKey(Access):
    client_id: str = Field(description="Unique identifier for the API client")
    hashed_client_secret: str = Field(description="Hashed version of the client secret for security")


class PSK(Access):
    psk: str = Field(description="Pre-shared key for authentication")


class CreateAPIKey(Access):
    """Model for creating a new API key with unhashed secret"""
    client_id: str = Field(description="Unique identifier for the API client")
    client_secret: str = Field(description="Unhashed client secret (will be hashed by service)")


class UpdateAPIKey(BaseModel):
    """Model for updating an API key - all fields optional except client_id"""
    client_id: str = Field(description="Unique identifier for the API client")
    client_secret: Optional[str] = Field(default=None, description="New client secret (will be hashed if provided)")
    scopes: Optional[List[str]] = Field(default=None, description="List of permission scopes granted")
    active: Optional[bool] = Field(default=None, description="Whether the access is currently active")


class CreateAPIKeyRequest(BaseModel):
    """Request model for creating an API key - matches frontend format"""
    email: str = Field(description="Email of the user to create API key for")
    scopes: List[str] = Field(default_factory=list, description="List of permission scopes granted")
    active: bool = Field(default=True, description="Whether the API key is active")


class UserBase(BaseModel):
    """User Base Model"""
    username: Optional[str] = Field(None, alias="email", description="Username for the user account")
    email: str = Field(None, alias="email", description="Email address of the user")
    name: str | None = Field(None, alias="name", description="Full name of the user")
    source: str = Field(default="", description="Source system where the user originated")
    email_confirmed: bool = Field(default=False, description="Whether the user's email has been confirmed")
    is_active: bool = Field(default=True, description="Whether the user account is active")
    password_reset_code: str | None = Field(default=None, description="Temporary code for password reset")
    api_keys: List[APIKey] = Field(default_factory=list, description="List of API keys associated with the user")
    roles: List[PydanticObjectId] = Field(default_factory=list, description="List of role IDs assigned to the user")
    last_login_activity: Optional[LoginActivity] = Field(default=None, description="Details of the user's last login")
    last_passwords: List[str] = Field(default_factory=list, max_length=5, description="History of last 5 password hashes for security")

    # These properties are not serialized.
    _using_api_key: str | None = None
    """True when the current user has been authenticated via an API key instead of OAuth2. Not stored in DB."""
    _api_key: APIKey | None = None
    """If using_api_key is True, a valid reference to the API key that the user authenticated with."""

    def get_api_key(self, client_id: str) -> APIKey:
        api_key = [x for x in self.api_keys if x.client_id == client_id]
        if len(api_key) == 0:
            raise ValueError(f"API key {api_key} not found for user {self.name}")
        return api_key[0]




class UserAuth(UserBase):
    password: str | None = Field(
        default=None,
        description="Hashed password for user authentication. None for social-only accounts.",
    )


class UserOut(UserBase):
    """User out model"""
    id: PydanticObjectId = Field(default=None, description="Unique identifier for the user")
    roles: List[RoleBase] = Field(description="List of roles assigned to the user with full details")



class UpdatePassword(BaseModel):
    """Update user password"""
    current_password: str = Field(description="Current password for verification")
    new_password: str = Field(description="New password to set for the user")


class UserUpdateRequest(BaseModel):
    """User update request model - accepts role names instead of ObjectIds"""
    id: PydanticObjectId = Field(description="User ID to update")
    username: Optional[str] = Field(None, alias="email", description="Username for the user account")
    email: str = Field(description="Email address of the user")
    name: str | None = Field(None, description="Full name of the user")
    source: str = Field(default="", description="Source system where the user originated")
    email_confirmed: bool = Field(default=False, description="Whether the user's email has been confirmed")
    is_active: bool = Field(default=True, description="Whether the user account is active")
    roles: List[str] = Field(default_factory=list, description="List of role names (will be converted to ObjectIds)")
    api_keys: List[APIKey] = Field(default_factory=list, description="List of API keys associated with the user")


class User(Document, UserAuth):
    class Settings:
        name = "User"
        indexes = [
            IndexModel("email", unique=True),
            IndexModel("api_keys.client_id"),  # More specific index for API key lookups
            IndexModel([("source", 1), ("email_confirmed", 1)]),  # Compound index for filtering
            IndexModel("roles"),  # Index for role-based queries
            IndexModel("is_active"),  # Index for filtering active users
        ]

    def __repr__(self) -> str:
        return f"<User {self.email}>"

    def __str__(self) -> str:
        return self.email

    def __hash__(self) -> int:
        return hash(self.email)

    def __eq__(self, other: object) -> bool:
        if isinstance(other, User):
            return self.email == other.email
        return False

    @property
    def created(self) -> datetime:
        """Datetime user was created from ID"""
        return self.id.generation_time

    @classmethod
    async def all_users(cls, skip: int = 0, limit: int = 100) -> List[Self]:
        """Get all users"""
        return await cls.find().skip(skip).limit(limit).to_list()

    @classmethod
    async def by_username(cls, _username: str) -> Self:
        """Get a user by email"""
        return await cls.find_one({"username": _username})

    @classmethod
    async def by_email(cls, _email: str) -> Self:
        """Get a user by email"""
        return await cls.find_one({"email": _email})

    @classmethod
    async def by_id(cls, _id: PydanticObjectId | str) -> Self:
        """Get a user by id"""
        if isinstance(_id, PydanticObjectId):
            _id = str(_id)
        return await cls.get(_id)

    @classmethod
    async def by_client_id(cls, client_id: str, raise_on_zero=True) -> Self:
        results = await cls.find({"api_keys.client_id": client_id}).to_list()
        if len(results) == 0:
            if raise_on_zero:
                raise HTTPException(status_code=401, detail="Invalid API Key: No matching user found.")
            return None
        if len(results) >= 2:
            raise HTTPException(status_code=401, detail="Invalid API Key: More than one matching user.")
        return results[0]

    @classmethod
    async def has_role(cls, role_id: PydanticObjectId | str ) -> List[Self]:
        if isinstance(role_id, str):
            role_id = PydanticObjectId(role_id)
        results = await cls.find({"roles": role_id}).to_list()
        return results

    async def user_roles(self) -> List[RoleBase]:
        """Get all user roles, by their ids"""
        roles = await Role.find({"_id": {"$in": self.roles}}).to_list()
        return roles

    async def get_user_scopes_and_roles(self) -> Tuple[List[str], List[str]]:
        user_roles = await self.user_roles()
        user_role_names: List = [role.name for role in user_roles]
        scopes: List = [f"{role.name}:{scope}" for role in user_roles for scope in role.scopes]
        return scopes, user_role_names

    def log_login(self, payload: dict):
        self.last_login_activity = LoginActivity(
            activity_date=datetime.now(UTC),
            payload=payload,
        )
