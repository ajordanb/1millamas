from pathlib import Path
from jinja2 import  Environment, FileSystemLoader
from typing import Any
import emails
import asyncio
from concurrent.futures import ThreadPoolExecutor
from loguru import logger

from app.core.config import settings
from app.models.util.model import EmailData




class EmailService:
    def __init__(self):
        template_dir = Path(__file__).parent / "email-templates" / "built"
        self.jinja_env = Environment(
            loader=FileSystemLoader(template_dir),
            autoescape=True
        )
        self.executor = ThreadPoolExecutor(max_workers=2)

    def render_email_template(self,
                              template_name: str,
                              context: dict[str, Any]) -> str:
        try:
            template = self.jinja_env.get_template(template_name)
            return template.render(context)
        except Exception as e:
            logger.error(f"Failed to render email template {template_name}: {e}")
            raise

    async def send_email_async(self, email: EmailData) -> bool:
        loop = asyncio.get_event_loop()
        try:
            result = await loop.run_in_executor(self.executor, self._send_email_sync, email)
            return result
        except Exception as e:
            logger.error(f"Failed to send email to {email.to}: {e}")
            return False

    def _send_email_sync(self, email: EmailData) -> bool:
        if not settings.emails_enabled:
            logger.warning("Email sending is disabled in settings")
            return False
        try:
            message = emails.Message(
                subject=email.subject,
                html=email.html_content,
                mail_from=(settings.emails_from_name, settings.emails_from_email),
            )

            for attachment in email.attachments or []:
                message.attach(filename=attachment.file_name, data=attachment.file_data)
            smtp_options = {
                "host": settings.smtp_host,
                "port": settings.smtp_port,
                "timeout": 30  # Add timeout
            }
            if settings.smtp_tls:
                smtp_options["tls"] = True
            elif settings.smtp_ssl:
                smtp_options["ssl"] = True

            if settings.smtp_user:
                smtp_options["user"] = settings.smtp_user
            if settings.smtp_password:
                smtp_options["password"] = settings.smtp_password

            response = message.send(to=email.to, smtp=smtp_options)
            if response.status_code == 250:
                logger.info(f"Email sent successfully to {email.to}")
                return True
            else:
                logger.error(f"Failed to send email to {email.to}: {response}")
                return False

        except Exception as e:
            logger.error(f"Error sending email to {email.to}: {e}")
            return False

    def send_email(self, email: EmailData) -> bool:
        return self._send_email_sync(email)

    def generate_reset_password_email(self, reset_email: str, token: str) -> EmailData:
        subject = f"Password recovery for {reset_email}"
        link = f"{settings.app_domain}/password_reset?token={token}&email={reset_email}"
        logger.debug(f"Generated reset link: {link}")
        context = {
            "reset_email": reset_email,
            "valid_minutes": settings.email_reset_token_expire_minutes,
            "reset_link": link,
            "app_name": getattr(settings, 'app_name', 'Your App'),
        }
        logger.debug(f"Template context: {context}")
        html_content = self.render_email_template(
            template_name="reset_password.html",
            context=context,
        )
        return EmailData(to=reset_email, html_content=html_content, subject=subject)

    def generate_magic_link_email(self, user_email: str, token: str) -> EmailData:
        subject = f"Magic link for {user_email}"
        link = f"{settings.app_domain}/magic_link?code={token}"
        html_content = self.render_email_template(
            template_name="magic_link.html",
            context={
                "user_email": user_email,
                "valid_minutes": settings.email_reset_token_expire_minutes,
                "magic_link": link,
                "app_name": getattr(settings, 'app_name', 'Your App'),
            }
        )
        return EmailData(to=user_email, html_content=html_content, subject=subject)

    def generate_welcome_email(self, user_email: str, token: str) -> EmailData:
        subject = f"Welcome to {getattr(settings, 'app_name', 'our platform')}!"
        link = f"{settings.app_domain}/set_password?token={token}&email={user_email}"
        html_content = self.render_email_template(
            template_name="welcome_email.html",
            context={
                "user_email": user_email,
                "valid_minutes": settings.email_reset_token_expire_minutes,
                "setup_link": link,
                "app_name": getattr(settings, 'app_name', 'Your App'),
            },
        )
        return EmailData(to=user_email, html_content=html_content, subject=subject)


    def generate_contact_confirmation_email(self, sender_name: str, sender_email: str) -> EmailData:
        subject = "Thanks for reaching out"
        html_content = self.render_email_template(
            template_name="contact_confirmation.html",
            context={
                "sender_name": sender_name,
                "from_name": settings.emails_from_name,
                "app_name": getattr(settings, 'app_name', 'Your App'),
            },
        )
        return EmailData(to=sender_email, html_content=html_content, subject=subject)

    def generate_contact_notification_email(self, sender_name: str, sender_email: str, message: str, recipient: str) -> EmailData:
        subject = f"New contact message from {sender_name}"
        html_content = self.render_email_template(
            template_name="contact_notification.html",
            context={
                "sender_name": sender_name,
                "sender_email": sender_email,
                "message": message,
                "app_name": getattr(settings, 'app_name', 'Your App'),
            },
        )
        return EmailData(to=recipient, html_content=html_content, subject=subject)

    def generate_verification_email(self, user_email: str, token: str, name: str | None = None) -> EmailData:
        verify_link = f"{settings.app_domain.rstrip('/')}/verify-email?token={token}"
        subject = f"Confirm your email for {getattr(settings, 'app_name', 'our challenge')}"
        html_content = self.render_email_template(
            template_name="verify_email.html",
            context={
                "name": name,
                "verify_link": verify_link,
                "valid_hours": round(settings.email_verify_token_expire_minutes / 60),
                "app_name": getattr(settings, "app_name", "Una Milla Mas"),
            },
        )
        return EmailData(to=user_email, html_content=html_content, subject=subject)

    async def send_verification_email(self, user_email: str, token: str, name: str | None = None) -> bool:
        return await self.send_email_async(self.generate_verification_email(user_email, token, name))

    def generate_race_registration_email(
        self,
        recipient_email: str,
        full_name: str,
        discipline: str,
        goal_km: int,
    ) -> EmailData:
        discipline_label = "Runner" if discipline == "run" else "Cyclist"
        challenge_url = settings.challenge_run_url if discipline == "run" else settings.challenge_bike_url
        subject = f"You're in — {getattr(settings, 'app_name', 'the challenge')}!"
        html_content = self.render_email_template(
            template_name="race_registration.html",
            context={
                "full_name": full_name,
                "discipline_label": discipline_label,
                "goal_km": goal_km,
                "challenge_url": challenge_url,
                "challenge_join_code": settings.challenge_join_code,
                "min_donation": settings.min_donation,
                "strava_club_url": settings.strava_club_url,
                "app_name": getattr(settings, "app_name", "Una Milla Mas"),
            },
        )
        return EmailData(to=recipient_email, html_content=html_content, subject=subject)

    async def send_race_registration_email(
        self,
        recipient_email: str,
        full_name: str,
        discipline: str,
        goal_km: int,
    ) -> bool:
        email_data = self.generate_race_registration_email(
            recipient_email, full_name, discipline, goal_km
        )
        return await self.send_email_async(email_data)

    async def send_welcome_email(self, user_email: str, token: str) -> bool:
        email_data = self.generate_welcome_email(user_email, token)
        return await self.send_email_async(email_data)

    async def send_reset_password_email(self, user_email: str, token: str) -> bool:
        email_data = self.generate_reset_password_email(user_email, token)
        return await self.send_email_async(email_data)

    async def send_magic_link_email(self, user_email: str, token: str) -> bool:
        email_data = self.generate_magic_link_email(user_email, token)
        return await self.send_email_async(email_data)

    def generate_reply_email(
        self,
        recipient_name: str,
        recipient_email: str,
        reply_text: str,
        magic_link: str,
    ) -> EmailData:
        subject = "Re: Your message to Jordan Bojanic"
        html_content = self.render_email_template(
            template_name="contact_reply.html",
            context={
                "recipient_name": recipient_name,
                "reply_text": reply_text,
                "magic_link": magic_link,
                "from_name": settings.emails_from_name,
                "app_name": getattr(settings, "app_name", "Your App"),
            },
        )
        return EmailData(to=recipient_email, html_content=html_content, subject=subject)

    def generate_customer_reply_notification_email(
        self,
        sender_name: str,
        sender_email: str,
        reply_text: str,
        recipient: str,
        admin_link: str,
    ) -> EmailData:
        subject = f"New reply from {sender_name}"
        html_content = self.render_email_template(
            template_name="customer_reply_notification.html",
            context={
                "sender_name": sender_name,
                "sender_email": sender_email,
                "reply_text": reply_text,
                "admin_link": admin_link,
                "app_name": getattr(settings, "app_name", "Your App"),
            },
        )
        return EmailData(to=recipient, html_content=html_content, subject=subject)

    def __del__(self):
        if hasattr(self, 'executor'):
            self.executor.shutdown(wait=False)
