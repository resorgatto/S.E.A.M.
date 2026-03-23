"""
SEAM — Accounts Models

Custom User model and API Key management.
"""

from __future__ import annotations

import hashlib
import secrets
import uuid

from django.contrib.auth.models import AbstractUser
from django.db import models

from common.mixins import BaseModel


class User(AbstractUser):
    """
    Custom user model for SEAM.
    Uses UUID as primary key and email as the unique identifier.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    email = models.EmailField(unique=True)
    full_name = models.CharField(max_length=255, blank=True)
    avatar = models.ImageField(upload_to="avatars/", blank=True, null=True)
    is_verified = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = ["username"]

    class Meta:
        db_table = "accounts_user"
        verbose_name = "User"
        verbose_name_plural = "Users"

    def __str__(self) -> str:
        return self.email


class APIKey(BaseModel):
    """
    API Key model for programmatic access.

    Keys are generated with a visible prefix (po_live_ or po_test_)
    and stored as SHA-256 hashes for security.
    """

    PREFIX_LIVE = "po_live_"
    PREFIX_TEST = "po_test_"

    name = models.CharField(max_length=100, help_text="A descriptive name for this API key")
    prefix = models.CharField(max_length=16, db_index=True, help_text="Visible key prefix")
    hashed_key = models.CharField(max_length=128, unique=True, help_text="SHA-256 hash of the full key")
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="api_keys")
    workspace = models.ForeignKey(
        "workspaces.Workspace",
        on_delete=models.CASCADE,
        related_name="api_keys",
    )
    is_active = models.BooleanField(default=True)
    last_used_at = models.DateTimeField(null=True, blank=True)
    expires_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "accounts_api_key"
        verbose_name = "API Key"
        verbose_name_plural = "API Keys"

    def __str__(self) -> str:
        return f"{self.name} ({self.prefix}...)"

    @classmethod
    def generate_key(cls, is_test: bool = False) -> tuple[str, str, str]:
        """
        Generate a new API key.

        Returns:
            Tuple of (full_key, prefix, hashed_key)
        """
        prefix = cls.PREFIX_TEST if is_test else cls.PREFIX_LIVE
        random_part = secrets.token_urlsafe(32)
        full_key = f"{prefix}{random_part}"
        hashed = hashlib.sha256(full_key.encode()).hexdigest()
        return full_key, prefix, hashed

    @staticmethod
    def hash_key(key: str) -> str:
        """Hash an API key for lookup."""
        return hashlib.sha256(key.encode()).hexdigest()
