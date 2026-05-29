from typing import AsyncGenerator
from fastapi import Depends, HTTPException, status
from motor.motor_asyncio import AsyncIOMotorDatabase, AsyncIOMotorClient

from app.db.db_manager import db_manager


async def get_database() -> AsyncGenerator[AsyncIOMotorDatabase, None]:
    """FastAPI dependency to get database instance."""
    if not db_manager.is_connected:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database connection not available"
        )

    # Health check before providing database
    if not await db_manager.health_check():
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database health check failed"
        )

    yield db_manager.database


async def get_database_client() -> AsyncGenerator[AsyncIOMotorClient, None]:
    """FastAPI dependency to get database client instance."""
    if not db_manager.is_connected:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database connection not available"
        )

    yield db_manager.client


# Convenience dependencies
DatabaseDep = Depends(get_database)
DatabaseClientDep = Depends(get_database_client)