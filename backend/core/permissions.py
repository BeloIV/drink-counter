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


def can_manage_access(request):
    """Who may edit the allowlist: a Google admin anywhere, or the admin PIN on the LAN.

    Nobody signs in with Google on the LAN, so the kiosk's PIN unlocks it there. On the
    public domain the PIN is deliberately not enough, or any signed-in member who knew it
    could grant access to others.
    """
    if google_auth.is_admin(google_auth.session_email(request)):
        return True
    return not google_auth.is_public_host(request) and is_admin_session(request)


class CanManageAccess(BasePermission):
    def has_permission(self, request, view):
        return can_manage_access(request)
