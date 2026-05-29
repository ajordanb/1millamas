from typing import  Optional

from app.core.config import settings
from fastapi import Form
from fastapi.security import OAuth2PasswordBearer
from passlib.context import CryptContext

ACCESS_TOKEN_EXPIRE_MINUTES = settings.token_expire_minutes
REFRESH_TOKEN_EXPIRE_MINUTES = settings.refresh_token_expire_minutes
ALGORITHM = "HS256"
JWT_SECRET_KEY = settings.secret_key
JWT_REFRESH_SECRET_KEY = settings.authjwt_refresh_key

password_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
if settings.mount_point:
    reusable_oauth = OAuth2PasswordBearer(tokenUrl=f"/{settings.mount_point}/auth/token",
                                           scheme_name="JWT",
                                           auto_error=True)
else:
    reusable_oauth = OAuth2PasswordBearer(tokenUrl=f"/auth/token",
                                           scheme_name="JWT",
                                           auto_error=True)


class CustomOAuth2RequestForm:
    def __init__(
            self,
            grant_type: str = Form(None, pattern="password"),
            username: str = Form(None),
            password: str = Form(None),
            client_id: Optional[str] = Form(None),
            client_secret: Optional[str] = Form(None),
            payload: Optional[dict] = Form(None)
    ):
        self.grant_type = grant_type
        self.username = username
        self.password = password
        self.client_id = client_id
        self.client_secret = client_secret
        self.payload = payload or {}


def get_hashed_password(password: str) -> str:
    return password_context.hash(password)


def verify_password(password: str, hashed_pass: str) -> bool:
    try:
        return password_context.verify(password, hashed_pass)
    except Exception as e:
        return False
