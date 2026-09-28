import re

from django.conf import settings
from django.http import JsonResponse

from . import google_auth

# Reachable without signing in: the login flow itself, and Pay by Square links shared with guests.
OPEN_PATHS = re.compile(r"^/api/(auth/(csrf|me|google|google-logout)|pay/[^/]+/)")


class GoogleAuthMiddleware:
    """
    On the public domain only signed-in Google accounts from the allowlist get
    through; the LAN address the kiosk uses stays open. Runs after
    SessionMiddleware, which holds the signed-in email.
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        if not google_auth.is_public_host(request) or OPEN_PATHS.match(request.path):
            return self.get_response(request)

        email = google_auth.session_email(request)
        if not email:
            return JsonResponse({"google_auth_required": True}, status=401)
        # Checked on every request so removing an email revokes access immediately.
        if not google_auth.is_allowed(email):
            return JsonResponse({"google_access_denied": True, "email": email}, status=403)
        return self.get_response(request)


class SecureCookiesOverHttpsMiddleware:
    """
    Mark the session and CSRF cookies Secure on HTTPS requests only. The kiosk uses
    plain HTTP on the LAN, where a Secure cookie would never be stored, while the
    public domain is always HTTPS and must not leak its session over HTTP.
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)
        if request.is_secure():
            for name in (settings.SESSION_COOKIE_NAME, settings.CSRF_COOKIE_NAME):
                if name in response.cookies:
                    response.cookies[name]["secure"] = True
        return response
