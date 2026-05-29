from loguru import logger
from app.utills.email.email import EmailService
from app.user.model import User
from app.contact.model import MessageCreate
from app.core.config import settings


async def send_welcome_email_task(email_service: EmailService, user_email: str, token: str) -> bool:
    """Background task to send welcome email"""
    try:
        return await email_service.send_welcome_email(user_email, token)
    except Exception as e:
        logger.error(f"Failed to send welcome email to {user_email}: {e}")
        return False


async def send_verification_email_task(
    email_service: EmailService,
    user_email: str,
    token: str,
    name: str | None = None,
) -> bool:
    """Background task to send the email-verification (welcome) email."""
    try:
        return await email_service.send_verification_email(user_email, token, name)
    except Exception as e:
        logger.error(f"Failed to send verification email to {user_email}: {e}")
        return False


async def send_race_registration_email_task(
    email_service: EmailService,
    recipient_email: str,
    full_name: str,
    discipline: str,
    goal_km: int,
) -> bool:
    """Background task to send the race registration confirmation (with Strava links)."""
    try:
        return await email_service.send_race_registration_email(
            recipient_email, full_name, discipline, goal_km
        )
    except Exception as e:
        logger.error(f"Failed to send race registration email to {recipient_email}: {e}")
        return False


async def send_reset_password_email_task(email_service: EmailService, user_email: str, token: str) -> bool:
    """Background task to send password reset email"""
    try:
        return await email_service.send_reset_password_email(user_email, token)
    except Exception as e:
        logger.error(f"Failed to send reset password email to {user_email}: {e}")
        return False


async def send_magic_link_email_task(email_service: EmailService, user_email: str, token: str) -> bool:
    """Background task to send magic link email"""
    try:
        return await email_service.send_magic_link_email(user_email, token)
    except Exception as e:
        logger.error(f"Failed to send magic link email to {user_email}: {e}")
        return False


async def send_contact_notification_task(email_service: EmailService, contact: MessageCreate) -> bool:
    """Background task to notify admin of new contact message"""
    try:
        recipients = settings.default_admin_users if settings.admin_users else [settings.emails_from_email]
        for recipient in recipients:
            if not recipient:
                continue
            email = email_service.generate_contact_notification_email(
                sender_name=contact.name,
                sender_email=str(contact.email),
                message=contact.message,
                recipient=recipient,
            )
            await email_service.send_email_async(email)
        return True
    except Exception as e:
        logger.error(f"Failed to send contact notification: {e}")
        return False


async def send_contact_confirmation_task(email_service: EmailService, contact: MessageCreate) -> bool:
    """Background task to send confirmation email to contact form submitter"""
    try:
        email = email_service.generate_contact_confirmation_email(
            sender_name=contact.name,
            sender_email=contact.email,
        )
        return await email_service.send_email_async(email)
    except Exception as e:
        logger.error(f"Failed to send contact confirmation to {contact.email}: {e}")
        return False


async def send_reply_email_task(
    email_service: EmailService,
    recipient_name: str,
    recipient_email: str,
    reply_text: str,
    magic_link: str,
) -> bool:
    """Background task to send an admin reply email to a contact"""
    try:
        email = email_service.generate_reply_email(
            recipient_name=recipient_name,
            recipient_email=recipient_email,
            reply_text=reply_text,
            magic_link=magic_link,
        )
        return await email_service.send_email_async(email)
    except Exception as e:
        logger.error("Failed to send reply email to {}: {}", recipient_email, e)
        return False


async def send_customer_reply_notification_task(
    email_service: EmailService,
    sender_name: str,
    sender_email: str,
    reply_text: str,
    message_id: str,
) -> bool:
    """Background task to notify admins when a visitor replies to a thread."""
    try:
        recipients = settings.default_admin_users if settings.admin_users else [settings.emails_from_email]
        admin_link = f"{settings.app_domain}/admin/messages/{message_id}"
        for recipient in recipients:
            if not recipient:
                continue
            email = email_service.generate_customer_reply_notification_email(
                sender_name=sender_name,
                sender_email=sender_email,
                reply_text=reply_text,
                recipient=recipient,
                admin_link=admin_link,
            )
            await email_service.send_email_async(email)
        return True
    except Exception as e:
        logger.error("Failed to send customer reply notification for message {}: {}", message_id, e)
        return False


async def ensure_ri_delete_role(role_id: str) -> dict:
    """Remove a role from all users who have it (referential integrity cleanup)"""
    try:
        logger.info(f"Starting referential integrity cleanup for role: {role_id}")
        users_with_role = await User.has_role(role_id)
        updated_users = []
        failed_updates = []
        if not users_with_role:
            logger.info(f"No users found with role {role_id}, cleanup complete")
            return {
                "role_id": role_id,
                "users_updated": 0,
                "updated_user_ids": [],
                "failed_updates": [],
                "success": True
            }

        for user in users_with_role:
            try:
                if user and hasattr(user, 'roles'):
                    original_role_count = len(user.roles)
                    filtered_roles = [role for role in user.roles if str(role) != str(role_id)]

                    if len(filtered_roles) != original_role_count:
                        user.roles = filtered_roles
                        await user.save()
                        updated_users.append(user.id)
                        logger.info(f"Removed role {role_id} from user {user.email}")
                    else:
                        logger.debug(f"User {user.email} did not have role {role_id}")
            except Exception as user_error:
                logger.error(f"Failed to update user {getattr(user, 'email', 'unknown')}: {user_error}")
                failed_updates.append({
                    "user_id": str(getattr(user, 'id', 'unknown')),
                    "error": str(user_error)
                })

        result = {
            "role_id": role_id,
            "users_updated": len(updated_users),
            "updated_user_ids": [str(uid) for uid in updated_users],
            "failed_updates": failed_updates,
            "success": len(failed_updates) == 0
        }

        if failed_updates:
            logger.warning(f"Referential integrity cleanup completed with {len(failed_updates)} failures. Updated {len(updated_users)} users.")
        else:
            logger.info(f"Referential integrity cleanup completed successfully. Updated {len(updated_users)} users.")

        return result

    except Exception as e:
        logger.error(f"Referential integrity cleanup failed for role {role_id}: {e}")
        return {
            "role_id": role_id,
            "users_updated": 0,
            "updated_user_ids": [],
            "failed_updates": [],
            "success": False,
            "error": str(e)
        }
