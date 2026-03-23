"""
SEAM — Workspace Middleware

Injects the active workspace into every request based on the
X-Workspace-ID header or API key context, ensuring strict tenant isolation.
"""

from __future__ import annotations

import logging
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from django.http import HttpRequest, HttpResponse

logger = logging.getLogger(__name__)

# Paths that don't require workspace context
EXEMPT_PATHS = (
    "/admin/",
    "/api/health/",
    "/api/auth/register",
    "/api/auth/login",
    "/api/docs",
    "/api/redoc",
    "/api/openapi.json",
    "/hooks/",
)


class WorkspaceMiddleware:
    """
    Middleware that attempts to resolve the workspace from the request.

    For authenticated API requests, reads the X-Workspace-ID header
    and validates that the user has access to that workspace.
    This middleware is 'passive': it populates request.workspace if possible,
    but never blocks the request (letting views/routers handle absence).
    """

    def __init__(self, get_response) -> None:
        self.get_response = get_response

    def __call__(self, request: HttpRequest) -> HttpResponse:
        request.workspace = None  # type: ignore[attr-defined]

        # Skip if user is not authenticated yet (will be handled by Ninja later
        # OR is already set by another middleware if applicable)
        user = getattr(request, "user", None)
        if not user or not user.is_authenticated:
            # Note: Ninja's auth happens inside the view dispatch, usually after middleware.
            # But the 'AuthenticationMiddleware' might have ran.
            pass

        workspace_id = request.headers.get("X-Workspace-ID")
        if workspace_id:
            try:
                from apps.workspaces.models import Workspace

                # We can only perform validation if we have a user
                if user and user.is_authenticated:
                    workspace = Workspace.objects.filter(
                        id=workspace_id,
                        memberships__user=user,
                        is_active=True,
                    ).first()
                    if workspace:
                        request.workspace = workspace  # type: ignore[attr-defined]
            except (ValueError, TypeError, Exception) as e:
                # Silently fail in middleware to avoid breaking CORS/Options, but log it
                logger.debug("Workspace resolution failed: %s", e)

        return self.get_response(request)
