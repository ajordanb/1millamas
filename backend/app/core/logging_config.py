import sys
import json
from datetime import datetime, timezone
from typing import Any, Dict
from loguru import logger
from app.core.config import settings, Mode

sensitive_keys = {'authorization', 'cookie', 'x-service-psk', 'x-api-key', 'password', 'token', 'secret'}


def sanitize_headers(headers: Dict[str, Any]) -> Dict[str, Any]:
    """Redact sensitive values from headers/extra data."""
    return {
        k: '***REDACTED***' if k.lower() in sensitive_keys else v
        for k, v in headers.items()
    }


def serialize_record(record: Dict[str, Any]) -> str:
    """
    Serialize log record to JSON format with error handling.
    Handles non-serializable objects and sanitizes sensitive data.
    """
    try:
        subset = {
            "timestamp": record.get("time", datetime.now(timezone.utc)).isoformat(),
            "level": getattr(record.get("level"), "name", "UNKNOWN"),
            "message": str(record.get("message", ""))[:10000],  # Truncate long messages
            "module": record.get("name"),
            "function": record.get("function"),
            "line": record.get("line"),
        }

        exception = record.get("exception")
        if exception:
            try:
                subset["exception"] = {
                    "type": getattr(exception.type, "__name__", "UnknownException"),
                    "value": str(exception.value)[:1000],
                }
            except (AttributeError, TypeError):
                subset["exception"] = {
                    "type": "UnknownException",
                    "value": "Failed to serialize exception",
                }

        extra = record.get("extra")
        if extra:
            subset["extra"] = sanitize_headers(extra)

        return json.dumps(subset, default=str)
    except Exception as e:
        return json.dumps({
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "level": "ERROR",
            "message": f"Log serialization failed: {e}",
            "original_message": str(record.get("message", ""))[:1000],
        })


def setup_logging() -> None:
    """
    Configure logging based on environment mode.
    - Production: JSON format, INFO level, async logging to stdout
    - Development: Human-readable format, DEBUG level
    """
    logger.remove()
    if settings.mode == Mode.prod:
        def json_sink(message):
            print(serialize_record(message.record), file=sys.stdout, flush=True)

        logger.add(
            json_sink,
            level="INFO",
            enqueue=True,
            backtrace=False,
            diagnose=False,
        )
    else:
        # Development configuration: Human-readable
        logger.add(
            sys.stdout,
            format="<green>{time:YYYY-MM-DD HH:mm:ss}</green> | <level>{level: <8}</level> | <cyan>{name}</cyan>:<cyan>{function}</cyan>:<cyan>{line}</cyan> - <level>{message}</level>",
            level="DEBUG",
            colorize=True,
            backtrace=True,
            diagnose=True,
        )

    logger.info(f"Logging configured for {settings.mode} mode")


def get_logger():
    return logger
