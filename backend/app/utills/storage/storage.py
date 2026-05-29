"""File storage for donation screenshots.

Two backends, selected via ``settings.storage_backend``:

* ``local`` (default, dev): files are written under ``settings.upload_dir`` and
  served back by FastAPI from the ``/uploads`` static mount (see ``main.py``).
* ``gcs``: files are uploaded to a (private) Google Cloud Storage bucket.

``save_image`` returns an opaque object **key** (e.g. ``donations/<uuid>.jpg``)
which is stored on the participant. To actually view an image, call
``view_url(key)`` — for GCS that returns a short-lived V4 **signed URL** so the
bucket can stay private; for local it returns the ``/uploads`` URL.
"""
from __future__ import annotations

import uuid
from datetime import timedelta
from pathlib import Path

from fastapi import HTTPException, UploadFile
from loguru import logger

from app.core.config import settings

ALLOWED_CONTENT_TYPES = {
    "image/jpeg": "jpg",
    "image/jpg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/heic": "heic",
    "image/heif": "heif",
}
MAX_UPLOAD_BYTES = 10 * 1024 * 1024  # 10 MB
DEFAULT_SIGNED_URL_TTL = 900  # seconds (15 min)


def _validate(file: UploadFile, data: bytes) -> str:
    """Validate an uploaded image and return its file extension."""
    if file.content_type not in ALLOWED_CONTENT_TYPES:
        raise HTTPException(
            status_code=400,
            detail="Unsupported file type. Please upload a JPEG, PNG, or WebP image.",
        )
    if len(data) == 0:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")
    if len(data) > MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=400, detail="Image is too large (max 10 MB).")
    return ALLOWED_CONTENT_TYPES[file.content_type]


def _object_key(stored: str) -> str:
    """Normalise a stored value to an object key.

    New uploads store the bare key, but older rows may hold a full URL
    (``https://storage.googleapis.com/<bucket>/donations/x.jpg`` or
    ``http://localhost:5151/uploads/donations/x.jpg``) — strip those prefixes.
    """
    if not stored:
        return stored
    for marker in ("/uploads/", f"storage.googleapis.com/{settings.gcs_bucket}/"):
        if marker in stored:
            return stored.split(marker, 1)[1]
    if stored.startswith("http"):
        # Fallback: take the path after the host.
        return stored.split("/", 3)[-1]
    return stored


class StorageService:
    """Persists uploaded images and resolves viewable URLs."""

    async def save_image(self, file: UploadFile, prefix: str = "donations") -> str:
        """Persist an uploaded image and return its object key."""
        data = await file.read()
        ext = _validate(file, data)
        key = f"{prefix}/{uuid.uuid4().hex}.{ext}"
        if settings.storage_backend == "gcs":
            self._upload_gcs(key, data, file.content_type)
        else:
            self._save_local(key, data)
        return key

    def view_url(self, stored: str, expires_seconds: int = DEFAULT_SIGNED_URL_TTL) -> str:
        """Return a URL a browser can open for a stored image key/URL."""
        key = _object_key(stored)
        if settings.storage_backend == "gcs":
            return self._signed_url_gcs(key, expires_seconds)
        base_url = (settings.public_storage_base_url or settings.app_domain).rstrip("/")
        return f"{base_url}/uploads/{key}"

    # --- local disk ---------------------------------------------------------
    def _save_local(self, key: str, data: bytes) -> None:
        dest = Path(settings.upload_dir) / key
        dest.parent.mkdir(parents=True, exist_ok=True)
        dest.write_bytes(data)
        logger.info("Saved upload locally -> {}", key)

    # --- google cloud storage ----------------------------------------------
    def _gcs_bucket(self):
        if not settings.gcs_bucket:
            raise HTTPException(
                status_code=500,
                detail="GCS storage is enabled but gcs_bucket is not configured.",
            )
        from google.cloud import storage  # imported lazily so dev needs no GCP

        if settings.gcs_credentials_file:
            client = storage.Client.from_service_account_json(settings.gcs_credentials_file)
        else:
            client = storage.Client()
        return client.bucket(settings.gcs_bucket)

    def _upload_gcs(self, key: str, data: bytes, content_type: str | None) -> None:
        blob = self._gcs_bucket().blob(key)
        blob.upload_from_string(data, content_type=content_type)
        logger.info("Uploaded image to GCS -> {}", key)

    def _signed_url_gcs(self, key: str, expires_seconds: int) -> str:
        blob = self._gcs_bucket().blob(key)
        try:
            return blob.generate_signed_url(
                version="v4",
                expiration=timedelta(seconds=expires_seconds),
                method="GET",
            )
        except Exception as e:  # typically: credentials can't sign (ADC without a key)
            logger.error("Failed to generate signed URL for {}: {}", key, e)
            raise HTTPException(
                status_code=500,
                detail="Could not generate a download link for this image.",
            )
