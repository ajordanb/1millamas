from typing import List
from fastapi import HTTPException, BackgroundTasks
from starlette import status

from app.core.security.api import verify_password, get_hashed_password, password_context
from app.auth.model import Token
from app.user.magic_link_model import MagicLink, MagicType
from app.role.model import Role
from app.user.model import UserAuth, User, UserBase, UserOut, APIKey, UpdateAPIKey, UserUpdateRequest, CreateAPIKey
from app.models.util.model import Message
from app.auth.service import AuthService
from app.utills.email.email import EmailService
from app.tasks.background_tasks import send_welcome_email_task, send_reset_password_email_task, \
    send_magic_link_email_task


class UserService:
    """Service for retrieving and updating users"""

    def __init__(self,
                 email_service: EmailService,
                 auth_service: AuthService,
                 bg: BackgroundTasks,
                 ):
        self.email_service = email_service
        self.auth_service = auth_service
        self.bg = bg

    async def get_all_users(self, skip: int = 0, limit: int = 1000) -> List[UserOut]:
        response: List[UserOut] = []
        users = await User.all_users(skip, limit)
        for user in users:
            user_roles = await user.user_roles()
            response.append(UserOut(**user.model_dump(exclude={'roles'}), roles=user_roles))
        return response

    async def get_user_by_id(self, user_id: str):
        user = await User.by_id(user_id)
        return user

    async def get_user_by_email(self, email: str) -> User:
        user = await User.by_email(email)
        return user

    async def create_user(self, user_register: UserAuth):
        if _ := await self.get_user_by_email(user_register.email):
            raise HTTPException(
                status_code=400,
                detail="User already exists",
            )
        for role in user_register.roles:
            if not (_ := await Role.by_id(role)):
                raise HTTPException(
                    status_code=404,
                    detail=f"Role with id {role} does not exist",
                )
        hashed_password = get_hashed_password(user_register.password)
        user_register.password = hashed_password
        new_user = User(**user_register.model_dump())
        await User.insert(new_user)
        email, token = await self.generate_user_tuple_for_email(new_user)
        self.bg.add_task(send_welcome_email_task, self.email_service, email, token)
        return new_user

    async def update_user(self, user_update: UserUpdateRequest) -> UserOut:
        user = await self.get_user_by_id(user_update.id)
        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        # Convert role names to ObjectIds
        role_ids = []
        for role_name in user_update.roles:
            role = await Role.by_name(role_name)
            if not role:
                raise HTTPException(status_code=404, detail=f"Role '{role_name}' not found")
            role_ids.append(role.id)

        # Update user fields directly
        update_data = user_update.model_dump(exclude_unset=True, exclude={'roles', 'id'})
        for field, value in update_data.items():
            setattr(user, field, value)
        user.roles = role_ids

        await user.save()

        # Return UserOut with full role details
        user_roles = await user.user_roles()
        return UserOut(**user.model_dump(exclude={'roles'}), roles=user_roles)

    async def delete_user(self, user_id: str) -> Message:
        user = await self.get_user_by_id(user_id)
        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        await user.delete()
        return Message(message="User deleted successfully")

    async def current_user(self, token: Token):
        user = await self.get_user_by_email(token.sub)
        if token.client_id:
            api_key = user.get_api_key(token.client_id)
            if not api_key.active:
                raise HTTPException(401, "API key disabled")
            user._using_api_key = True
            user._api_key = api_key
        if user is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Could not find user",
            )
        return user

    async def recover_password(self, email: str) -> Message:
        user = await User.by_email(email)
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        if user.source == "Basic" or user.password is not None:
            await MagicLink.request_magic(identifier=user.id, _type=MagicType.recovery)
            email, token = await self.generate_user_tuple_for_email(user)
            self.bg.add_task(send_reset_password_email_task, self.email_service, email, token)
            return Message(message="Password recovery email sent")
        else:
            raise HTTPException(status_code=400, detail="User is not authenticated via password.")

    async def create_api_key(self, api_key: CreateAPIKey, email: str) -> APIKey:
        existing_api_key = await User.by_client_id(api_key.client_id, raise_on_zero=False)
        if existing_api_key:
            raise HTTPException(status_code=400, detail="API key already exists.")
        user = await User.by_email(email)
        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        new_api_key = APIKey(
            client_id=api_key.client_id,
            hashed_client_secret=password_context.hash(api_key.client_secret),
            scopes=api_key.scopes,
            active=api_key.active
        )
        user.api_keys.append(new_api_key)
        await user.save()
        return new_api_key

    async def update_api_key(self, key_updates: UpdateAPIKey) -> APIKey:
        user = await User.by_client_id(key_updates.client_id, raise_on_zero=False)
        if not user:
            raise HTTPException(status_code=400, detail="Could not find user for API key")

        for i, key in enumerate(user.api_keys):
            if key.client_id == key_updates.client_id:
                to_update = key_updates.model_dump(
                    exclude={"client_secret"},
                    exclude_unset=True
                )
                if key_updates.client_secret:
                    to_update["hashed_client_secret"] = password_context.hash(key_updates.client_secret)
                key = key.model_copy(update=to_update)
                user.api_keys[i] = key
                await user.save()
                return key
        raise HTTPException(status_code=400, detail="Could not find API key")

    async def delete_api_key(self, client_id: str) -> Message:
        linked_user = await User.by_client_id(client_id)
        if not linked_user:
            raise HTTPException(status_code=404, detail="API key not found")

        linked_user.api_keys = [key for key in linked_user.api_keys if key.client_id != client_id]
        await linked_user.save()
        return Message(message="API key deleted successfully")

    async def send_magic_link(self, email: str) -> Message:
        user = await User.by_email(email)
        if user is None:
            raise HTTPException(status_code=404, detail="User not found")
        if user.source.lower() == "basic" or user.password is not None:
            await MagicLink.request_magic(identifier=user.id, _type=MagicType.magic)
            email, token = await self.generate_user_tuple_for_email(user)
            self.bg.add_task(send_magic_link_email_task, self.email_service, email, token)
            return Message(message="Magic link email sent")
        else:
            raise HTTPException(status_code=400, detail="User is not authenticated via password.")

    async def reset_password(self, new_password: str, token_sub: str) -> Message:
        user = await User.by_email(token_sub)
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        if user.source == "Basic":
            hashed_password = get_hashed_password(new_password)
            if hashed_password in user.last_passwords:
                raise HTTPException(400, "Unable to reset password: User has already used this password.")
            user.password = hashed_password
            await user.save()
            return Message(message="Password reset successfully")
        else:
            raise HTTPException(400, "Unable to reset password: User is not authenticated via password.")

    async def generate_user_tuple_for_email(self, user: User) -> tuple[str, str]:
        scopes, roles = await user.get_user_scopes_and_roles()
        access_token, at_expires = self.auth_service.create_access_token(subject=user.email, scopes=scopes, roles=roles)
        return user.email, access_token


class MyUserService:
    """Service for retrieving and updating the current user"""

    def __init__(self, me: User):
        self.me: User = me

    async def my_profile(self) -> UserBase:
        return self.me

    async def update_my_password(self, old_password: str, new_password: str) -> Message:
        if not verify_password(new_password, self.me.hashed_password):
            raise HTTPException(status_code=400, detail="Incorrect password")
        if new_password == old_password:
            raise HTTPException(
                status_code=400, detail="New password cannot be the same as the current one"
            )
        hashed_password = get_hashed_password(new_password)
        self.me.password = hashed_password
        await self.me.save()
        return Message(message="Password updated successfully")

    async def update_my_user(self, user_update: UserBase) -> User:
        update_data = user_update.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(self.me, field, value)
        await self.me.save()
        return self.me

    async def delete_my_user(self):
        await self.me.delete()
        return Message(message="Password updated successfully")
