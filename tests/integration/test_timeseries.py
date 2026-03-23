"""
SEAM — Integration Tests: Timeseries
"""

from datetime import UTC, datetime, timedelta

import pytest
from django.test import Client

from apps.observability.models import ExecutionLog
from apps.workflows.models import Workflow


@pytest.mark.django_db
@pytest.mark.integration
class TestTimeseriesEndpoint:
    def test_timeseries_returns_data(self, user, workspace, client: Client):
        workflow = Workflow.objects.create(
            workspace=workspace,
            name="Test Workflow",
            status=Workflow.Status.ACTIVE,
        )

        # Create an execution log for today
        ExecutionLog.objects.create(
            workspace=workspace, workflow=workflow, status=ExecutionLog.Status.SUCCESS, created_at=datetime.now(tz=UTC)
        )

        # Create an execution log for yesterday
        yesterday_log = ExecutionLog.objects.create(
            workspace=workspace,
            workflow=workflow,
            status=ExecutionLog.Status.FAILED,
        )
        ExecutionLog.objects.filter(id=yesterday_log.id).update(created_at=datetime.now(tz=UTC) - timedelta(days=1))

        from apps.accounts.auth import create_access_token

        access_token, _ = create_access_token(user)

        response = client.get(
            "/api/logs/metrics/timeseries",
            headers={"Authorization": f"Bearer {access_token}", "X-Workspace-ID": str(workspace.id)},
        )

        assert response.status_code == 200
        data = response.json()
        assert "data" in data
        assert len(data["data"]) == 7  # default 7 days
