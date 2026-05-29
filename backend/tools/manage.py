import os
from pathlib import Path
from dotenv import load_dotenv
from loguru import logger
import questionary

env_path = Path(__file__).parent.parent / '.env'
load_dotenv(env_path)


def start_api_only():
    """Start just the FastAPI server for development"""
    logger.info("Starting FastAPI server...")
    backend_dir = Path(__file__).parent.parent
    os.chdir(backend_dir)
    os.system("uvicorn app.main:app --reload --host 127.0.0.1 --port 8000")


actions = {
    "Start API": start_api_only,
}


if __name__ == "__main__":
    action = questionary.select(
        "Tools - what do you want to do?", choices=list(actions.keys())
    ).ask()
    result = actions[action]()
