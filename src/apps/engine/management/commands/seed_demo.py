"""
PayloadOps — Seed Demo Data Management Command

Creates demo data for showcasing the application:
- 1 demo user with workspace
- 2 workflows with triggers and actions
- Sample execution logs (success, failure, retry, dead_letter)

Usage:
    python manage.py seed_demo
"""

from __future__ import annotations

from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = "Seed the database with demo data for PayloadOps"

    def handle(self, *args, **options) -> None:
        from apps.accounts.models import User
        from apps.observability.models import ExecutionLog
        from apps.workflows.models import Action, Trigger, Workflow
        from apps.workspaces.models import Workspace, WorkspaceMembership

        self.stdout.write(self.style.WARNING("🌱 Seeding PayloadOps demo data..."))

        # ---- User ----
        user, created = User.objects.get_or_create(
            email="demo@payloadops.dev",
            defaults={
                "username": "demo",
                "full_name": "Demo User",
                "is_verified": True,
            },
        )
        if created:
            user.set_password("demo1234")
            user.save()
            self.stdout.write(self.style.SUCCESS("  ✅ Created demo user (demo@payloadops.dev / demo1234)"))
        else:
            self.stdout.write("  ℹ️  Demo user already exists")

        # ---- Workspace ----
        workspace, created = Workspace.objects.get_or_create(
            slug="demo-workspace",
            defaults={
                "name": "Demo Workspace",
                "description": "A demo workspace to showcase PayloadOps capabilities",
            },
        )
        if created:
            WorkspaceMembership.objects.create(
                user=user,
                workspace=workspace,
                role=WorkspaceMembership.Role.OWNER,
            )
            self.stdout.write(self.style.SUCCESS("  ✅ Created demo workspace"))

        # ---- Workflow 1: Slack Notification ----
        wf1, created = Workflow.objects.get_or_create(
            workspace=workspace,
            name="Lead → Slack Notification",
            defaults={
                "description": "Sends a Slack message when a new lead is submitted via form",
                "status": Workflow.Status.ACTIVE,
            },
        )
        if created:
            Trigger.objects.create(workspace=workspace, workflow=wf1)
            Action.objects.create(
                workspace=workspace,
                workflow=wf1,
                name="Send to Slack",
                order=0,
                http_method="POST",
                url="https://hooks.slack.com/services/EXAMPLE/WEBHOOK",
                headers={"Content-Type": "application/json"},
                body_template={
                    "text": "🚀 New lead: {{payload.name}} ({{payload.email}})",
                    "channel": "#leads",
                },
            )
            self.stdout.write(self.style.SUCCESS("  ✅ Created workflow: Lead → Slack Notification"))

        # ---- Workflow 2: CRM Sync ----
        wf2, created = Workflow.objects.get_or_create(
            workspace=workspace,
            name="Form → CRM Sync",
            defaults={
                "description": "Syncs form submissions to CRM API with contact creation",
                "status": Workflow.Status.ACTIVE,
            },
        )
        if created:
            Trigger.objects.create(workspace=workspace, workflow=wf2)
            Action.objects.create(
                workspace=workspace,
                workflow=wf2,
                name="Create CRM Contact",
                order=0,
                http_method="POST",
                url="https://api.example-crm.com/v1/contacts",
                headers={
                    "Content-Type": "application/json",
                    "Authorization": "Bearer {{payload.api_token}}",
                },
                body_template={
                    "first_name": "{{payload.first_name}}",
                    "last_name": "{{payload.last_name}}",
                    "email": "{{payload.email}}",
                    "source": "payloadops-webhook",
                },
            )
            Action.objects.create(
                workspace=workspace,
                workflow=wf2,
                name="Notify Team",
                order=1,
                http_method="POST",
                url="https://hooks.slack.com/services/EXAMPLE/TEAM",
                headers={"Content-Type": "application/json"},
                body_template={
                    "text": "📋 New CRM contact synced: {{payload.first_name}} {{payload.last_name}}",
                },
            )
            self.stdout.write(self.style.SUCCESS("  ✅ Created workflow: Form → CRM Sync"))

        # ---- Sample Execution Logs ----
        if not ExecutionLog.objects.filter(workspace=workspace).exists():
            sample_logs = [
                {
                    "workflow": wf1,
                    "status": ExecutionLog.Status.SUCCESS,
                    "payload_received": {"name": "John Doe", "email": "john@example.com"},
                    "response_status_code": 200,
                    "response_body": {"ok": True},
                    "attempt_number": 1,
                    "duration_ms": 245,
                },
                {
                    "workflow": wf1,
                    "status": ExecutionLog.Status.SUCCESS,
                    "payload_received": {"name": "Jane Smith", "email": "jane@example.com"},
                    "response_status_code": 200,
                    "response_body": {"ok": True},
                    "attempt_number": 1,
                    "duration_ms": 189,
                },
                {
                    "workflow": wf2,
                    "status": ExecutionLog.Status.FAILED,
                    "payload_received": {"first_name": "Error", "last_name": "Test", "email": "err@test.com"},
                    "response_status_code": 422,
                    "response_body": {"error": "Invalid email format"},
                    "attempt_number": 1,
                    "duration_ms": 102,
                    "error_message": "Client error 422: Invalid email format",
                },
                {
                    "workflow": wf2,
                    "status": ExecutionLog.Status.RETRYING,
                    "payload_received": {"first_name": "Retry", "last_name": "Demo", "email": "retry@test.com"},
                    "response_status_code": 503,
                    "response_body": {"error": "Service temporarily unavailable"},
                    "attempt_number": 2,
                    "duration_ms": 4320,
                    "error_message": "Server error 503: Service temporarily unavailable",
                },
                {
                    "workflow": wf1,
                    "status": ExecutionLog.Status.DEAD_LETTER,
                    "payload_received": {"name": "DLQ Test", "email": "dlq@test.com"},
                    "response_status_code": 500,
                    "response_body": {"error": "Internal server error"},
                    "attempt_number": 4,
                    "duration_ms": 12450,
                    "error_message": "Max retries exhausted — moved to DLQ",
                },
            ]

            for log_data in sample_logs:
                ExecutionLog.objects.create(
                    workspace=workspace,
                    trigger=Trigger.objects.filter(workflow=log_data["workflow"]).first(),
                    **log_data,
                )

            self.stdout.write(self.style.SUCCESS("  ✅ Created 5 sample execution logs"))

        self.stdout.write(self.style.SUCCESS("\n🎉 Demo data seeded successfully!"))
        self.stdout.write(self.style.WARNING("\n📝 Demo credentials:"))
        self.stdout.write("   Email: demo@payloadops.dev")
        self.stdout.write("   Password: demo1234")
