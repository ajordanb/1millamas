import asyncio
from typing import Dict, Any

from loguru import logger

from app.db.db_manager import DatabaseManager


async def check_database(db_manager: DatabaseManager, health_check_timeout: float = 3.0) -> Dict[str, Any]:
    """Check database health with timeout"""
    try:
        async with asyncio.timeout(health_check_timeout):
            healthy = await db_manager.health_check()
        return {"status": "healthy" if healthy else "unhealthy", "type": "mongodb"}
    except asyncio.TimeoutError:
        logger.warning("Database health check timed out")
        return {"status": "unhealthy", "type": "mongodb", "error": "Health check timed out"}
    except Exception as e:
        logger.warning(f"Database health check failed: {e}")
        return {"status": "unhealthy", "type": "mongodb", "error": str(e)}
