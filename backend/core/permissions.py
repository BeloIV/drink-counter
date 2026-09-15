from rest_framework.permissions import SAFE_METHODS, BasePermission


def is_admin_session(request):
    return request.session.get("is_admin") is True


class IsAdminSession(BasePermission):
    def has_permission(self, request, view):
        return is_admin_session(request)


class ReadOnlyOrAdmin(BasePermission):
    def has_permission(self, request, view):
        return request.method in SAFE_METHODS or is_admin_session(request)
