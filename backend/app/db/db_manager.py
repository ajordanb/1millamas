import asyncio
from typing import Optional
import motor.motor_asyncio
from beanie import Document, init_beanie
from loguru import logger

from app.core.security.api import password_context
from app.core.config import settings
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase

from app.role.model import Role
from app.user.model import User


class DatabaseManager:
    def __init__(self):
        self._client: Optional[AsyncIOMotorClient] = None
        self._database: Optional[AsyncIOMotorDatabase] = None
        self._is_initialized = False

    async def connect(self) -> None:
        if self._is_initialized:
            return
        try:
            if settings.db_conn_str.startswith("mongodb://localhost"):
                self._client = motor.motor_asyncio.AsyncIOMotorClient(
                    settings.db_conn_str,
                    maxPoolSize=settings.db_max_pool_size,
                    minPoolSize=settings.db_min_pool_size,
                    serverSelectionTimeoutMS=5000,
                    connectTimeoutMS=10000,
                    socketTimeoutMS=20000,
                )
                self._client.get_io_loop = asyncio.get_event_loop
            else:
                self._client = motor.motor_asyncio.AsyncIOMotorClient(
                    settings.db_conn_str,
                    maxPoolSize=settings.db_max_pool_size,
                    minPoolSize=settings.db_min_pool_size,
                    serverSelectionTimeoutMS=5000,
                    connectTimeoutMS=10000,
                    socketTimeoutMS=20000,
                    authMechanism="DEFAULT"
                )

            self._database = self._client[settings.db_name]
            await self._client.admin.command('ping')
            collections = Document.__subclasses__()
            await init_beanie(database=self._database, document_models=collections)

            self._is_initialized = True
            logger.info("Database connection established successfully")

        except Exception as e:
            logger.error(f"Failed to connect to database: {e}")
            await self.disconnect()
            raise

    async def disconnect(self) -> None:
        if self._client:
            self._client.close()
            self._client = None
            self._database = None
            self._is_initialized = False
            logger.info("Database connection closed")

    async def health_check(self) -> bool:
        try:
            if not self._client:
                return False
            await self._client.admin.command('ping')
            return True
        except Exception as e:
            logger.warning(f"Database health check failed: {e}")
            return False

    @property
    def client(self) -> Optional[AsyncIOMotorClient]:
        return self._client

    @property
    def database(self) -> Optional[AsyncIOMotorDatabase]:
        return self._database

    @property
    def is_connected(self) -> bool:
        return self._is_initialized and self._client is not None


db_manager = DatabaseManager()


async def wipe():
    collections = Document.__subclasses__()
    await asyncio.gather(*[model.delete_all() for model in collections])

async def create_app_admins():
    admins = settings.default_admin_users
    await create_admin_role()
    admin_role = await Role.by_name("admin")
    for admin in admins:
        if not admin:
            continue
        user = await User.by_email(admin)
        if user is None:
            pw = password_context.hash(settings.user_default_password)
            admin_user = User(
                email=admin,
                roles=[admin_role.id],
                source="basic",
                email_confirmed=True,
                password=pw,
            )
            await admin_user.create()
            logger.info(f"Created admin user {admin}")
        elif admin_role.id not in user.roles:
            # Promote an existing user (e.g. one who signed up via Google first).
            user.roles.append(admin_role.id)
            await user.save()
            logger.info(f"Granted admin role to existing user {admin}")

async def create_admin_role():
    role = await Role.by_name("admin")
    if role is None:
        admin_role = Role(
            name="admin",
            description="Admin role",
            created_by="system",
            scopes=["admin"]
        )
        await admin_role.create()
        logger.info(f"Created admin role: {admin_role}")



