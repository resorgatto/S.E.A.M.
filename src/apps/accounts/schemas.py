"""
PayloadOps — Accounts API Schemas

Pydantic schemas for authentication and API key management.
"""

from __future__ import annotations

import uuid
from datetime import datetime

from ninja import Schema
from pydantic import EmailStr, Field  # noqa: I001


# ==========================================
# Auth Schemas
# ==========================================


class RegisterInput(Schema):
    """Input schema for user registration."""

    email: EmailStr
    username: str = Field(min_length=3, max_length=150)
    password: str = Field(min_length=8, max_length=128)
    full_name: str = Field(default="", max_length=255)


class LoginInput(Schema):
    """Input schema for user login."""

    email: EmailStr
    password: str


class TokenOutput(Schema):
    """Output schema for JWT tokens."""

    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int


class RefreshInput(Schema):
    """Input schema for token refresh."""

    refresh_token: str


class UserOutput(Schema):
    """Output schema for user profile."""

    id: uuid.UUID
    email: str
    username: str
    full_name: str
    is_verified: bool
    created_at: datetime


# ==========================================
# API Key Schemas
# ==========================================


class APIKeyCreateInput(Schema):
    """Input schema for creating an API key."""

    name: str = Field(min_length=1, max_length=100)
    is_test: bool = False


class APIKeyOutput(Schema):
    """Output schema for API key (without the full key)."""

    id: uuid.UUID
    name: str
    prefix: str
    is_active: bool
    last_used_at: datetime | None
    expires_at: datetime | None
    created_at: datetime


class APIKeyCreatedOutput(APIKeyOutput):
    """
    Output schema returned only on creation.
    Includes the full key — shown only once.
    """

    key: str


class MessageOutput(Schema):
    """Generic message output."""

    detail: str
