import json
import re

from django.conf import settings
from django.http import HttpResponse


# Paths accessible without site password
_PUBLIC_PATHS = re.compile(r'^/api/persons/\d+/pay-by-square/')

PUBLIC_HOST = getattr(settings, "PUBLIC_HOST", None)
SITE_PASSWORD = getattr(settings, "SITE_PASSWORD", None)
COOKIE_NAME = "_site_auth"
COOKIE_MAX_AGE = 60 * 60 * 24 * 30  # 30 days


class SitePasswordMiddleware:
    """
    Require a password when the request comes from PUBLIC_HOST.
    Auth is stored in a persistent cookie (30 days).
    Returns JSON 401 {site_auth_required: true} so the React frontend
    can show a password modal instead of a server-rendered form.
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        if not SITE_PASSWORD:
            return self.get_response(request)

        forwarded = request.META.get('HTTP_X_FORWARDED_HOST', '').split(':')[0]
        host = (forwarded or request.get_host()).split(':')[0]
        if host != PUBLIC_HOST:
            return self.get_response(request)

        # Pay-by-square links are always accessible (shared with guests)
        if _PUBLIC_PATHS.match(request.path):
            return self.get_response(request)

        # Handle login POST from the React frontend
        if request.method == "POST" and request.path == "/__site-login__":
            return self._handle_login(request)

        # Check persistent cookie
        if request.COOKIES.get(COOKIE_NAME) == "1":
            return self.get_response(request)

        # Not authenticated — tell the frontend to show the password modal
        return HttpResponse(
            json.dumps({"site_auth_required": True}),
            content_type="application/json",
            status=401,
        )

    def _handle_login(self, request):
        try:
            body = json.loads(request.body)
            password = body.get("password", "")
        except Exception:
            password = request.POST.get("password", "")

        if password == SITE_PASSWORD:
            response = HttpResponse(
                json.dumps({"ok": True}),
                content_type="application/json",
            )
            response.set_cookie(COOKIE_NAME, "1", max_age=COOKIE_MAX_AGE, httponly=True, samesite="Lax")
            return response

        return HttpResponse(
            json.dumps({"ok": False, "detail": "Wrong password"}),
            content_type="application/json",
            status=401,
        )
