"""
PayloadOps — Celery Tasks (Processing Engine)

Core async tasks for processing webhook payloads:
1. process_webhook_payload: Main orchestrator — processes a webhook and executes actions
2. execute_action: Performs an outbound HTTP request with retry logic
3. handle_dead_letter: Moves failed executions to Dead Letter Queue (DLQ)

Retry strategy: Exponential backoff (2^attempt seconds), max 3 retries.
After max retries: task is moved to DLQ for manual review.
"""

from __future__ import annotations

import logging
import time
from typing import Any

import httpx
from celery import shared_task
from django.conf import settings
from django.utils import timezone

logger = logging.getLogger(__name__)


@shared_task(
    bind=True,
    name="engine.process_webhook_payload",
    max_retries=0,  # Orchestrator doesn't retry — individual actions do
    acks_late=True,
    reject_on_worker_lost=True,
)
def process_webhook_payload(self, execution_log_id: str) -> dict[str, Any]:
    """
    Main orchestrator task: processes a webhook payload by executing
    all actions in the workflow sequentially.

    Args:
        execution_log_id: UUID of the ExecutionLog entry to process.

    Returns:
        Summary dict with results of all action executions.
    """
    from apps.observability.models import ExecutionLog
    from apps.workflows.models import Action

    logger.info("Processing webhook payload for execution %s", execution_log_id)

    try:
        execution_log = ExecutionLog.objects.select_related("workflow").get(id=execution_log_id)
    except ExecutionLog.DoesNotExist:
        logger.error("ExecutionLog %s not found", execution_log_id)
        return {"error": "ExecutionLog not found"}

    # Mark as processing
    execution_log.status = ExecutionLog.Status.PROCESSING
    execution_log.started_at = timezone.now()
    execution_log.save(update_fields=["status", "started_at"])

    # Get all active actions for the workflow, ordered by priority
    actions = Action.objects.filter(
        workflow=execution_log.workflow,
        is_active=True,
    ).order_by("order")

    if not actions.exists():
        execution_log.status = ExecutionLog.Status.SUCCESS
        execution_log.completed_at = timezone.now()
        execution_log.save(update_fields=["status", "completed_at"])
        logger.info("No actions to execute for workflow %s", execution_log.workflow.name)
        return {"status": "success", "message": "No actions configured"}

    results = []
    all_success = True

    for action in actions:
        # Dispatch action execution (synchronous within the worker)
        result = _execute_single_action(
            action=action,
            payload=execution_log.payload_received,
            execution_log=execution_log,
        )
        results.append(result)

        if not result["success"]:
            all_success = False
            # If action failed and exhausted retries, stop pipeline
            if result.get("dead_letter"):
                break

    # Update final status
    execution_log.completed_at = timezone.now()
    if execution_log.started_at:
        duration = (execution_log.completed_at - execution_log.started_at).total_seconds() * 1000
        execution_log.duration_ms = int(duration)

    if all_success:
        execution_log.status = ExecutionLog.Status.SUCCESS
    else:
        # Check if any action went to DLQ
        if any(r.get("dead_letter") for r in results):
            execution_log.status = ExecutionLog.Status.DEAD_LETTER
        else:
            execution_log.status = ExecutionLog.Status.FAILED

    execution_log.save(update_fields=["status", "completed_at", "duration_ms"])

    logger.info(
        "Execution %s completed with status %s (duration: %sms)",
        execution_log_id,
        execution_log.status,
        execution_log.duration_ms,
    )

    return {"status": execution_log.status, "results": results}


