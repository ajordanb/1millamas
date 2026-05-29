from fastapi import APIRouter, Depends, Body, HTTPException, Request, BackgroundTasks
from pydantic import BaseModel, EmailStr, Field
from app.core.security.helpers import password_authenticated_user, client_id_authenticated_user
from app.auth.model import SocialLoginRequest, Token

from app.core.security.api import (
    CustomOAuth2RequestForm,
    get_hashed_password,
)
from app.auth.model import RefreshToken
from app.core.security.social import provider_map
from app.core.config import settings
from app.models.util.model import Message
from app.user.model import User
from app.auth.service import AuthService
from app.utills.email.email import EmailService
from app.tasks.background_tasks import send_verification_email_task
from app.utills.dependencies import (
    current_user,
    get_auth_service,
    get_email_service,
    validate_refresh_token,
    validate_link_token,
)

from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)

auth_router = APIRouter(tags=["Authentication"], prefix="/auth")


@auth_router.post("/token")
@limiter.limit("10/minute")
async def login_ep(
        request: Request,
        form: CustomOAuth2RequestForm = Depends(),
        auth_service: AuthService = Depends(get_auth_service)
) -> RefreshToken:
    if form.username and form.password:
        user = await password_authenticated_user(form)
        provider = "username_password"
    elif form.client_id:
        user = await client_id_authenticated_user(form)
        provider = "client_id"
    else:
        raise HTTPException(401, "No login info")

    scopes, user_role_names = await user.get_user_scopes_and_roles()

    if user._using_api_key:
        access_token, at_expires = auth_service.create_access_token(
            subject=user.email,
            client_id=user._api_key.client_id
        )
        refresh_token, rt_expires = auth_service.create_refresh_token(
            subject=user.email,
            client_id=user._api_key.client_id
        )
    else:
        access_token, at_expires = auth_service.create_access_token(
            subject=user.email,
            scopes=scopes,
            roles=user_role_names
        )
        refresh_token, rt_expires = auth_service.create_refresh_token(
            subject=user.email,
            scopes=scopes,
            roles=user_role_names
        )

    user.log_login(payload={
        "source": "token_login",
        "provider": provider,
    })
    await user.save()

    return RefreshToken(
        accessToken=access_token,
        accessTokenExpires=at_expires,
        refreshToken=refresh_token,
        refreshTokenExpires=rt_expires,
    )


class RegisterRequest(BaseModel):
    name: str = Field(min_length=1, max_length=120, description="Full name")
    email: EmailStr = Field(description="Email address (becomes the username)")
    password: str = Field(min_length=1, description="Account password")


def _mint_email_verify_token(auth_service: AuthService, email: str) -> str:
    """A short-lived token (sub=email) used only to confirm an email address."""
    token, _ = auth_service.create_access_token(
        subject=email,
        expires_delta=settings.email_verify_token_expire_minutes,
    )
    return token


@auth_router.post("/register")
@limiter.limit("10/minute")
async def register_ep(
        request: Request,
        body: RegisterRequest,
        bg: BackgroundTasks,
        auth_service: AuthService = Depends(get_auth_service),
        email_service: EmailService = Depends(get_email_service),
) -> RefreshToken:
    """Public self-service registration with email + password.

    Creates an unconfirmed account and emails a verification (welcome) link.
    The user must confirm before they can register for a race.
    """
    if not settings.allow_new_users:
        raise HTTPException(status_code=403, detail="New registrations are not allowed.")

    existing = await User.by_email(body.email)
    if existing is not None:
        raise HTTPException(status_code=400, detail="An account with this email already exists.")

    # Raises HTTPException with a helpful message if the password is too weak.
    auth_service.security_service.validate_password_strength(body.password)

    user = User(
        email=body.email,
        name=body.name,
        source="basic",
        email_confirmed=False,
        password=get_hashed_password(body.password),
    )
    await user.create()

    # Welcome + verify email.
    bg.add_task(
        send_verification_email_task,
        email_service,
        user.email,
        _mint_email_verify_token(auth_service, user.email),
        user.name,
    )

    scopes, user_role_names = await user.get_user_scopes_and_roles()
    tokens = auth_service.create_token_pair(
        subject=user.email,
        scopes=scopes,
        roles=user_role_names,
    )
    user.log_login(payload={"source": "register", "provider": "username_password"})
    await user.save()

    return RefreshToken(
        accessToken=tokens["access_token"],
        accessTokenExpires=tokens["access_expires_at"],
        refreshToken=tokens["refresh_token"],
        refreshTokenExpires=tokens["refresh_expires_at"],
    )


class VerifyEmailRequest(BaseModel):
    token: str = Field(description="Email verification token from the emailed link")


