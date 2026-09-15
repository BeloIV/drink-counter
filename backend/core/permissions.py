from rest_framework.permissions import SAFE_METHODS, BasePermission

from . import google_auth


def is_admin_session(request):
    return request.session.get("is_admin") is True


class IsAdminSession(BasePermission):
    def has_permission(self, request, view):
        return is_admin_session(request)


class ReadOnlyOrAdmin(BasePermission):
    def has_permission(self, request, view):
        return request.method in SAFE_METHODS or is_admin_session(request)


class IsGoogleAdmin(BasePermission):
    """A signed-in Google account marked as admin, or listed in BOOTSTRAP_ADMIN_EMAILS."""

    def has_permission(self, request, view):
        return google_auth.is_admin(google_auth.session_email(request))
