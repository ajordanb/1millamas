import asyncio
import base64
import functools
import os

from cryptography.fernet import Fernet
from loguru import logger


def generate_random_text(length: int = 16):
    return os.urandom(length).hex()

def convert_to_key(psk: str):
    repetitions = (32 // len(psk)) + 1
    modified_psk = (psk * repetitions)[:32]
    return base64.urlsafe_b64encode(modified_psk.encode())


def encrypt_message(message: str, key: str):
    key = convert_to_key(key)
    cipher_suite = Fernet(key)
    encrypted_message = cipher_suite.encrypt(message.encode())
    return encrypted_message.decode()


def decrypt_message(encrypted_message: str, key: str):
    key = convert_to_key(key)
    cipher_suite = Fernet(key)
    decrypted_message = cipher_suite.decrypt(encrypted_message.encode()).decode()
    return decrypted_message

def fire_and_forget(f):
    @functools.wraps(f)
    async def wrapper(*args, **kwargs):
        try:
            return asyncio.create_task(f(*args, **kwargs))
        except Exception as e:
            logger.error(f"Error in {f.__name__}: {e}")
    return wrapper