@auth_router.post("/verify_email", response_model=Message)
@limiter.limit("20/minute")
async def verify_email_ep(
        request: Request,
        body: VerifyEmailRequest,
        auth_service: AuthService = Depends(get_auth_service),
) -> Message:
    """Confirm an email address from the emailed verification link."""
    token_data = auth_service.security_service.validate_access_token(body.token)
    user = await User.by_email(token_data.sub)
    if user is None:
        raise HTTPException(status_code=404, detail="Account not found.")
    if not user.email_confirmed:
        user.email_confirmed = True
        await user.save()
    return Message(message="Email confirmed. You can now register for the race.")


@auth_router.post("/resend_verification", response_model=Message)
@limiter.limit("3/minute")
async def resend_verification_ep(
        request: Request,
        bg: BackgroundTasks,
        user: User = Depends(current_user),
        auth_service: AuthService = Depends(get_auth_service),
        email_service: EmailService = Depends(get_email_service),
) -> Message:
    """Resend the verification email to the logged-in user."""
    if user.email_confirmed:
        raise HTTPException(status_code=400, detail="Your email is already verified.")
    bg.add_task(
        send_verification_email_task,
        email_service,
        user.email,
        _mint_email_verify_token(auth_service, user.email),
        user.name,
    )
    return Message(message="Verification email sent. Check your inbox.")


@auth_router.post("/social_login")
@limiter.limit("10/minute")
async def social_login_ep(
        request: Request,
        req: SocialLoginRequest,
        auth_service: AuthService = Depends(get_auth_service)
) -> RefreshToken:
    exchange = provider_map.get(req.provider)
    if exchange is None:
        raise HTTPException(status_code=400, detail=f"Unsupported provider: {req.provider}")
    email, social_name = await exchange(req.data, req.redirect_url)
    user = await User.by_email(email)

    if user is None:
        if not settings.allow_new_users:
            raise HTTPException(
                status_code=403,
                detail="New users are not allowed in this environment",
            )
        # Social users authenticate via the provider and have no password.
        user = User(
            email=email,
            source=req.provider,
            name=social_name,
            email_confirmed=True,
        )
        await user.save()
    else:
        # Existing account signing in via the provider. The provider verified the
        # email, so confirm it (covers email/password users who later use Google),
        # and backfill the name if we didn't have it.
        changed = False
        if social_name and not user.name:
            user.name = social_name
            changed = True
        if not user.email_confirmed:
            user.email_confirmed = True
            changed = True
        if changed:
            await user.save()

    scopes, user_role_names = await user.get_user_scopes_and_roles()

    tokens = auth_service.create_token_pair(
        subject=user.email,
        scopes=scopes,
        roles=user_role_names
    )

    user.log_login(payload={
        "source": "social_login",
        "provider": req.provider,
    })
    await user.save()

    return RefreshToken(
        accessToken=tokens["access_token"],
        accessTokenExpires=tokens["access_expires_at"],
        refreshToken=tokens["refresh_token"],
        refreshTokenExpires=tokens["refresh_expires_at"],
    )


@auth_router.post("/refresh")
@limiter.limit("20/minute")
async def refresh(
        request: Request,
        token_data: Token = Depends(validate_refresh_token),
        auth_service: AuthService = Depends(get_auth_service)
) -> RefreshToken:
    """Returns a new access token from a refresh token"""
    user = await User.by_email(token_data.sub)
    scopes, user_role_names = await user.get_user_scopes_and_roles()
    access_token, at_expires = auth_service.create_access_token(
        subject=user.email,
        client_id=token_data.client_id,
        scopes=scopes,
        roles=user_role_names
    )
    refresh_token, rt_expires = auth_service.create_refresh_token(
        subject=user.email,
        client_id=token_data.client_id,
        scopes=token_scopes,
        roles=token_roles
    )

    return RefreshToken(
        accessToken=access_token,
        accessTokenExpires=at_expires,
        refreshToken=refresh_token,
        refreshTokenExpires=rt_expires,
    )


@auth_router.post("/validate_magic_link")
@limiter.limit("10/minute")
async def validate_magic_link(
        request: Request,
        token_data=Depends(validate_link_token),
        auth_service: AuthService = Depends(get_auth_service)
) -> RefreshToken:
    user = await User.by_email(token_data.sub)
    scopes, user_role_names = await user.get_user_scopes_and_roles()
    tokens = auth_service.create_token_pair(
        subject=user.email,
        client_id=token_data.client_id,
        scopes=scopes,
        roles=user_role_names
    )
    user.log_login(payload={
        "source": "magic_link",
        "provider": "email",
    })
    await user.save()
    return RefreshToken(
        accessToken=tokens["access_token"],
        accessTokenExpires=tokens["access_expires_at"],
        refreshToken=tokens["refresh_token"],
        refreshTokenExpires=tokens["refresh_expires_at"],
    )


@auth_router.post("/check_password")
async def check_password_strength(
        password: str = Body(...),
        auth_service: AuthService = Depends(get_auth_service)  # FIXED: Add dependency parameter
):
    try:
        is_valid = auth_service.security_service.validate_password_strength(password)
        return {"valid": is_valid, "message": "Password meets requirements"}
    except HTTPException as e:
        return {"valid": False, "message": e.detail}


