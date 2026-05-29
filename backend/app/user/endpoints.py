from typing import List
import secrets
import uuid

from fastapi import APIRouter, Depends, HTTPException, Body, Form, Request, BackgroundTasks, Path

from app.core.config import settings
from app.user.model import UserAuth, UpdatePassword, UserBase, APIKey, UpdateAPIKey, UserOut, UserUpdateRequest, CreateAPIKeyRequest, CreateAPIKey
from app.models.util.model import Message
from app.user.service import UserService, MyUserService
from app.utills.email.email import EmailService
from app.tasks.background_tasks import send_reset_password_email_task
from app.utills.dependencies import admin_access, CheckScope, get_user_service, get_self_user_service, \
    validate_link_token, get_email_service

from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)

user_router = APIRouter(tags=["User Management"], prefix="/user")
app_admin = Depends(admin_access)
manage_users = Depends(CheckScope("users.write"))


@user_router.get("/all", dependencies=[app_admin, manage_users])
async def get_all_users(
        skip: int = 0,
        limit: int = 1000,
        user_service: UserService = Depends(get_user_service)

) -> List[UserOut]:
    """Admin endpoint to get all users"""
    return await user_service.get_all_users(skip, limit)


@user_router.post("/register", dependencies=[manage_users, app_admin])
async def create_user(
        user_register: UserAuth,
        user_service: UserService = Depends(get_user_service),
):
    """Admin endpoint to create a new user"""
    new_user = await user_service.create_user(user_register)
    return UserBase(**new_user.model_dump())


@user_router.get("/by_id/{id}", dependencies=[app_admin, manage_users])
async def by_id(
        id: str = Path(..., description="User ID"),
        user_service: UserService = Depends(get_user_service),
) -> UserBase:
    """Admin endpoint to retrieve a user's profile by id'"""
    return await user_service.get_user_by_id(id)


@user_router.get("/by_email/{email}", dependencies=[app_admin, manage_users])
async def by_email(
        email: str = Path(..., description="User email"),
        user_service: UserService = Depends(get_user_service),
) -> UserBase:
    """Admin endpoint to retrieve a user's profile by email'"""
    return await user_service.get_user_by_email(email)


@user_router.put("/update", dependencies=[app_admin, manage_users])
async def update_user(
        user_update: UserUpdateRequest,
        user_service: UserService = Depends(get_user_service),
) -> UserOut:
    """Admin endpoint to update a user"""
    return await user_service.update_user(user_update)


@user_router.delete("/delete/{user_id}", dependencies=[app_admin, manage_users])
async def delete_user(
        user_id: str = Path(..., description="User ID to delete"),
        user_service: UserService = Depends(get_user_service),
) -> Message:
    """Admin endpoint to delete a user"""
    return await user_service.delete_user(user_id)


@user_router.post("/api_key/create", dependencies=[app_admin, manage_users])
async def create_api_key(
        request: CreateAPIKeyRequest,
        user_service: UserService = Depends(get_user_service),
) -> APIKey:
    """Admin Endpoint to create an API key for the specified user."""
    # Generate client_id and client_secret
    client_id = str(uuid.uuid4())
    client_secret = secrets.token_urlsafe(32)

    # Create CreateAPIKey model with unhashed credentials
    api_key = CreateAPIKey(
        client_id=client_id,
        client_secret=client_secret,  # Service will hash this
        scopes=request.scopes,
        active=request.active
    )
    return await user_service.create_api_key(api_key, request.email)


@user_router.put("/api_key/update", dependencies=[app_admin, manage_users])
async def update_api_key(
        key_updates: UpdateAPIKey,
        user_service: UserService = Depends(get_user_service),
) -> APIKey:
    """Admin Endpoint to update an API key for the specified user."""
    return await user_service.update_api_key(key_updates)


@user_router.delete("/api_key/delete/{client_id}", dependencies=[app_admin, manage_users])
async def delete_api_key(
        client_id: str = Path(..., description="API key client ID"),
        user_service: UserService = Depends(get_user_service),
) -> Message:
    """Admin Endpoint to delete an API key for the specified user."""
    return await user_service.delete_api_key(client_id)


@user_router.post("/email_password_reset_link")
@limiter.limit("5/minute")
async def recover_password(
    request: Request,
    email: str,
    user_service: UserService = Depends(get_user_service),
) -> Message:
    return await user_service.recover_password(email)


@user_router.post("/send_magic_link")
@limiter.limit("5/minute")
async def send_magic_link(
    request: Request,
    email: str,
    user_service: UserService = Depends(get_user_service),
) -> Message:
    if not settings.magic_link_enabled:
        raise HTTPException(status_code=403, detail="Magic link disabled")
    return await user_service.send_magic_link(email)


@user_router.post("/reset_password")
async def reset_password(
        new_password: str = Form(...),
        token=Depends(validate_link_token),
        user_service: UserService = Depends(get_user_service),
) -> Message:
    return await user_service.reset_password(new_password, token.sub)


@user_router.post("/test_email_task", dependencies=[app_admin])
async def test_email_task(
    bg: BackgroundTasks,
    email: str = Body(...),
    token: str = Body(...),
    email_service: EmailService = Depends(get_email_service),
) -> Message:
    """Test endpoint to manually trigger email task"""
    bg.add_task(send_reset_password_email_task, email_service, email, token)
    return Message(message="Email task queued successfully")

"""
My User Management
"""

@user_router.get("/me")
async def profile(
        me: MyUserService = Depends(get_self_user_service)
) -> UserBase:
    """Retrieve current user's metadata"""
    return await me.my_profile()


@user_router.put("/me/update_password")
async def update_password(
        body: UpdatePassword,
        me: MyUserService = Depends(get_self_user_service),
) -> Message:
    """Update password endpoint"""
    return await me.update_my_password(body.current_password, body.new_password)


@user_router.put("/me/update", dependencies=[app_admin, manage_users])
async def update_my_user(
        me: MyUserService = Depends(get_self_user_service),
        user_update: UserBase = Body(...),
) -> UserBase:
    """Update user endpoint"""
    return await me.update_my_user(user_update)