"""
SEAM — Observability API Endpoints

Execution log listing, filtering, metrics, and spreadsheet export.
"""

from __future__ import annotations

import io
from datetime import UTC, datetime, timedelta
from typing import TYPE_CHECKING

from django.db.models import Avg, Count, Q
from django.db.models.functions import TruncDate
from django.http import HttpResponse
from ninja import Query, Router

from apps.accounts.auth import auth
from apps.accounts.schemas import MessageOutput
from apps.observability.models import ExecutionLog
from apps.observability.schemas import (
    ExecutionLogFilterInput,
    ExecutionLogOutput,
    MetricsOutput,
    TimeSeriesOutput,
)

if TYPE_CHECKING:
    from django.http import HttpRequest

router = Router()


# ==========================================
# Execution Logs
# ==========================================


@router.get("/", auth=auth, response=list[ExecutionLogOutput])
def list_execution_logs(request: HttpRequest, filters: ExecutionLogFilterInput = Query(...)):
    """List execution logs with filtering and pagination."""
    workspace = getattr(request, "workspace", None)
    if workspace is None:
        return []

    qs = ExecutionLog.objects.for_workspace(workspace).select_related("workflow")

    # Apply filters
    if filters.status:
        qs = qs.filter(status=filters.status)
    if filters.workflow_id:
        qs = qs.filter(workflow_id=filters.workflow_id)
    if filters.date_from:
        qs = qs.filter(created_at__gte=filters.date_from)
    if filters.date_to:
        qs = qs.filter(created_at__lte=filters.date_to)

    # Pagination
    offset = (filters.page - 1) * filters.page_size
    return qs[offset : offset + filters.page_size]


@router.get("/{log_id}", auth=auth, response={200: ExecutionLogOutput, 404: MessageOutput})
def get_execution_log(request: HttpRequest, log_id: str):
    """Get details of a specific execution log."""
    workspace = getattr(request, "workspace", None)
    log = ExecutionLog.objects.filter(id=log_id, workspace=workspace).select_related("workflow").first()
    if log is None:
        return 404, {"detail": "Execution log not found."}
    return 200, log


# ==========================================
# Metrics
# ==========================================


@router.get("/metrics/summary", auth=auth, response=MetricsOutput)
def get_metrics(request: HttpRequest):
    """Get aggregated execution metrics for the current workspace."""
    workspace = getattr(request, "workspace", None)
    if workspace is None:
        return MetricsOutput(
            total_executions=0,
            successful=0,
            failed=0,
            pending=0,
            retrying=0,
            dead_letter=0,
            success_rate=0.0,
            avg_duration_ms=None,
        )

    qs = ExecutionLog.objects.for_workspace(workspace)

    stats = qs.aggregate(
        total=Count("id"),
        successful=Count("id", filter=Q(status=ExecutionLog.Status.SUCCESS)),
        failed=Count("id", filter=Q(status=ExecutionLog.Status.FAILED)),
        pending=Count("id", filter=Q(status=ExecutionLog.Status.PENDING)),
        retrying=Count("id", filter=Q(status=ExecutionLog.Status.RETRYING)),
        dead_letter=Count("id", filter=Q(status=ExecutionLog.Status.DEAD_LETTER)),
        avg_duration=Avg("duration_ms", filter=Q(duration_ms__isnull=False)),
    )

    total = stats["total"] or 0
    successful = stats["successful"] or 0
    success_rate = (successful / total * 100) if total > 0 else 0.0

    return MetricsOutput(
        total_executions=total,
        successful=successful,
        failed=stats["failed"] or 0,
        pending=stats["pending"] or 0,
        retrying=stats["retrying"] or 0,
        dead_letter=stats["dead_letter"] or 0,
        success_rate=round(success_rate, 2),
        avg_duration_ms=round(stats["avg_duration"], 2) if stats["avg_duration"] else None,
    )


@router.get("/metrics/timeseries", auth=auth, response=TimeSeriesOutput)
def get_metrics_timeseries(request: HttpRequest, days: int = Query(6, ge=1, le=30)):
    """Get time-series execution metrics aggregated by date (default: last 7 days)."""
    workspace = getattr(request, "workspace", None)
    if workspace is None:
        return TimeSeriesOutput(data=[])

    # If days is 6, it means today + 6 days ago = 7 days total
    start_date = datetime.now(tz=UTC) - timedelta(days=days)

    qs = ExecutionLog.objects.for_workspace(workspace).filter(created_at__gte=start_date)

    daily_stats = (
        qs.annotate(date=TruncDate("created_at"))
        .values("date")
        .annotate(
            executions=Count("id"),
            failed=Count("id", filter=Q(status=ExecutionLog.Status.FAILED)),
        )
        .order_by("date")
    )

    data_dict = {}
    for stat in daily_stats:
        date_str = stat["date"].isoformat()
        data_dict[date_str] = {
            "date": date_str,
            "executions": stat["executions"],
            "failed": stat["failed"],
        }
    
    # Fill in all days to ensure the chart is continuous
    result = []
    for i in range(days, -1, -1):
        d = (datetime.now(tz=UTC) - timedelta(days=i)).date()
        d_str = d.isoformat()
        if d_str in data_dict:
            result.append(data_dict[d_str])
        else:
            result.append({"date": d_str, "executions": 0, "failed": 0})

    return TimeSeriesOutput(data=result)


# ==========================================
# Spreadsheet Export
# ==========================================


@router.get("/export/xlsx", auth=auth)
def export_logs_xlsx(request: HttpRequest):
    """Export execution logs as an Excel spreadsheet (.xlsx)."""
    import openpyxl

    workspace = getattr(request, "workspace", None)
    if workspace is None:
        return HttpResponse(status=403)

    logs = ExecutionLog.objects.for_workspace(workspace).select_related("workflow").order_by("-created_at")[:1000]

    # Create workbook
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "Execution Logs"

    # Header row
    headers = [
        "Execution ID",
        "Workflow",
        "Status",
        "Attempt",
        "Status Code",
        "Duration (ms)",
        "Error",
        "Created At",
    ]
    ws.append(headers)

    # Data rows
    for log in logs:
        ws.append(
            [
                str(log.id),
                log.workflow.name,
                log.status,
                f"{log.attempt_number}/{log.max_attempts}",
                log.response_status_code or "",
                log.duration_ms or "",
                log.error_message[:200] if log.error_message else "",
                log.created_at.strftime("%Y-%m-%d %H:%M:%S"),
            ]
        )

    # Style header
    from openpyxl.styles import Font

    for cell in ws[1]:
        cell.font = Font(bold=True)

    # Auto-adjust column widths
    for column in ws.columns:
        max_length = max(len(str(cell.value or "")) for cell in column)
        ws.column_dimensions[column[0].column_letter].width = min(max_length + 2, 50)

    # Create response
    buffer = io.BytesIO()
    wb.save(buffer)
    buffer.seek(0)

    response = HttpResponse(
        buffer.read(),
        content_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    )
    timestamp = datetime.now(tz=UTC).strftime("%Y%m%d_%H%M%S")
    response["Content-Disposition"] = f'attachment; filename="seam_logs_{timestamp}.xlsx"'
    return response
