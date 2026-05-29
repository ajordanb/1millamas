from datetime import datetime, UTC
from enum import Enum
from beanie import Document
from pydantic import BaseModel, Field, EmailStr
from pymongo import IndexModel, ASCENDING


class MessageStatus(str, Enum):
    pending = "pending"
    open = "open"
    closed = "closed"

class MessagePriority(str, Enum):
    low = "low"
    medium = "medium"
    high = "high"
    critical = "critical"


class ReplyAuthor(str, Enum):
    visitor = "visitor"
    agent = "agent"


class Reply(BaseModel):
    text: str
    author: ReplyAuthor = ReplyAuthor.agent
    sent_at: datetime = Field(default_factory=lambda: datetime.now(UTC))


class MessageCreate(BaseModel):
    name: str = Field(min_length=1, max_length=200, description="Sender's name")
    email: EmailStr = Field(description="Sender's email address")
    message: str = Field(min_length=1, max_length=5000, description="Message body")


class Message(Document, MessageCreate):
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC), description="When the message was received")
    status: MessageStatus = Field(default=MessageStatus.pending, description="Message processing status")
    priority: MessagePriority = Field(default=MessagePriority.medium, description="Message priority")
    replies: list[Reply] = Field(default_factory=list)
    unread_by_agent: bool = Field(default=False, description="True when a visitor has replied and an agent hasn't responded yet")


    class Settings:
        name = "Message"
        indexes = [
            IndexModel(
                [("email", ASCENDING), ("created_at", ASCENDING), ("status", ASCENDING)],
                unique=True,
                name="email_created_at_status_unique"
            ),
            IndexModel([("email", ASCENDING)], name="email_idx"),
            IndexModel([("created_at", ASCENDING)], name="created_at_idx"),
        ]

    def __repr__(self) -> str:
        return f"<Message from={self.email}>"


class MessageUpdate(BaseModel):
    status: MessageStatus


class MessageReply(BaseModel):
    reply_text: str = Field(min_length=1, max_length=5000, description="Reply content to send to the sender")


class VisitorReply(BaseModel):
    text: str = Field(min_length=1, max_length=5000, description="Visitor reply content")


class UnreadCount(BaseModel):
    count: int


class MessageOut(BaseModel):
    id: str
    name: str
    email: str
    message: str
    status: MessageStatus
    created_at: datetime
    replies: list[Reply] = Field(default_factory=list)
    unread_by_agent: bool = False

    @classmethod
    def from_doc(cls, doc: "Message") -> "MessageOut":
        return cls(
            id=str(doc.id),
            name=doc.name,
            email=str(doc.email),
            message=doc.message,
            status=doc.status,
            created_at=doc.created_at,
            replies=doc.replies,
            unread_by_agent=doc.unread_by_agent,
        )


class ThreadOut(BaseModel):
    """Public-facing thread view (no admin-only fields)."""
    id: str
    name: str
    message: str
    status: MessageStatus
    created_at: datetime
    replies: list[Reply] = Field(default_factory=list)

    @classmethod
    def from_doc(cls, doc: "Message") -> "ThreadOut":
        return cls(
            id=str(doc.id),
            name=doc.name,
            message=doc.message,
            status=doc.status,
            created_at=doc.created_at,
            replies=doc.replies,
        )
