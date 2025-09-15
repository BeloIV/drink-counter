from rest_framework.permissions import BasePermission, SAFE_METHODS

class IsAdminSession(BasePermission):
    def has_permission(self, request, view):
        return bool(request.session.get("is_admin") is True)

class ReadOnlyOrAdmin(BasePermission):
    def has_permission(self, request, view):
        if request.method in SAFE_METHODS:
            return True
        return bool(request.session.get("is_admin") is True)