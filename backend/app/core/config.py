from enum import Enum
from typing import List
from pydantic_settings import BaseSettings


class Mode(str, Enum):
    dev = "dev"
    prod = "prod"


class Settings(BaseSettings):
    """
    Application settings configuration.
    
    Attributes:
        app_name: The app name, open to anything
        app_domain: The app domain -> defaults to localhost
        mount_point: Mount point for API path
        db_name: db_name to be used to create the app mongo database
        db_conn_str: mongo connection string
        allow_new_users: Allow new users or not
        magic_link_enabled: Magic Link emails enabled
        emails_enabled: If enabled, emails will be sent
        emails_from_name: The from email name
        emails_from_email: The from email
        smtp_tls: TLS is enabled by default
        smtp_ssl: SSL is optional
        smtp_user: The SMTP provider user name
        smtp_password: The SMTP provider password
        smtp_port: The SMTP provider port, default is 587
        smtp_host: The SMTP host
        email_reset_token_expire_minutes: The email token expiry in minutes, defaults to 60 minutes
        refresh_token_expire_minutes: The reset token expiry in minutes, defaults to 60 minutes
        token_expire_minutes: The token expiry in minutes, defaults to 30 minutes
        secret_key: The key used to hash passwords and psks
        authjwt_refresh_key: The refresh token key
        admin_users: The default admin users
        user_default_password: The admin default password
        google_client_id: Google OAuth client ID
        magic_link_refresh_seconds: Magic link refresh interval in seconds
    """
    app_name: str = "your_backend_app"
    # Public base URL of the site — used to build every user-facing link emailed
    # out (verification, password reset, magic link, etc.). Set this to the
    # frontend's public URL in production.
    app_domain: str = "http://localhost:5151"
    mount_point: str = ""
    db_name: str = "your_backend_app_backend"
    db_conn_str: str = "mongodb://localhost:27017/"
    allow_new_users: bool = True
    magic_link_enabled: bool = True
    emails_enabled: bool = True
    emails_from_name: str = "Alejandro Jordan"
    emails_from_email: str = "no-reply@jordanbojanic.com"
    smtp_tls: bool = True
    smtp_ssl: bool = False
    smtp_user: str = "resend"
    smtp_password: str = ""
    smtp_port: int = 587
    smtp_host: str = "smtp.resend.com"
    email_reset_token_expire_minutes: int = 60
    email_verify_token_expire_minutes: int = 1440  # 24h to confirm an email address
    refresh_token_expire_minutes: int = 60
    token_expire_minutes: int = 30
    secret_key: str = "change_me"
    authjwt_refresh_key: str = "change_me"
    admin_users: str = ""
    user_default_password: str = "change_me"
    google_client_id: str = "change_me"
    apple_client_id: str = "change_me"
    magic_link_refresh_seconds: int = 60
    cors_origins: str = "http://localhost:3000,http://localhost:5173,*"
    db_max_pool_size: int = 10
    db_min_pool_size: int = 1

    # --- File storage (donation screenshots) ---
    # storage_backend: "local" (dev, files saved under upload_dir and served at /uploads)
    #                  or "gcs" (production, uploaded to a Google Cloud Storage bucket).
    storage_backend: str = "local"
    upload_dir: str = "uploads"
    gcs_bucket: str = ""
    # Optional path to a GCS service-account JSON key. If empty, falls back to
    # Application Default Credentials (GOOGLE_APPLICATION_CREDENTIALS / workload identity).
    gcs_credentials_file: str = ""
    # Public base URL used to build returned image URLs.
    #   - local: defaults to app_domain (served from /uploads)
    #   - gcs:   defaults to https://storage.googleapis.com/<gcs_bucket>
    public_storage_base_url: str = ""

    # --- Challenge links (sent in the registration confirmation email) ---
    # Strava club — community & questions only (not used for distance tracking).
    strava_club_url: str = ""
    # Challenge Hound challenge links per discipline — where distance is tracked.
    challenge_run_url: str = ""
    challenge_bike_url: str = ""
    # Access code participants use to join the Challenge Hound challenge.
    challenge_join_code: str = "1millamas"
    # Minimum GoFundMe donation required to enter (display string).
    min_donation: str = "$25"

    class Config:
        env_file = '.env'
        extra = "ignore"

    @property
    def mode(self) -> Mode:
        """
            Returns the application mode based on the database connection string.
            Returns Mode.dev if using localhost, otherwise Mode.prod.
        """
        return Mode.dev if "localhost" in self.db_conn_str else Mode.prod

    @property
    def default_admin_users(self) -> List:
        """
            Returns the default admin users formatted to a list
        """
        return self.admin_users.split('|')

    @property
    def main_app_description(self) -> str:
        return f"""{self.app_name} stater project"""

    @property
    def cors_origins_list(self) -> List[str]:
        """Returns CORS origins as a list"""
        return [origin.strip() for origin in self.cors_origins.split(',') if origin.strip()]

    def validate_production_secrets(self) -> None:
        """Validate that production secrets have been changed from defaults"""
        if self.mode == Mode.prod:
            dangerous_defaults = []
            if self.secret_key == "change_me":
                dangerous_defaults.append("secret_key")
            if self.authjwt_refresh_key == "change_me":
                dangerous_defaults.append("authjwt_refresh_key")
            if self.user_default_password == "change_me":
                dangerous_defaults.append("user_default_password")

            if dangerous_defaults:
                raise ValueError(
                    f"SECURITY ERROR: Production mode detected but the following secrets are using default values: "
                    f"{', '.join(dangerous_defaults)}. Please set proper values in environment variables."
                )


settings = Settings()
settings.validate_production_secrets()

