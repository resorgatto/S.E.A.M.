"""
SEAM — URL Configuration
"""

from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.http import JsonResponse
from django.urls import path

from config.api import api


def health_check(request):
    """Simple health check endpoint for Docker/load balancer."""
    return JsonResponse({"status": "healthy", "service": "seam"})


urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/", api.urls),
    path("api/health/", health_check, name="health-check"),
]

# Serve media files in development
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
