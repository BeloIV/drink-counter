from rest_framework.authentication import SessionAuthentication


class CsrfSessionAuthentication(SessionAuthentication):
    """
    DRF checks CSRF only for logged-in Django users, but here nobody is one: admin
    rights and the Google sign-in live in plain session keys. Without this every
    write would skip the check, so it runs for all requests.
    """

    def authenticate(self, request):
        self.enforce_csrf(request)
        return super().authenticate(request)
