"""
SEAM — Accounts API Endpoints

Authentication (register, login, refresh) and API key management.
"""

from __future__ import annotations

import os
from typing import TYPE_CHECKING

import jwt
from django.contrib.auth import authenticate
from django.contrib.auth.hashers import check_password
from ninja import File, Router
from ninja.files import UploadedFile

from apps.accounts.auth import (
    JWTAuth,
    auth,
    create_access_token,
    create_refresh_token,
    decode_token,
)
from apps.accounts.models import APIKey, User
from apps.accounts.schemas import (
    APIKeyCreatedOutput,
    APIKeyCreateInput,
    APIKeyOutput,
    LoginInput,
    MessageOutput,
    PasswordChangeInput,
    ProfileUpdateInput,
    RefreshInput,
    RegisterInput,
    TokenOutput,
    UserOutput,
)

if TYPE_CHECKING:
    from django.http import HttpRequest

router = Router()


# ==========================================
# Authentication
# ==========================================


@router.post("/register", response={201: UserOutput, 400: MessageOutput})
def register(request: HttpRequest, payload: RegisterInput):
    """Register a new user account."""
    email = payload.email.lower().strip()
    if User.objects.filter(email=email).exists():
        return 400, {"detail": "A user with this email already exists."}

    if User.objects.filter(username=payload.username).exists():
        return 400, {"detail": "A user with this username already exists."}

    user = User.objects.create_user(
        email=email,
        username=payload.username,
        password=payload.password,
        full_name=payload.full_name,
    )
    return 201, user


@router.post("/login", response={200: TokenOutput, 401: MessageOutput})
def login(request: HttpRequest, payload: LoginInput):
    """Login and receive JWT access and refresh tokens."""
    email = payload.email.lower().strip()
    user = authenticate(request, username=email, password=payload.password)
    if user is None:
        return 401, {"detail": "Invalid email or password."}

    access_token, expires_in = create_access_token(user)
    refresh_token = create_refresh_token(user)

    return 200, {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "expires_in": expires_in,
    }


@router.post("/refresh", response={200: TokenOutput, 401: MessageOutput})
def refresh(request: HttpRequest, payload: RefreshInput):
    """Refresh an access token using a valid refresh token."""
    try:
        token_data = decode_token(payload.refresh_token)
        if token_data.get("type") != "refresh":
            return 401, {"detail": "Invalid token type."}

        user = User.objects.filter(id=token_data["sub"], is_active=True).first()
        if user is None:
            return 401, {"detail": "User not found."}

        access_token, expires_in = create_access_token(user)
        new_refresh_token = create_refresh_token(user)

        return 200, {
            "access_token": access_token,
            "refresh_token": new_refresh_token,
            "token_type": "bearer",
            "expires_in": expires_in,
        }
    except (jwt.ExpiredSignatureError, jwt.InvalidTokenError):
        return 401, {"detail": "Invalid or expired refresh token."}


@router.get("/me", auth=JWTAuth(), response=UserOutput)
def me(request: HttpRequest):
    """Get the current authenticated user's profile."""
    return request.auth


# ==========================================
# Profile Management
# ==========================================


@router.put("/me", auth=JWTAuth(), response={200: UserOutput, 400: MessageOutput})
def update_profile(request: HttpRequest, payload: ProfileUpdateInput):
    """Update the current user's profile information."""
    user: User = request.auth
    update_fields = []

    if payload.full_name is not None:
        user.full_name = payload.full_name
        update_fields.append("full_name")

    if payload.username is not None:
        if User.objects.filter(username=payload.username).exclude(id=user.id).exists():
            return 400, {"detail": "A user with this username already exists."}
        user.username = payload.username
        update_fields.append("username")

    if payload.email is not None:
        new_email = payload.email.lower().strip()
        if User.objects.filter(email=new_email).exclude(id=user.id).exists():
            return 400, {"detail": "A user with this email already exists."}
        user.email = new_email
        update_fields.append("email")

    if update_fields:
        user.save(update_fields=update_fields)

    return 200, user


@router.put("/me/password", auth=JWTAuth(), response={200: MessageOutput, 400: MessageOutput})
def change_password(request: HttpRequest, payload: PasswordChangeInput):
    """Change the current user's password."""
    user: User = request.auth

    if not check_password(payload.current_password, user.password):
        return 400, {"detail": "Current password is incorrect."}

    user.set_password(payload.new_password)
    user.save(update_fields=["password"])
    return 200, {"detail": "Password updated successfully."}


@router.post("/me/avatar", auth=JWTAuth(), response={200: UserOutput, 400: MessageOutput})
def upload_avatar(request: HttpRequest, file: UploadedFile = File(...)):
    """Upload or replace the current user's avatar."""
    user: User = request.auth

    # Validate file type
    allowed_types = {"image/jpeg", "image/png", "image/webp", "image/gif"}
    if file.content_type not in allowed_types:
        return 400, {"detail": "Invalid file type. Allowed: JPEG, PNG, WebP, GIF."}

    # Validate file size (max 5MB)
    if file.size and file.size > 5 * 1024 * 1024:
        return 400, {"detail": "File too large. Maximum size is 5MB."}

    # Delete old avatar file if exists
    if user.avatar:
        old_path = user.avatar.path
        if os.path.exists(old_path):
            os.remove(old_path)

    user.avatar = file
    user.save(update_fields=["avatar"])
    return 200, user


@router.delete("/me/avatar", auth=JWTAuth(), response={200: MessageOutput})
def delete_avatar(request: HttpRequest):
    """Remove the current user's avatar."""
    user: User = request.auth

    if user.avatar:
        old_path = user.avatar.path
        if os.path.exists(old_path):
            os.remove(old_path)
        user.avatar = None
        user.save(update_fields=["avatar"])

    return 200, {"detail": "Avatar removed successfully."}


# ==========================================
# API Keys
# ==========================================


@router.post("/api-keys", auth=auth, response={201: APIKeyCreatedOutput, 400: MessageOutput})
def create_api_key(request: HttpRequest, payload: APIKeyCreateInput):
    """Create a new API key for the current workspace."""
    workspace = getattr(request, "workspace", None)
    if workspace is None:
        return 400, {"detail": "X-Workspace-ID header is required."}

    full_key, prefix, hashed = APIKey.generate_key(is_test=payload.is_test)

    api_key = APIKey.objects.create(
        name=payload.name,
        prefix=prefix,
        hashed_key=hashed,
        user=request.auth,
        workspace=workspace,
    )

    return 201, {
        "id": api_key.id,
        "name": api_key.name,
        "prefix": api_key.prefix,
        "key": full_key,
        "is_active": api_key.is_active,
        "last_used_at": api_key.last_used_at,
        "expires_at": api_key.expires_at,
        "created_at": api_key.created_at,
    }


@router.get("/api-keys", auth=auth, response=list[APIKeyOutput])
def list_api_keys(request: HttpRequest):
    """List all API keys for the current workspace."""
    workspace = getattr(request, "workspace", None)
    if workspace is None:
        return []
    return APIKey.objects.filter(workspace=workspace, user=request.auth)


@router.delete("/api-keys/{key_id}", auth=auth, response={200: MessageOutput, 404: MessageOutput})
def revoke_api_key(request: HttpRequest, key_id: str):
    """Revoke (deactivate) an API key."""
    api_key = APIKey.objects.filter(
        id=key_id,
        user=request.auth,
    ).first()

    if api_key is None:
        return 404, {"detail": "API key not found."}

    api_key.is_active = False
    api_key.save(update_fields=["is_active"])
    return 200, {"detail": "API key revoked successfully."}
