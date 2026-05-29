from fastapi import APIRouter, BackgroundTasks, Depends, Response

from app.contact.model import ThreadOut, VisitorReply
from app.contact.service import MessageService
from app.contact.thread_auth import (
    ThreadSession,
    set_thread_session,
    thread_session_from_cookie,
    validate_thread_token,
)
from app.tasks.background_tasks import send_customer_reply_notification_task
from app.utills.dependencies import get_email_service, get_message_service
from app.utills.email.email import EmailService


public_thread_router = APIRouter(
    prefix="/public/messages",
    tags=["Messages (Public)"],
)


@public_thread_router.post("/verify-link", response_model=ThreadOut)
async def verify_link(
    token: str,
    response: Response,
    session: ThreadSession = Depends(validate_thread_token),
    service: MessageService = Depends(get_message_service),
) -> ThreadOut:
    msg = await service.get_message(session.msg_id)
    set_thread_session(response, token)
    return ThreadOut.from_doc(msg)


@public_thread_router.get("/me", response_model=ThreadOut)
async def get_my_thread(
    session: ThreadSession = Depends(thread_session_from_cookie),
    service: MessageService = Depends(get_message_service),
) -> ThreadOut:
    msg = await service.get_message(session.msg_id)
    return ThreadOut.from_doc(msg)


@public_thread_router.post("/me/reply", response_model=ThreadOut)
async def post_visitor_reply(
    body: VisitorReply,
    bg: BackgroundTasks,
    session: ThreadSession = Depends(thread_session_from_cookie),
    service: MessageService = Depends(get_message_service),
    email_service: EmailService = Depends(get_email_service),
) -> ThreadOut:
    updated = await service.append_visitor_reply(session.msg_id, body.text)

    bg.add_task(
        send_customer_reply_notification_task,
        email_service,
        updated.name,
        str(updated.email),
        body.text,
        str(updated.id),
    )

    return ThreadOut.from_doc(updated)
