import asyncio
import time
from contextlib import asynccontextmanager
from fastapi import FastAPI, status
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from scalar_fastapi import get_scalar_api_reference
from starlette.middleware import Middleware
from starlette.middleware.cors import CORSMiddleware
from starlette.exceptions import HTTPException as StarletteHTTPException
from slowapi import Limiter
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from pydantic import ValidationError
from fastapi import Request
from starlette.responses import RedirectResponse

from app.core.config import settings
from app.core.middleware import RequestIDMiddleware
from app.core.logging_config import setup_logging, get_logger
from app.db.db_manager import db_manager, create_app_admins
from app.auth.endpoints import auth_router
from app.user.endpoints import user_router
from app.role.endpoints import role_router
from app.contact.endpoints import contact_router
from app.contact.admin_endpoints import admin_message_router
from app.contact.public_endpoints import public_thread_router
from app.participant.endpoints import participant_router
from app.participant.admin_endpoints import admin_participant_router
from app.core.exception_handlers import (
    http_exception_handler,
    validation_exception_handler,
    rate_limit_handler,
    general_exception_handler,
    pydantic_validation_handler
)
from app.utills.health_checks import check_database
from app.docs.docs import get_api_description, tags_metadata

setup_logging()
logger = get_logger()

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.debug(f"Starting app -> {settings.mode} mode")
    app.state.limiter = limiter
    app.state.db = db_manager
    await app.state.db.connect()
    await create_app_admins()
    yield
    logger.debug(f"Stopping app...")
    await db_manager.disconnect()


def create_app(**kwargs) -> FastAPI:
    return FastAPI(
        **kwargs
    )


app = create_app(lifespan=lifespan,
                 title=settings.app_name,
                 description=get_api_description(),
                 root_path=f"/{settings.mount_point}" if settings.mount_point else None,
                 openapi_url=f"/openapi.json",
                 openapi_tags=tags_metadata,
                 docs_url=None,
                 redoc_url=None,
                 middleware=[Middleware(CORSMiddleware,
                                        allow_origins=settings.cors_origins_list,
                                        allow_credentials=True,
                                        allow_methods=["*"],
                                        allow_headers=["*"]
                                        ),
                             Middleware(RequestIDMiddleware)]
                 )

limiter = Limiter(key_func=get_remote_address)

app.add_exception_handler(StarletteHTTPException, http_exception_handler)
app.add_exception_handler(RequestValidationError, validation_exception_handler)
app.add_exception_handler(RateLimitExceeded, rate_limit_handler)
app.add_exception_handler(ValidationError, pydantic_validation_handler)
app.add_exception_handler(Exception, general_exception_handler)

@app.middleware("http")
async def log_access(request: Request, call_next):
    start_time = time.monotonic()
    response = await call_next(request)
    process_time = time.monotonic() - start_time
    if not request.url.path.startswith("/health"):
        request_id = getattr(request.state, "request_id", "-")
        logger.info(f"[{request_id}] {request.method} {response.status_code} {process_time:.2f}s {request.url.path}")
    return response


app.include_router(auth_router)
app.include_router(user_router)
app.include_router(role_router)
app.include_router(contact_router)
app.include_router(admin_message_router)
app.include_router(public_thread_router)
app.include_router(participant_router)
app.include_router(admin_participant_router)

# Serve locally-stored uploads (donation screenshots) in the "local" storage backend.
if settings.storage_backend == "local":
    import os
    from fastapi.staticfiles import StaticFiles

    os.makedirs(settings.upload_dir, exist_ok=True)
    app.mount("/uploads", StaticFiles(directory=settings.upload_dir), name="uploads")



@app.get("/health")
async def health_check():
    db_result = await check_database(db_manager)

    health_status = {
        "status": "healthy",
        "services": {
            "database": db_result,
        }
    }

    all_healthy = all(
        svc.get("status") == "healthy"
        for svc in health_status["services"].values()
    )

    if not all_healthy:
        health_status["status"] = "degraded"
        return JSONResponse(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            content=health_status
        )

    return health_status


@app.get("/health/ready")
async def readiness_check():
    """Readiness probe - checks if the application is ready to accept traffic."""
    db_result = await check_database(db_manager)
    if db_result.get("status") != "healthy":
        return JSONResponse(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            content={"ready": False, "reason": db_result.get("error", "Database not ready")}
        )
    return {"ready": True}


@app.get("/health/live")
async def liveness_check():
    """
    Liveness probe - simple check that the application is running.
    """
    return {"alive": True}


@app.get("/")
async def root():
    return RedirectResponse(url="/docs")


@app.get("/docs", include_in_schema=False)
async def app_documentation():
    return get_scalar_api_reference(
        title=settings.app_name,
        openapi_url="/openapi.json",
        scalar_proxy_url="https://proxy.scalar.com",
        persist_auth=True,
        hide_models=True,
        hide_client_button=True,
        authentication={
            "preferredSecurityScheme": "JWT",
        }
    )