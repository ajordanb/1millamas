import httpx
import jwt
from async_lru import alru_cache

from app.core.security.api import verify_password, CustomOAuth2RequestForm
from app.core.config import settings
from app.user.model import User, APIKey
from fastapi import HTTPException

GOOGLE_KEYS_URL = "https://www.googleapis.com/oauth2/v3/certs"
AUDIENCE = settings.google_client_id


async def password_authenticated_user(
        form: CustomOAuth2RequestForm,
) -> User:
    user = await User.by_email(form.username)
    if user is None:
        raise HTTPException(status_code=401, detail="User does not exist")
    if not user.is_active:
        raise HTTPException(status_code=401, detail="Inactive user")
    if not user.password:
        # Social-only account (e.g. Google) — no password set.
        raise HTTPException(
            status_code=401,
            detail="This account has no password. Try signing in with Google.",
        )
    if not verify_password(form.password, user.password):
        raise HTTPException(status_code=401, detail="Incorrect password")
    return user


async def client_id_authenticated_user(
        form: CustomOAuth2RequestForm,
) -> User | None:
    user = await User.find_one({"api_keys.client_id": form.client_id})
    if not user:
        raise HTTPException(status_code=401, detail="Bad client_id")
    if not user.is_active:
        raise HTTPException(status_code=401, detail="Inactive user")
    api_key: APIKey = {a.client_id: a for a in user.api_keys}[form.client_id]
    if not api_key.active:
        raise HTTPException(status_code=401, detail="API key is disabled")
    if not verify_password(form.client_secret, api_key.hashed_client_secret):
        raise HTTPException(status_code=401, detail="Bad client_secret")
    user._using_api_key = True
    user._api_key = api_key
    return user


@alru_cache(maxsize=1)  # Cache the latest certs
async def fetch_google_certs():
    async with httpx.AsyncClient() as client:
        response = await client.get(GOOGLE_KEYS_URL)
    return response.json()

async def validate_google_jwt(id_token):
    headers = jwt.get_unverified_header(id_token)
    if "kid" not in headers:
        raise ValueError("JWT header is missing key ID (kid)")

    jwks = await fetch_google_certs()

    if headers["kid"] not in [key["kid"] for key in jwks["keys"]]:
        fetch_google_certs.cache_clear()
        jwks = await fetch_google_certs()

    public_key_info = next(key for key in jwks["keys"] if key["kid"] == headers["kid"])

    try:
        decoded_token = jwt.decode(
            id_token, public_key_info, algorithms=["RS256"], audience=AUDIENCE
        )
        return decoded_token
    except jwt.ExpiredSignatureError:
        raise ValueError("JWT has expired")
    except jwt.JWTClaimsError as e:
        print(e, e.args)
        raise ValueError("JWT claims error")
    except Exception as e:
        raise ValueError(f"Failed to decode the JWT: {e}")


