"""
PayloadOps — Workflows API Endpoints

CRUD for Workflows, Triggers, Actions, Credentials, and Webhook ingestion.
"""

from __future__ import annotations

from typing import TYPE_CHECKING, Any

from ninja import Router

from apps.accounts.auth import auth
from apps.accounts.schemas import MessageOutput
from apps.workflows.models import Action, Credential, Trigger, Workflow
from apps.workflows.schemas import (
    ActionCreateInput,
    ActionOutput,
    ActionUpdateInput,
    CredentialCreateInput,
    CredentialOutput,
    WebhookAcceptedOutput,
    WorkflowCreateInput,
    WorkflowDetailOutput,
    WorkflowOutput,
    WorkflowUpdateInput,
)

if TYPE_CHECKING:
    from django.http import HttpRequest

router = Router()


# ==========================================
# Workflow CRUD
# ==========================================


@router.post("/", auth=auth, response={201: WorkflowOutput, 400: MessageOutput})
def create_workflow(request: HttpRequest, payload: WorkflowCreateInput):
    """Create a new workflow with an auto-generated webhook trigger."""
    workspace = getattr(request, "workspace", None)
    if workspace is None:
        return 400, {"detail": "X-Workspace-ID header is required."}

    workflow = Workflow.objects.create(
        workspace=workspace,
        name=payload.name,
        description=payload.description,
    )

    # Auto-create a webhook trigger
    Trigger.objects.create(
        workspace=workspace,
        workflow=workflow,
    )

    return 201, workflow


@router.get("/", auth=auth, response=list[WorkflowOutput])
def list_workflows(request: HttpRequest):
    """List all workflows in the current workspace."""
    workspace = getattr(request, "workspace", None)
    if workspace is None:
        return []
    return Workflow.objects.for_workspace(workspace)


@router.get("/{workflow_id}", auth=auth, response={200: WorkflowDetailOutput, 404: MessageOutput})
def get_workflow(request: HttpRequest, workflow_id: str):
    """Get detailed workflow info including trigger and actions."""
    workspace = getattr(request, "workspace", None)
    workflow = Workflow.objects.filter(id=workflow_id, workspace=workspace).first()
    if workflow is None:
        return 404, {"detail": "Workflow not found."}

    trigger = Trigger.objects.filter(workflow=workflow).first()
    actions = list(Action.objects.filter(workflow=workflow).order_by("order"))

    return 200, {
        "id": workflow.id,
        "name": workflow.name,
        "description": workflow.description,
        "status": workflow.status,
        "created_at": workflow.created_at,
        "updated_at": workflow.updated_at,
        "trigger": trigger,
        "actions": actions,
    }


@router.patch("/{workflow_id}", auth=auth, response={200: WorkflowOutput, 404: MessageOutput})
def update_workflow(request: HttpRequest, workflow_id: str, payload: WorkflowUpdateInput):
    """Update a workflow's name, description, or status."""
    workspace = getattr(request, "workspace", None)
    workflow = Workflow.objects.filter(id=workflow_id, workspace=workspace).first()
    if workflow is None:
        return 404, {"detail": "Workflow not found."}

    if payload.name is not None:
        workflow.name = payload.name
    if payload.description is not None:
        workflow.description = payload.description
    if payload.status is not None:
        workflow.status = payload.status
    workflow.save()

    return 200, workflow


@router.delete("/{workflow_id}", auth=auth, response={200: MessageOutput, 404: MessageOutput})
def delete_workflow(request: HttpRequest, workflow_id: str):
    """Delete a workflow and all associated triggers, actions, and logs."""
    workspace = getattr(request, "workspace", None)
    workflow = Workflow.objects.filter(id=workflow_id, workspace=workspace).first()
    if workflow is None:
        return 404, {"detail": "Workflow not found."}

    workflow.delete()
    return 200, {"detail": "Workflow deleted successfully."}


# ==========================================
# Action CRUD
# ==========================================


@router.post(
    "/{workflow_id}/actions",
    auth=auth,
    response={201: ActionOutput, 404: MessageOutput},
)
def create_action(request: HttpRequest, workflow_id: str, payload: ActionCreateInput):
    """Add an action to a workflow."""
    workspace = getattr(request, "workspace", None)
    workflow = Workflow.objects.filter(id=workflow_id, workspace=workspace).first()
    if workflow is None:
        return 404, {"detail": "Workflow not found."}

    action = Action.objects.create(
        workspace=workspace,
        workflow=workflow,
        name=payload.name,
        order=payload.order,
        http_method=payload.http_method,
        url=payload.url,
        headers=payload.headers,
        body_template=payload.body_template,
    )

    return 201, action


