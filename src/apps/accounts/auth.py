"""
SEAM — Authentication Backend

JWT token management and API key authentication for Django Ninja.
"""

from __future__ import annotations

from datetime import UTC, datetime, timedelta
from typing import TYPE_CHECKING, Any

import jwt
from django.conf import settings
from django.utils import timezone as dj_timezone
from ninja.security import HttpBearer

from apps.accounts.models import APIKey, User

if TYPE_CHECKING:
    from django.http import HttpRequest

# JWT Configuration
JWT_ALGORITHM = "HS256"
JWT_ACCESS_TOKEN_LIFETIME = timedelta(hours=1)
JWT_REFRESH_TOKEN_LIFETIME = timedelta(days=7)


def create_access_token(user: User) -> tuple[str, int]:
    """
    Create a JWT access token for the given user.

    Returns:
        Tuple of (token_string, expires_in_seconds)
    """
    now = datetime.now(tz=UTC)
    expires_at = now + JWT_ACCESS_TOKEN_LIFETIME
    payload = {
        "sub": str(user.id),
        "email": user.email,
        "type": "access",
        "iat": now,
        "exp": expires_at,
    }
    token = jwt.encode(payload, settings.SECRET_KEY, algorithm=JWT_ALGORITHM)
    return token, int(JWT_ACCESS_TOKEN_LIFETIME.total_seconds())


def create_refresh_token(user: User) -> str:
    """Create a JWT refresh token for the given user."""
    now = datetime.now(tz=UTC)
    payload = {
        "sub": str(user.id),
        "type": "refresh",
        "iat": now,
        "exp": now + JWT_REFRESH_TOKEN_LIFETIME,
    }
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=JWT_ALGORITHM)


def decode_token(token: str) -> dict[str, Any]:
    """Decode and validate a JWT token."""
    return jwt.decode(token, settings.SECRET_KEY, algorithms=[JWT_ALGORITHM])


class JWTAuth(HttpBearer):
    """JWT Bearer token authentication for Django Ninja."""

    def authenticate(self, request: HttpRequest, token: str) -> User | None:
        try:
            payload = decode_token(token)
            if payload.get("type") != "access":
                return None
            user = User.objects.filter(id=payload["sub"], is_active=True).first()
            if not user:
                return None
            
            workspace_id = request.headers.get("X-Workspace-ID")
            if workspace_id:
                try:
                    from apps.workspaces.models import Workspace
                    workspace = Workspace.objects.filter(
                        id=workspace_id,
                        memberships__user=user,
                        is_active=True,
                    ).first()
                    if workspace:
                        request.workspace = workspace  # type: ignore[attr-defined]
                except (ValueError, TypeError):
                    pass
            
            return user
        except (jwt.ExpiredSignatureError, jwt.InvalidTokenError):
            return None


class APIKeyAuth(HttpBearer):
    """API Key authentication for Django Ninja."""

    def authenticate(self, request: HttpRequest, token: str) -> User | None:
        hashed = APIKey.hash_key(token)
        api_key = APIKey.objects.select_related("user", "workspace").filter(hashed_key=hashed, is_active=True).first()
        if api_key is None:
            return None

        # Check expiration
        if api_key.expires_at and api_key.expires_at < dj_timezone.now():
            return None

        # Update last used
        api_key.last_used_at = dj_timezone.now()
        api_key.save(update_fields=["last_used_at"])

        # Attach workspace to request for downstream use
        request.workspace = api_key.workspace  # type: ignore[attr-defined]

        return api_key.user


# Combined auth: accepts either JWT or API Key
auth = [JWTAuth(), APIKeyAuth()]
