from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    base_url: str = "http://localhost:5151"
    admin_token: str = ""
    db_conn_str: str = "mongodb://localhost:27017/"
    db_name: str = "your_backend_app_backend"

    class Config:
        env_file = ".env"
        extra = "ignore"


settings = Settings()