@router.get("/{workflow_id}/actions", auth=auth, response=list[ActionOutput])
def list_actions(request: HttpRequest, workflow_id: str):
    """List all actions for a workflow."""
    workspace = getattr(request, "workspace", None)
    return Action.objects.filter(workflow_id=workflow_id, workspace=workspace).order_by("order")


@router.patch(
    "/{workflow_id}/actions/{action_id}",
    auth=auth,
    response={200: ActionOutput, 404: MessageOutput},
)
def update_action(request: HttpRequest, workflow_id: str, action_id: str, payload: ActionUpdateInput):
    """Update an action."""
    workspace = getattr(request, "workspace", None)
    action = Action.objects.filter(id=action_id, workflow_id=workflow_id, workspace=workspace).first()
    if action is None:
        return 404, {"detail": "Action not found."}

    for field, value in payload.dict(exclude_unset=True).items():
        setattr(action, field, value)
    action.save()

    return 200, action


@router.delete(
    "/{workflow_id}/actions/{action_id}",
    auth=auth,
    response={200: MessageOutput, 404: MessageOutput},
)
def delete_action(request: HttpRequest, workflow_id: str, action_id: str):
    """Delete an action from a workflow."""
    workspace = getattr(request, "workspace", None)
    action = Action.objects.filter(id=action_id, workflow_id=workflow_id, workspace=workspace).first()
    if action is None:
        return 404, {"detail": "Action not found."}

    action.delete()
    return 200, {"detail": "Action deleted successfully."}


# ==========================================
# Credentials CRUD
# ==========================================


@router.post("/credentials", auth=auth, response={201: CredentialOutput, 400: MessageOutput})
def create_credential(request: HttpRequest, payload: CredentialCreateInput):
    """Store an encrypted credential for the current workspace."""
    workspace = getattr(request, "workspace", None)
    if workspace is None:
        return 400, {"detail": "X-Workspace-ID header is required."}

    credential = Credential(
        workspace=workspace,
        name=payload.name,
        description=payload.description,
    )
    credential.set_value(payload.value)
    credential.save()

    return 201, credential


@router.get("/credentials", auth=auth, response=list[CredentialOutput])
def list_credentials(request: HttpRequest):
    """List all credentials (values are never exposed)."""
    workspace = getattr(request, "workspace", None)
    if workspace is None:
        return []
    return Credential.objects.for_workspace(workspace)


@router.delete(
    "/credentials/{credential_id}",
    auth=auth,
    response={200: MessageOutput, 404: MessageOutput},
)
def delete_credential(request: HttpRequest, credential_id: str):
    """Delete a credential."""
    workspace = getattr(request, "workspace", None)
    credential = Credential.objects.filter(id=credential_id, workspace=workspace).first()
    if credential is None:
        return 404, {"detail": "Credential not found."}

    credential.delete()
    return 200, {"detail": "Credential deleted successfully."}


# ==========================================
# Webhook Ingestion (Public Endpoint)
# ==========================================


@router.post(
    "/hooks/{webhook_path}",
    response={202: WebhookAcceptedOutput, 404: MessageOutput, 422: MessageOutput},
    auth=None,
    url_name="webhook-ingestion",
)
def webhook_ingestion(request: HttpRequest, webhook_path: str, payload: dict[str, Any] | None = None):
    """
    Public webhook ingestion endpoint.

    Receives a POST payload, validates the trigger exists,
    and enqueues the payload for async processing via Celery.
    Returns 202 Accepted immediately.
    """
    # Resolve trigger by webhook path
    trigger = (
        Trigger.objects.select_related("workflow", "workspace")
        .filter(webhook_path=webhook_path, is_active=True)
        .first()
    )

    if trigger is None:
        return 404, {"detail": "Webhook not found."}

    if not trigger.workflow.is_active:
        return 422, {"detail": "Workflow is not active."}

    # Read raw body if payload schema didn't parse
    if payload is None:
        import json

        try:
            payload = json.loads(request.body)
        except (json.JSONDecodeError, ValueError):
            payload = {}

    # Create execution log and enqueue processing
    from apps.engine.tasks import process_webhook_payload
    from apps.observability.models import ExecutionLog

    execution_log = ExecutionLog.objects.create(
        workspace=trigger.workspace,
        workflow=trigger.workflow,
        trigger=trigger,
        status=ExecutionLog.Status.PENDING,
        payload_received=payload,
    )

    # Enqueue for async processing
    process_webhook_payload.delay(str(execution_log.id))

    return 202, {
        "status": "accepted",
        "execution_id": execution_log.id,
        "message": "Payload queued for processing",
    }
