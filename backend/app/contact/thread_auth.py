from datetime import datetime, UTC, timedelta
from dataclasses import dataclass

import jwt
from fastapi import Cookie, HTTPException, Response
from loguru import logger
from starlette import status

from app.core.config import settings, Mode


THREAD_TOKEN_ALGORITHM = "HS256"
THREAD_TOKEN_EXPIRE_DAYS = 30
THREAD_SESSION_COOKIE = "thread_session"
THREAD_COOKIE_PATH = "/public/messages"


@dataclass
class ThreadSession:
    msg_id: str
    email: str


def mint_thread_token(msg_id: str, email: str) -> str:
    now = datetime.now(UTC)
    payload = {
        "msg_id": msg_id,
        "email": email,
        "iat": now,
        "exp": now + timedelta(days=THREAD_TOKEN_EXPIRE_DAYS),
        "typ": "thread",
    }
    return jwt.encode(payload, settings.secret_key, algorithm=THREAD_TOKEN_ALGORITHM)


def validate_thread_token(token: str) -> ThreadSession:
    """Depends: validate a thread JWT passed as the `?token=` query param."""
    try:
        payload = jwt.decode(
            token,
            settings.secret_key,
            algorithms=[THREAD_TOKEN_ALGORITHM],
        )
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Link expired")
    except jwt.PyJWTError as e:
        logger.warning("Invalid thread token: {}", e)
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid link")

    if payload.get("typ") != "thread" or not payload.get("msg_id") or not payload.get("email"):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid link")

    return ThreadSession(msg_id=payload["msg_id"], email=payload["email"])


def thread_session_from_cookie(
    thread_session: str | None = Cookie(default=None, alias=THREAD_SESSION_COOKIE),
) -> ThreadSession:
    """Depends: pull a validated ThreadSession from the session cookie."""
    if not thread_session:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")
    return validate_thread_token(thread_session)


def build_magic_link(token: str) -> str:
    return f"{settings.app_domain}/conversations/verify?t={token}"


def set_thread_session(response: Response, token: str) -> None:
    response.set_cookie(
        key=THREAD_SESSION_COOKIE,
        value=token,
        max_age=THREAD_TOKEN_EXPIRE_DAYS * 24 * 60 * 60,
        httponly=True,
        secure=settings.mode == Mode.prod,
        samesite="lax",
        path=THREAD_COOKIE_PATH,
    )
