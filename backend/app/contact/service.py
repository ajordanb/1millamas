from beanie import PydanticObjectId
from fastapi import HTTPException
from loguru import logger

from app.contact.model import Message, MessageStatus, Reply, ReplyAuthor
from app.contact.thread_auth import build_magic_link, mint_thread_token
from app.utills.email.email import EmailService


MAX_REPLIES = 30


class MessageService:

    async def list_messages(
        self,
        status: MessageStatus | None = None,
        skip: int = 0,
        limit: int = 50,
    ) -> list[Message]:
        query = Message.find()
        if status is not None:
            query = query.find(Message.status == status)
        return await query.sort("-created_at").skip(skip).limit(limit).to_list()

    async def get_message(self, message_id: str) -> Message:
        try:
            obj_id = PydanticObjectId(message_id)
        except Exception:
            raise HTTPException(status_code=400, detail="Invalid message ID")
        msg = await Message.get(obj_id)
        if not msg:
            raise HTTPException(status_code=404, detail="Message not found")
        return msg

    async def update_status(self, message_id: str, status: MessageStatus) -> Message:
        msg = await self.get_message(message_id)
        msg.status = status
        await msg.save()
        logger.info("Updated message {} status to {}", message_id, status)
        return msg

    async def mark_read(self, message_id: str) -> Message:
        msg = await self.get_message(message_id)
        if msg.unread_by_agent:
            msg.unread_by_agent = False
            await msg.save()
        return msg

    async def mark_unread(self, message_id: str) -> Message:
        msg = await self.get_message(message_id)
        if not msg.unread_by_agent:
            msg.unread_by_agent = True
            await msg.save()
        return msg

    async def delete_message(self, message_id: str) -> None:
        msg = await self.get_message(message_id)
        await msg.delete()
        logger.info("Deleted message {}", message_id)

    async def reply(
        self,
        message_id: str,
        reply_text: str,
        email_service: EmailService,
    ) -> Message:
        msg = await self.get_message(message_id)

        token = mint_thread_token(msg_id=str(msg.id), email=str(msg.email))
        magic_link = build_magic_link(token)

        email_data = email_service.generate_reply_email(
            recipient_name=msg.name,
            recipient_email=str(msg.email),
            reply_text=reply_text,
            magic_link=magic_link,
        )
        await email_service.send_email_async(email_data)

        msg.replies.append(Reply(text=reply_text, author=ReplyAuthor.agent))
        msg.replies = msg.replies[-MAX_REPLIES:]
        if msg.status == MessageStatus.pending:
            msg.status = MessageStatus.open
        msg.unread_by_agent = False
        await msg.save()
        logger.info("Sent reply to {} for message {}", msg.email, message_id)
        return msg

    async def append_visitor_reply(self, message_id: str, text: str) -> Message:
        msg = await self.get_message(message_id)
        if msg.status != MessageStatus.open:
            raise HTTPException(
                status_code=410,
                detail="THREAD_CLOSED" if msg.status == MessageStatus.closed else "THREAD_NOT_READY",
            )
        msg.replies.append(Reply(text=text, author=ReplyAuthor.visitor))
        msg.replies = msg.replies[-MAX_REPLIES:]
        msg.unread_by_agent = True
        await msg.save()
        logger.info("Visitor reply appended to message {}", message_id)
        return msg

    async def unread_count(self) -> int:
        return await Message.find(Message.unread_by_agent == True).count()  # noqa: E712
