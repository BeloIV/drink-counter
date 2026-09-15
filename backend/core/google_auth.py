"""Google sign-in for the public domain: token verification and the email allowlist."""
from django.conf import settings
from google.auth.transport import requests as google_requests
from google.oauth2 import id_token

from .models import AllowedEmail

SESSION_KEY = "google_email"


class GoogleTokenError(Exception):
    pass


def verify_google_credential(credential):
    """Return the verified, lower-cased email from a Google Identity Services ID token."""
    try:
        claims = id_token.verify_oauth2_token(
            credential, google_requests.Request(), settings.GOOGLE_CLIENT_ID
        )
    except ValueError as error:
        raise GoogleTokenError(str(error)) from error
    if not claims.get("email_verified"):
        raise GoogleTokenError("Google has not verified this email")
    return claims["email"].strip().lower()


def env_admin_emails():
    """Admins from BOOTSTRAP_ADMIN_EMAILS; they can never be locked out from the admin page."""
    return {email.strip().lower() for email in settings.BOOTSTRAP_ADMIN_EMAILS.split(",") if email.strip()}


def is_allowed(email):
    if not email:
        return False
    return email in env_admin_emails() or AllowedEmail.objects.filter(email=email).exists()


def is_admin(email):
    if not email:
        return False
    return email in env_admin_emails() or AllowedEmail.objects.filter(email=email, is_admin=True).exists()


def session_email(request):
    return request.session.get(SESSION_KEY, "")


def is_public_host(request):
    """Google login guards only the public domain; the kiosk uses the LAN address."""
    return request.get_host().split(":")[0] == settings.PUBLIC_HOST
