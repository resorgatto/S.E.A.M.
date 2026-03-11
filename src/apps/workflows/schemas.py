"""
PayloadOps — Workflow API Schemas
"""

from __future__ import annotations

import uuid
from datetime import datetime

from ninja import Schema
from pydantic import Field


# ==========================================
# Workflow Schemas
# ==========================================


class WorkflowCreateInput(Schema):
    """Input for creating a workflow."""

    name: str = Field(min_length=1, max_length=200)
    description: str = ""


class WorkflowUpdateInput(Schema):
    """Input for updating a workflow."""

    name: str | None = None
    description: str | None = None
    status: str | None = None


class WorkflowOutput(Schema):
    """Output for a workflow."""

    id: uuid.UUID
    name: str
    description: str
    status: str
    created_at: datetime
    updated_at: datetime


class WorkflowDetailOutput(WorkflowOutput):
    """Detailed workflow output with trigger and actions."""

    trigger: TriggerOutput | None = None
    actions: list[ActionOutput] = []


# ==========================================
# Trigger Schemas
# ==========================================


class TriggerOutput(Schema):
    """Output for a trigger."""

    id: uuid.UUID
    trigger_type: str
    webhook_path: uuid.UUID
    webhook_url: str
    is_active: bool
    created_at: datetime


# ==========================================
# Action Schemas
# ==========================================


class ActionCreateInput(Schema):
    """Input for creating an action."""

    name: str = Field(min_length=1, max_length=200)
    order: int = 0
    http_method: str = "POST"
    url: str = Field(min_length=1, max_length=2000)
    headers: dict = {}
    body_template: dict = {}


class ActionUpdateInput(Schema):
    """Input for updating an action."""

    name: str | None = None
    order: int | None = None
    http_method: str | None = None
    url: str | None = None
    headers: dict | None = None
    body_template: dict | None = None
    is_active: bool | None = None


class ActionOutput(Schema):
    """Output for an action."""

    id: uuid.UUID
    name: str
    order: int
    http_method: str
    url: str
    headers: dict
    body_template: dict
    is_active: bool
    created_at: datetime


# Resolve forward references
WorkflowDetailOutput.model_rebuild()


# ==========================================
# Credential Schemas
# ==========================================


class CredentialCreateInput(Schema):
    """Input for creating a credential."""

    name: str = Field(min_length=1, max_length=200)
    description: str = ""
    value: str = Field(min_length=1)


class CredentialOutput(Schema):
    """Output for a credential (value is never exposed)."""

    id: uuid.UUID
    name: str
    description: str
    created_at: datetime


# ==========================================
# Webhook Schemas
# ==========================================


class WebhookAcceptedOutput(Schema):
    """Response for accepted webhook payload."""

    status: str = "accepted"
    execution_id: uuid.UUID
    message: str = "Payload queued for processing"
