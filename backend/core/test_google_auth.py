from unittest.mock import patch

from django.core.cache import cache
from django.test import override_settings
from rest_framework.test import APITestCase

from .models import AllowedEmail, Person

PUBLIC_HOST = "drinkcounter.bytboyzserver.xyz"
ENV_ADMIN = "boss@example.com"
VERIFY_TOKEN = "core.google_auth.id_token.verify_oauth2_token"


@override_settings(PUBLIC_HOST=PUBLIC_HOST, GOOGLE_CLIENT_ID="test-client", BOOTSTRAP_ADMIN_EMAILS=ENV_ADMIN)
class GoogleAuthTestCase(APITestCase):
    def setUp(self):
        # The sign-in throttle would otherwise count requests across tests.
        cache.clear()

    def public(self, method, path, data=None):
        return getattr(self.client, method)(path, data, format="json", HTTP_HOST=PUBLIC_HOST)

    def sign_in(self, email, verified=True):
        claims = {"email": email, "email_verified": verified}
        with patch(VERIFY_TOKEN, return_value=claims):
            return self.public("post", "/api/auth/google", {"credential": "token"})


class PublicDomainGateTests(GoogleAuthTestCase):
    def test_lan_address_needs_no_sign_in(self):
        self.assertEqual(self.client.get("/api/items/").status_code, 200)

    def test_public_domain_requires_sign_in(self):
        response = self.public("get", "/api/items/")

        self.assertEqual(response.status_code, 401)
        self.assertEqual(response.json(), {"google_auth_required": True})

    def test_allowed_email_can_sign_in_and_use_the_api(self):
        AllowedEmail.objects.create(email="friend@example.com")

        login = self.sign_in("Friend@Example.com")

        self.assertEqual(login.status_code, 200)
        self.assertEqual(login.data["email"], "friend@example.com")
        self.assertEqual(self.public("get", "/api/items/").status_code, 200)

    def test_unlisted_email_is_rejected(self):
        login = self.sign_in("stranger@example.com")

        self.assertEqual(login.status_code, 403)
        self.assertEqual(self.public("get", "/api/items/").status_code, 401)

    def test_unverified_email_is_rejected(self):
        AllowedEmail.objects.create(email="friend@example.com")

        self.assertEqual(self.sign_in("friend@example.com", verified=False).status_code, 401)

    def test_invalid_token_is_rejected(self):
        with patch(VERIFY_TOKEN, side_effect=ValueError("bad token")):
            response = self.public("post", "/api/auth/google", {"credential": "forged"})

        self.assertEqual(response.status_code, 401)

    def test_removed_email_loses_access_immediately(self):
        allowed = AllowedEmail.objects.create(email="friend@example.com")
        self.sign_in("friend@example.com")
        allowed.delete()

        response = self.public("get", "/api/items/")

        self.assertEqual(response.status_code, 403)
        self.assertTrue(response.json()["google_access_denied"])

    def test_sign_out_ends_access(self):
        AllowedEmail.objects.create(email="friend@example.com")
        self.sign_in("friend@example.com")

        self.public("post", "/api/auth/google-logout")

        self.assertEqual(self.public("get", "/api/items/").status_code, 401)

    def test_pay_by_square_links_stay_open(self):
        guest = Person.objects.create(name="Guest", is_guest=True)

        response = self.public("get", f"/api/persons/{guest.id}/pay-by-square/")

        # 400 "No debt to pay" comes from the view, so the gate let the request through.
        self.assertEqual(response.status_code, 400)

    def test_auth_status_reports_where_login_is_required(self):
        self.assertTrue(self.public("get", "/api/auth/me").data["login_required"])
        self.assertFalse(self.client.get("/api/auth/me").data["login_required"])


class AllowedEmailApiTests(GoogleAuthTestCase):
    def setUp(self):
        super().setUp()
        self.sign_in(ENV_ADMIN)

    def test_list_includes_admins_from_env(self):
        AllowedEmail.objects.create(email="friend@example.com")

        response = self.public("get", "/api/allowed-emails/")

        rows = [(row["email"], row["from_env"]) for row in response.data]
        self.assertEqual(rows, [(ENV_ADMIN, True), ("friend@example.com", False)])

    def test_admin_adds_email_in_lower_case(self):
        response = self.public("post", "/api/allowed-emails/", {"email": "New@Example.com", "is_admin": False})

        self.assertEqual(response.status_code, 201)
        self.assertTrue(AllowedEmail.objects.filter(email="new@example.com").exists())

    def test_duplicate_email_is_rejected(self):
        AllowedEmail.objects.create(email="friend@example.com")

        response = self.public("post", "/api/allowed-emails/", {"email": "FRIEND@example.com"})

        self.assertEqual(response.status_code, 400)

    def test_admin_promotes_and_removes_email(self):
        AllowedEmail.objects.create(email="friend@example.com")

        promote = self.public("patch", "/api/allowed-emails/friend@example.com/", {"is_admin": True})
        remove = self.public("delete", "/api/allowed-emails/friend@example.com/")

        self.assertTrue(promote.data["is_admin"])
        self.assertEqual(remove.status_code, 204)
        self.assertFalse(AllowedEmail.objects.exists())

    def test_admin_cannot_remove_themselves(self):
        AllowedEmail.objects.create(email=ENV_ADMIN, is_admin=True)

        response = self.public("delete", f"/api/allowed-emails/{ENV_ADMIN}/")

        self.assertEqual(response.status_code, 400)

    def test_regular_member_cannot_manage_emails(self):
        AllowedEmail.objects.create(email="friend@example.com")
        self.public("post", "/api/auth/google-logout")
        self.sign_in("friend@example.com")

        self.assertEqual(self.public("get", "/api/allowed-emails/").status_code, 403)
