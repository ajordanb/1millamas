from typing import List, Dict, Any, Optional, Union
import uuid

from fastapi import Request, status
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException
from loguru import logger
from slowapi.errors import RateLimitExceeded
from pydantic import ValidationError

from app.core.config import settings, Mode


def _get_request_id(request: Request) -> str:
    """Extract request ID from state (set by middleware), header, or generate new one"""
    return (
        getattr(request.state, "request_id", None)
        or request.headers.get("X-Request-ID")
        or request.headers.get("x-request-id")
        or str(uuid.uuid4().hex)
    )


def _get_client_ip(request: Request) -> Optional[str]:
    """Get client IP from request"""
    return request.client.host if request.client else None


def _format_validation_errors(exc: Union[RequestValidationError, ValidationError]) -> List[Dict[str, str]]:
    """Extract and format validation errors from Pydantic exceptions"""
    return [
        {
            "field": ".".join(str(loc) for loc in error["loc"]),
            "message": error["msg"],
            "type": error["type"]
        }
        for error in exc.errors()
    ]


def _create_error_response(
    status_code: int,
    message: str,
    path: str,
    request_id: str,
    details: Optional[List[Dict[str, str]]] = None,
    headers: Optional[Dict[str, str]] = None
) -> JSONResponse:
    content: Dict[str, Any] = {
        "error": {
            "code": status_code,
            "message": message,
            "path": path,
            "request_id": request_id
        }
    }
    if details:
        content["error"]["details"] = details

    return JSONResponse(
        status_code=status_code,
        content=content,
        headers=headers or {}
    )


def http_exception_handler(request: Request, exc: StarletteHTTPException) -> JSONResponse:
    """Handle HTTP exceptions"""
    path = request.url.path
    request_id = _get_request_id(request)
    message = exc.detail
    if exc.status_code >= 500 and settings.mode == Mode.prod:
        logger.error(
            "HTTP {} error on {} {}: {}",
            exc.status_code, request.method, path, exc.detail,
            extra={
                "status_code": exc.status_code,
                "path": path,
                "request_id": request_id,
                "original_detail": exc.detail
            }
        )
        message = "Internal server error. Please contact support if the issue persists."
    else:
        logger.warning(
            "HTTP {} error on {} {}: {}",
            exc.status_code, request.method, path, exc.detail,
            extra={"status_code": exc.status_code, "path": path, "request_id": request_id}
        )

    return _create_error_response(
        status_code=exc.status_code,
        message=message,
        path=path,
        request_id=request_id,
        headers=exc.headers
    )


def validation_exception_handler(request: Request, exc: RequestValidationError) -> JSONResponse:
    """Handle FastAPI request validation errors"""
    path = request.url.path
    request_id = _get_request_id(request)
    errors = _format_validation_errors(exc)

    logger.warning(
        "Validation error on {} {}: {!r}",
        request.method, path, errors,
        extra={"path": path, "errors": errors, "request_id": request_id}
    )

    return _create_error_response(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        message="Validation error",
        path=path,
        request_id=request_id,
        details=errors
    )


def rate_limit_handler(request: Request, exc: RateLimitExceeded) -> JSONResponse:
    """Handle rate limit exceeded errors"""
    path = request.url.path
    request_id = _get_request_id(request)
    retry_after = 60
    logger.warning(
        "Rate limit exceeded on {} {}",
        request.method, path,
        extra={
            "path": path,
            "client": _get_client_ip(request),
            "request_id": request_id,
            "retry_after": retry_after
        }
    )

    return _create_error_response(
        status_code=status.HTTP_429_TOO_MANY_REQUESTS,
        message=f"Rate limit exceeded. Please try again in {retry_after} seconds.",
        path=path,
        request_id=request_id,
        headers={"Retry-After": str(retry_after)}
    )


def general_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """Handle all uncaught exceptions"""
    path = request.url.path
    request_id = _get_request_id(request)
    logger.error(
        "Unhandled exception on {} {}: {!r}",
        request.method, path, exc,
        exc_info=True,
        extra={"path": path, "request_id": request_id}
    )

    return _create_error_response(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        message="Internal server error. Please contact support if the issue persists.",
        path=path,
        request_id=request_id
    )


def pydantic_validation_handler(request: Request, exc: ValidationError) -> JSONResponse:
    """Handle Pydantic validation errors"""
    path = request.url.path
    request_id = _get_request_id(request)
    errors = _format_validation_errors(exc)
    logger.warning(
        "Pydantic validation error on {} {}: {!r}",
        request.method, path, errors,
        extra={"path": path, "errors": errors, "request_id": request_id}
    )
    return _create_error_response(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        message="Data validation error",
        path=path,
        request_id=request_id,
        details=errors
    )
