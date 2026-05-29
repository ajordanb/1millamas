from datetime import datetime
from enum import Enum
from typing import Optional
from pydantic import BaseModel, model_validator, EmailStr, Field


class AccessToken(BaseModel):
    """Access token details"""

    accessToken: str = Field(description="JWT access token string")
    accessTokenExpires: datetime = Field(description="When the access token expires")
    access_token: Optional[str] = Field(default=None, description="Alternative access token field")

    @model_validator(mode="before")
    def validate_access_token(cls, values: dict):
        values["access_token"] = values["accessToken"]
        return values


class RefreshToken(AccessToken):
    """Access and refresh token details"""

    refreshToken: str = Field(description="JWT refresh token string")
    refreshTokenExpires: datetime = Field(description="When the refresh token expires")


class MsAuthRequest(BaseModel):
    code: str = Field(description="Authorization code from Microsoft")
    code_verifier: str = Field(description="PKCE code verifier")


class SocialLoginRequest(BaseModel):
    provider: str = Field(description="Name of the social login provider")
    data: dict = Field(description="Provider-specific authentication data")
    redirect_url: str | None = Field(default="", description="URL to redirect to after authentication")


class GoogleAuthToken(BaseModel):
    token: str = Field(description="Google authentication token")


class NewPassword(BaseModel):
    token: str = Field(description="Password reset token")
    new_password: str = Field(description="New password to set")


class TokenType(str, Enum):
    jwt = "jwt"
    psk = "psk"


class Token(BaseModel):
    sub: str = Field(description="Subject (user ID) of the token")
    exp: int = Field(description="Expiration timestamp")
    domain: Optional[dict] = Field(default=None, description="Domain-specific data")
    client_id: Optional[str] = Field(default=None, description="Client ID that requested the token")
    iat: datetime = Field(description="Issued at timestamp")

    @property
    def expiration_date(self) -> datetime:
        return datetime.fromtimestamp(self.exp)

    def is_expired(self, as_of=None):
        return self.expiration_date < (as_of or datetime.now())


class RefreshTokenReq(BaseModel):
    refreshToken: str = Field(description="Refresh token to exchange for new access token")


class Policy(BaseModel):
    length: int = Field(default=8, description="Minimum password length")
    uppercase: int = Field(default=1, description="Minimum number of uppercase letters")
    numbers: int = Field(default=1, description="Minimum number of numeric digits")
    nonletters: int = Field(default=1, description="Minimum number of special characters")