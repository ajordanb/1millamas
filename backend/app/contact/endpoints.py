from datetime import datetime, UTC, timedelta
from fastapi import APIRouter, BackgroundTasks, Request, HTTPException
from slowapi import Limiter
from slowapi.util import get_remote_address

from beanie.operators import In
from app.contact.model import MessageCreate, Message as ContactMessage, MessageStatus
from app.models.util.model import Message
from app.utills.email.email import EmailService
from app.tasks.background_tasks import send_contact_notification_task, send_contact_confirmation_task

limiter = Limiter(key_func=get_remote_address)

contact_router = APIRouter(tags=["Contact"], prefix="/contact")


@contact_router.post("", response_model=Message)
@limiter.limit("2/30 minutes")
async def submit_contact_message(
    request: Request,
    body: MessageCreate,
    bg: BackgroundTasks,
) -> Message:
    cutoff = datetime.now(UTC) - timedelta(hours=8)
    existing = await ContactMessage.find_one(
        ContactMessage.email == body.email,
        In(ContactMessage.status, [MessageStatus.pending, MessageStatus.open]),
        ContactMessage.created_at >= cutoff
    )
    if existing:
        raise HTTPException(
            status_code=429,
            detail="We haven't processed your previous message yet. Please wait before sending another."
        )

    contact = ContactMessage(**body.model_dump())
    await contact.insert()

    email_service = EmailService()
    bg.add_task(send_contact_notification_task, email_service, body)
    bg.add_task(send_contact_confirmation_task, email_service, body)

    return Message(message="Message sent successfully")
