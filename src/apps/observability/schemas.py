"""
SEAM — Observability API Schemas
"""

from __future__ import annotations

import uuid
from datetime import datetime

from ninja import Schema
from pydantic import Field


class ExecutionLogOutput(Schema):
    """Output for an execution log entry."""

    id: uuid.UUID
    workflow_id: uuid.UUID
    workflow_name: str
    status: str
    payload_received: dict
    response_body: dict | None
    response_status_code: int | None
    attempt_number: int
    max_attempts: int
    duration_ms: int | None
    error_message: str
    started_at: datetime | None
    completed_at: datetime | None
    created_at: datetime

    @staticmethod
    def resolve_workflow_name(obj) -> str:
        return obj.workflow.name


class ExecutionLogFilterInput(Schema):
    """Filter parameters for execution log listing."""

    status: str | None = None
    workflow_id: str | None = None
    date_from: datetime | None = None
    date_to: datetime | None = None
    page: int = Field(default=1, ge=1)
    page_size: int = Field(default=20, ge=1, le=100)


class MetricsOutput(Schema):
    """Aggregated execution metrics."""

    total_executions: int
    successful: int
    failed: int
    pending: int
    retrying: int
    dead_letter: int
    success_rate: float
    avg_duration_ms: float | None


class ExportOutput(Schema):
    """Output for spreadsheet export."""

    detail: str
    download_url: str


class TimeSeriesDataPoint(Schema):
    """Daily metrics data point."""

    date: str
    executions: int
    failed: int


class TimeSeriesOutput(Schema):
    """List of time-series data points."""

    data: list[TimeSeriesDataPoint]
