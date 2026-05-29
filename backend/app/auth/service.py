from datetime import datetime, UTC, timedelta
from typing import Union, Optional, Any, List, Tuple
import jwt
from fastapi import HTTPException
from loguru import logger
from password_strength import PasswordPolicy
from pydantic import ValidationError
from starlette import status

from app.core.config import settings
from app.auth.model import Token, Policy, RefreshTokenReq, NewPassword


class SecurityExceptions:
    INVALID_TOKEN_FORMAT = HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Invalid token format",
        headers={"WWW-Authenticate": "Bearer"},
    )

    INVALID_CREDENTIALS = HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    TOKEN_EXPIRED = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Token expired",
        headers={"WWW-Authenticate": "Bearer"},
    )

    WEAK_PASSWORD = HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail="Password does not meet security requirements",
    )


class SecurityService:
    def __init__(self,
                 password_policy: Policy,
                 algorithm: str = "HS256",
                 jwt_secret_key: str = settings.secret_key,
                 jwt_refresh_secret_key: str = settings.authjwt_refresh_key,
                 ):
        self.password_policy = PasswordPolicy.from_names(
            **password_policy.model_dump()
        )
        self.jwt_secret_key = jwt_secret_key
        self.jwt_refresh_secret_key = jwt_refresh_secret_key
        self.algorithm = algorithm

    def validate_password_strength(self, password: str) -> bool:
        from password_strength import tests
        errors = []
        issues = self.password_policy.test(password)
        for error in issues:
            if isinstance(error, tests.Length):
                errors.append(
                    f"Password should be at least {error.length} characters long."
                )
            elif isinstance(error, tests.Numbers):
                errors.append(f"Password should have at least {error.count} digits.")
            elif isinstance(error, tests.NonLetters):
                errors.append(
                    f"Password should have at least {error.count} special characters."
                )
            elif isinstance(error, tests.Uppercase):
                errors.append(
                    f"Password should have at least {error.count} uppercase letters."
                )
        if issues:
            logger.warning(f"Password validation failed: {issues}")
            raise SecurityExceptions.WEAK_PASSWORD
        return True

    def create_token(self,
                     subject: Union[str, Any],
                     expires_minutes: int,
                     secret_key: str,
                     client_id: Optional[str] = None,
                     scopes: Optional[List] = None,
                     roles: Optional[List] = None) -> Tuple[str, datetime]:
        exp = datetime.now(UTC) + timedelta(minutes=expires_minutes)
        payload = {
            "sub": subject,
            "exp": exp,
            "client_id": client_id,
            "scopes": scopes or [],
            "roles": roles or [],
            "iat": datetime.now(UTC),  # Add issued at time
        }
        encoded = jwt.encode(payload, secret_key, self.algorithm)
        return encoded, exp

    def _decode_token(self, token: str, secret_key: str, verify_exp: bool = True) -> dict:
        try:
            return jwt.decode(
                token,
                secret_key,
                algorithms=[self.algorithm],
                options={"verify_exp": verify_exp}
            )
        except jwt.ExpiredSignatureError:
            logger.error("Token has expired")
            raise SecurityExceptions.TOKEN_EXPIRED
        except jwt.PyJWTError as e:
            logger.error(f"Token validation failed: {e}")
            raise SecurityExceptions.INVALID_CREDENTIALS

    def validate_token(self, token: str, secret_key: str) -> Token:
        try:
            if token.startswith("Bearer "):
                token = token[7:]

            raw_payload = self._decode_token(token, secret_key)
            token_data = Token.model_validate(raw_payload)
            if token_data.is_expired():
                logger.error("Token is expired according to payload")
                raise SecurityExceptions.TOKEN_EXPIRED
            return token_data

        except ValidationError as e:
            logger.error(f"Invalid token format: {e}")
            raise SecurityExceptions.INVALID_TOKEN_FORMAT

    def validate_access_token(self, token: str) -> Token:
        return self.validate_token(token, self.jwt_secret_key)

    def validate_refresh_token(self, token: str) -> Token:
        return self.validate_token(token, self.jwt_refresh_secret_key)


class AuthService:
    def __init__(self,
                 security_service: SecurityService,
                 access_token_expire_minutes: int = settings.token_expire_minutes,
                 refresh_token_expire_minutes: int = settings.refresh_token_expire_minutes
                 ):
        self.security_service = security_service
        self.access_token_expire_minutes = access_token_expire_minutes
        self.refresh_token_expire_minutes = refresh_token_expire_minutes

    def create_access_token(self,
                            subject: Union[str, Any],
                            expires_delta: Optional[int] = None,
                            scopes: Optional[List] = None,
                            roles: Optional[List] = None,
                            client_id: Optional[str] = None
                            ) -> Tuple[str, datetime]:
        expires_minutes = expires_delta or self.access_token_expire_minutes
        return self.security_service.create_token(
            subject=subject,
            expires_minutes=expires_minutes,
            secret_key=self.security_service.jwt_secret_key,
            client_id=client_id,
            roles=roles,
            scopes=scopes
        )

    def create_refresh_token(self,
                             subject: Union[str, Any],
                             expires_delta: Optional[int] = None,
                             scopes: Optional[List] = None,
                             roles: Optional[List] = None,
                             client_id: Optional[str] = None
                             ) -> Tuple[str, datetime]:
        expires_minutes = expires_delta or self.refresh_token_expire_minutes
        return self.security_service.create_token(
            subject=subject,
            expires_minutes=expires_minutes,
            secret_key=self.security_service.jwt_refresh_secret_key,
            client_id=client_id,
            roles=roles,
            scopes=scopes
        )

    def create_token_pair(self,
                          subject: Union[str, Any],
                          scopes: Optional[List] = None,
                          roles: Optional[List] = None,
                          client_id: Optional[str] = None
                          ) -> dict:
        access_token, access_exp = self.create_access_token(
            subject=subject, scopes=scopes, roles=roles, client_id=client_id
        )
        refresh_token, refresh_exp = self.create_refresh_token(
            subject=subject, scopes=scopes, roles=roles, client_id=client_id
        )
        return {
            "access_token": access_token,
            "refresh_token": refresh_token,
            "token_type": "bearer",
            "expires_in": self.access_token_expire_minutes * 60,  # seconds
            "access_expires_at": access_exp,
            "refresh_expires_at": refresh_exp,
        }

    def refresh_access_token(self, refresh_token_req: RefreshTokenReq) -> dict:
        token_data = self.security_service.validate_refresh_token(refresh_token_req.refreshToken)
        access_token, access_exp = self.create_access_token(
            subject=token_data.sub,
            scopes=token_data.scopes,
            roles=token_data.roles,
            client_id=token_data.client_id
        )

        return {
            "access_token": access_token,
            "token_type": "bearer",
            "expires_in": self.access_token_expire_minutes * 60,
            "expires_at": access_exp,
        }

    def validate_password_change_request(self, request: NewPassword) -> bool:
        self.security_service.validate_password_strength(request.new_password)
        if request.old_password == request.new_password:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="New password must be different from current password"
            )

        return True