def _execute_single_action(
    action: Any,
    payload: dict[str, Any],
    execution_log: Any,
) -> dict[str, Any]:
    """
    Execute a single outbound HTTP action with retry logic.

    Implements exponential backoff: 2^attempt seconds between retries.
    After max retries, marks the execution as dead letter.
    """
    from apps.engine.renderer import render_template
    from apps.observability.models import ExecutionLog

    max_retries = settings.WEBHOOK_MAX_RETRIES
    timeout = settings.WEBHOOK_REQUEST_TIMEOUT
    attempt = 0

    # Render body template with payload variables
    context = {"payload": payload}
    rendered_body = render_template(action.body_template, context)
    rendered_headers = render_template(action.headers, context)

    # Ensure Content-Type is set
    if isinstance(rendered_headers, dict) and "Content-Type" not in rendered_headers:
        rendered_headers["Content-Type"] = "application/json"

    while attempt <= max_retries:
        attempt += 1
        execution_log.attempt_number = attempt

        try:
            logger.info(
                "Action '%s': %s %s (attempt %d/%d)",
                action.name,
                action.http_method,
                action.url,
                attempt,
                max_retries + 1,
            )

            with httpx.Client(timeout=timeout) as client:
                response = client.request(
                    method=action.http_method,
                    url=action.url,
                    headers=rendered_headers if isinstance(rendered_headers, dict) else {},
                    json=rendered_body if action.http_method in ("POST", "PUT", "PATCH") else None,
                )

            # Store response info
            execution_log.response_status_code = response.status_code
            try:
                execution_log.response_body = response.json()
            except Exception:
                execution_log.response_body = {"raw": response.text[:5000]}

            # Check for success (2xx)
            if 200 <= response.status_code < 300:
                execution_log.status = ExecutionLog.Status.SUCCESS
                execution_log.save(
                    update_fields=["attempt_number", "response_status_code", "response_body", "status"]
                )
                logger.info("Action '%s' succeeded with status %d", action.name, response.status_code)
                return {"success": True, "action": action.name, "status_code": response.status_code}

            # Server error (5xx) — eligible for retry
            if response.status_code >= 500:
                error_msg = f"Server error {response.status_code}: {response.text[:500]}"
                logger.warning("Action '%s' got %d — will retry", action.name, response.status_code)

                if attempt <= max_retries:
                    execution_log.status = ExecutionLog.Status.RETRYING
                    execution_log.error_message = error_msg
                    execution_log.save(
                        update_fields=[
                            "attempt_number", "response_status_code",
                            "response_body", "status", "error_message",
                        ]
                    )
                    # Exponential backoff: 2, 4, 8 seconds...
                    backoff_time = min(2**attempt, settings.WEBHOOK_RETRY_BACKOFF_MAX)
                    logger.info("Backing off for %d seconds before retry", backoff_time)
                    time.sleep(backoff_time)
                    continue
                else:
                    # Exhausted retries — move to DLQ
                    return _move_to_dead_letter(execution_log, action, error_msg)

            # Client error (4xx) — don't retry
            error_msg = f"Client error {response.status_code}: {response.text[:500]}"
            execution_log.status = ExecutionLog.Status.FAILED
            execution_log.error_message = error_msg
            execution_log.save(
                update_fields=["attempt_number", "response_status_code", "response_body", "status", "error_message"]
            )
            logger.error("Action '%s' failed with client error %d — not retrying", action.name, response.status_code)
            return {"success": False, "action": action.name, "status_code": response.status_code, "error": error_msg}

        except httpx.TimeoutException as e:
            error_msg = f"Timeout after {timeout}s: {e!s}"
            logger.warning("Action '%s' timed out (attempt %d/%d)", action.name, attempt, max_retries + 1)

            if attempt <= max_retries:
                execution_log.status = ExecutionLog.Status.RETRYING
                execution_log.error_message = error_msg
                execution_log.save(update_fields=["attempt_number", "status", "error_message"])
                backoff_time = min(2**attempt, settings.WEBHOOK_RETRY_BACKOFF_MAX)
                time.sleep(backoff_time)
                continue
            else:
                return _move_to_dead_letter(execution_log, action, error_msg)

        except httpx.RequestError as e:
            error_msg = f"Request error: {e!s}"
            logger.warning("Action '%s' request error (attempt %d/%d): %s", action.name, attempt, max_retries + 1, e)

            if attempt <= max_retries:
                execution_log.status = ExecutionLog.Status.RETRYING
                execution_log.error_message = error_msg
                execution_log.save(update_fields=["attempt_number", "status", "error_message"])
                backoff_time = min(2**attempt, settings.WEBHOOK_RETRY_BACKOFF_MAX)
                time.sleep(backoff_time)
                continue
            else:
                return _move_to_dead_letter(execution_log, action, error_msg)

    # Should not reach here, but safety net
    return _move_to_dead_letter(execution_log, action, "Max retries exhausted")


def _move_to_dead_letter(execution_log: Any, action: Any, error_msg: str) -> dict[str, Any]:
    """Move a failed execution to the Dead Letter Queue."""
    from apps.observability.models import ExecutionLog

    execution_log.status = ExecutionLog.Status.DEAD_LETTER
    execution_log.error_message = error_msg
    execution_log.save(update_fields=["status", "error_message", "attempt_number"])

    logger.error(
        "Action '%s' moved to DLQ after %d attempts: %s",
        action.name,
        execution_log.attempt_number,
        error_msg,
    )

    return {
        "success": False,
        "action": action.name,
        "dead_letter": True,
        "error": error_msg,
        "attempts": execution_log.attempt_number,
    }
