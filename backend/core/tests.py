from decimal import Decimal

from django.core import signing
from django.core.cache import cache
from django.test import override_settings
from rest_framework.test import APIClient, APITestCase

from .models import (
    BrewBatch, Category, CoffeePreset, Item, Payment, Person, Session, StockCheck, Transaction,
)
from .payments import PAY_LINK_SALT


class ApiTestCase(APITestCase):
    """Shared fixtures: one item per pricing mode and a few people."""

    def setUp(self):
        # Throttle counters live in a shared cache and would carry over between tests.
        cache.clear()
        self.beer_category = Category.objects.create(name="Beer")
        self.coffee_category = Category.objects.create(name="Coffee")
        self.cold_brew_category = Category.objects.create(name="Cold Brew")

        self.beer = Item.objects.create(
            name="Pilsner", category=self.beer_category,
            price=Decimal("1.500"), pricing_mode="per_item", stock_quantity=Decimal("2"),
        )
        self.coffee = Item.objects.create(
            name="Ethiopia", category=self.coffee_category,
            price=Decimal("0.050"), pricing_mode="per_gram", stock_quantity=Decimal("100"),
        )
        self.cold_brew = Item.objects.create(
            name="Ethiopia", category=self.cold_brew_category,
            price=Decimal("0.004"), pricing_mode="per_ml",
        )

        self.alice = Person.objects.create(name="Alice")
        self.bob = Person.objects.create(name="Bob")
        self.guest = Person.objects.create(name="Guest", is_guest=True)

    def login_as_admin(self):
        session = self.client.session
        session["is_admin"] = True
        session.save()

    def order(self, person, item, quantity=None):
        payload = {"person_id": person.id, "item_id": item.id}
        if quantity is not None:
            payload["quantity"] = quantity
        return self.client.post("/api/transactions", payload, format="json")


class CreateTransactionTests(ApiTestCase):
    def test_per_item_order_charges_price_and_counts_beer(self):
        response = self.order(self.alice, self.beer)

        self.assertEqual(response.status_code, 201)
        self.assertEqual(Decimal(response.data["price_at_time"]), Decimal("1.500"))
        self.assertFalse(response.data["trigger_check"])
        self.alice.refresh_from_db()
        self.assertEqual(self.alice.total_beers, 1)

    def test_order_deducts_stock_and_deactivates_empty_item(self):
        self.order(self.alice, self.beer, quantity="2")

        self.beer.refresh_from_db()
        self.assertEqual(self.beer.stock_quantity, Decimal("0"))
        self.assertFalse(self.beer.active)

    def test_stock_never_goes_negative(self):
        self.order(self.alice, self.beer, quantity="5")

        self.beer.refresh_from_db()
        self.assertEqual(self.beer.stock_quantity, Decimal("0"))

    def test_per_gram_coffee_adds_matching_preset_surcharge(self):
        CoffeePreset.objects.create(g_min=Decimal("15"), g_max=Decimal("25"), extra_eur=Decimal("0.200"))

        response = self.order(self.alice, self.coffee, quantity="20")

        self.assertEqual(Decimal(response.data["price_at_time"]), Decimal("1.200"))
        self.alice.refresh_from_db()
        self.assertEqual(self.alice.total_coffees, 1)

    def test_coffee_cups_are_counted_per_fifteen_grams(self):
        self.order(self.alice, self.coffee, quantity="45")

        self.alice.refresh_from_db()
        self.assertEqual(self.alice.total_coffees, 3)

    def test_every_third_coffee_brew_triggers_stock_check(self):
        responses = [self.order(self.alice, self.coffee, quantity="1") for _ in range(6)]

        self.assertEqual([r.data["trigger_check"] for r in responses], [False, False, True] * 2)

    def test_per_ml_order_has_no_surcharge_and_no_counters(self):
        CoffeePreset.objects.create(g_min=Decimal("0"), g_max=Decimal("1000"), extra_eur=Decimal("5"))

        response = self.order(self.alice, self.cold_brew, quantity="250")

        self.assertEqual(Decimal(response.data["price_at_time"]), Decimal("1.000"))
        self.alice.refresh_from_db()
        self.assertEqual((self.alice.total_beers, self.alice.total_coffees), (0, 0))

    def test_untracked_stock_stays_untracked(self):
        self.order(self.alice, self.cold_brew, quantity="250")

        self.cold_brew.refresh_from_db()
        self.assertIsNone(self.cold_brew.stock_quantity)
        self.assertTrue(self.cold_brew.active)


class RemoveTransactionTests(ApiTestCase):
    def test_undo_reverts_counters_and_restores_stock(self):
        self.order(self.alice, self.beer, quantity="2")

        response = self.client.post("/api/transactions/undo", {"person_id": self.alice.id}, format="json")

        self.assertEqual(response.status_code, 200)
        self.assertIn("undone", response.data)
        self.beer.refresh_from_db()
        self.alice.refresh_from_db()
        self.assertEqual(self.beer.stock_quantity, Decimal("2"))
        self.assertTrue(self.beer.active)
        self.assertEqual(self.alice.total_beers, 0)
        self.assertEqual(Transaction.objects.count(), 0)

    def test_undo_without_person_is_rejected(self):
        response = self.client.post("/api/transactions/undo", {}, format="json")

        self.assertEqual(response.status_code, 400)

    def test_undo_with_malformed_person_is_rejected(self):
        response = self.client.post("/api/transactions/undo", {"person_id": "abc"}, format="json")

        self.assertEqual(response.status_code, 400)

    def test_undo_with_nothing_to_undo_returns_404(self):
        response = self.client.post("/api/transactions/undo", {"person_id": self.bob.id}, format="json")

        self.assertEqual(response.status_code, 404)

    def test_delete_requires_admin(self):
        transaction_id = self.order(self.alice, self.coffee, quantity="30").data["id"]

        response = self.client.delete(f"/api/transactions/{transaction_id}")

        self.assertEqual(response.status_code, 403)

    def test_admin_delete_reverts_coffee_counter_and_stock(self):
        transaction_id = self.order(self.alice, self.coffee, quantity="30").data["id"]
        self.login_as_admin()

        response = self.client.delete(f"/api/transactions/{transaction_id}")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["deleted"]["id"], transaction_id)
        self.coffee.refresh_from_db()
        self.alice.refresh_from_db()
        self.assertEqual(self.coffee.stock_quantity, Decimal("100"))
        self.assertEqual(self.alice.total_coffees, 0)

    def test_delete_missing_transaction_returns_404(self):
        self.login_as_admin()

        response = self.client.delete("/api/transactions/9999")

        self.assertEqual(response.status_code, 404)
        self.assertEqual(response.data, {"error": "Transaction not found"})


class EditTransactionTests(ApiTestCase):
    def test_patch_requires_admin(self):
        transaction_id = self.order(self.alice, self.beer).data["id"]

        response = self.client.patch(f"/api/transactions/{transaction_id}", {"quantity": "3"}, format="json")

        self.assertEqual(response.status_code, 403)

    def test_patch_rounds_values_to_three_decimals(self):
        transaction_id = self.order(self.alice, self.beer).data["id"]
        self.login_as_admin()

        response = self.client.patch(
            f"/api/transactions/{transaction_id}",
            {"quantity": "2.0005", "price_at_time": "-1.2345"},
            format="json",
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(Decimal(response.data["quantity"]), Decimal("2.001"))
        self.assertEqual(Decimal(response.data["price_at_time"]), Decimal("-1.235"))


class TransactionListTests(ApiTestCase):
    def test_list_paginates_and_filters_by_person(self):
        self.order(self.alice, self.beer)
        self.order(self.bob, self.beer)

        response = self.client.get(f"/api/transactions/list?limit=5&offset=0&person_id={self.bob.id}")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["count"], 1)
        self.assertEqual(response.data["results"][0]["person"]["id"], self.bob.id)

    def test_list_rejects_non_integer_limit(self):
        response = self.client.get("/api/transactions/list?limit=abc")

        self.assertEqual(response.status_code, 400)


class SettleItemTests(ApiTestCase):
    def setUp(self):
        super().setUp()
        self.carol = Person.objects.create(name="Carol")
        Person.objects.create(name="Inactive", active=False)
        self.beer.stock_quantity = Decimal("10")
        self.beer.price = Decimal("1")
        self.beer.save()
        self.login_as_admin()

    def test_settle_splits_remaining_value_among_active_home_members(self):
        response = self.client.post(f"/api/items/{self.beer.id}/settle")

        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data["count"], 3)
        shares = [Decimal(t["price_at_time"]) for t in response.data["settled"]]
        quantities = [Decimal(t["quantity"]) for t in response.data["settled"]]
        self.assertEqual(shares, [Decimal("3.333"), Decimal("3.333"), Decimal("3.334")])
        self.assertEqual(quantities, [Decimal("3.333"), Decimal("3.333"), Decimal("3.334")])
        self.beer.refresh_from_db()
        self.assertEqual(self.beer.stock_quantity, Decimal("0"))
        self.assertFalse(self.beer.active)

    def test_settle_without_stock_is_rejected(self):
        response = self.client.post(f"/api/items/{self.cold_brew.id}/settle")

        self.assertEqual(response.status_code, 400)


class ItemUsageTests(ApiTestCase):
    def test_item_list_reports_usage(self):
        self.order(self.alice, self.beer)
        self.order(self.bob, self.beer)

        items = {item["id"]: item for item in self.client.get("/api/items/").data}

        self.assertEqual(items[self.beer.id]["use_count"], 2)
        self.assertIsNotNone(items[self.beer.id]["last_used_at"])
        self.assertEqual(items[self.coffee.id]["use_count"], 0)
        self.assertIsNone(items[self.coffee.id]["last_used_at"])


class RestockCountTests(ApiTestCase):
    def setUp(self):
        super().setUp()
        self.login_as_admin()

    def activate(self, item, payload):
        Item.objects.filter(pk=item.pk).update(active=False)
        return self.client.patch(f"/api/items/{item.id}/", {"active": True, **payload}, format="json")

    def test_activating_with_stock_counts_a_restock(self):
        response = self.activate(self.coffee, {"stock_quantity": "250"})

        self.assertEqual(response.data["restock_count"], 1)

    def test_activating_without_stock_is_not_a_restock(self):
        self.activate(self.coffee, {})

        self.coffee.refresh_from_db()
        self.assertEqual(self.coffee.restock_count, 0)

    def test_editing_stock_of_an_active_item_is_not_a_restock(self):
        self.client.patch(f"/api/items/{self.coffee.id}/", {"stock_quantity": "80"}, format="json")

        self.coffee.refresh_from_db()
        self.assertEqual(self.coffee.restock_count, 0)

    def test_brewing_cold_brew_counts_a_restock_of_the_output(self):
        payload = {
            "ingredients": [{"coffee_id": self.coffee.id, "grams": "50"}],
            "output_item_id": self.cold_brew.id,
            "output_ml": "1000",
        }
        self.client.post("/api/brew-batches", payload, format="json")

        self.cold_brew.refresh_from_db()
        self.assertEqual(self.cold_brew.restock_count, 1)


class KeepHistoryTests(ApiTestCase):
    def setUp(self):
        super().setUp()
        self.login_as_admin()

    def test_item_with_orders_cannot_be_deleted(self):
        self.order(self.alice, self.beer)

        response = self.client.delete(f"/api/items/{self.beer.id}/")

        self.assertEqual(response.status_code, 409)
        self.assertIn("error", response.data)
        self.assertEqual(Transaction.objects.count(), 1)

    def test_person_with_orders_cannot_be_deleted(self):
        self.order(self.alice, self.beer)

        response = self.client.delete(f"/api/persons/{self.alice.id}/")

        self.assertEqual(response.status_code, 409)
        self.assertTrue(Person.objects.filter(pk=self.alice.pk).exists())

    def test_category_with_items_cannot_be_deleted(self):
        response = self.client.delete(f"/api/categories/{self.beer_category.id}/")

        self.assertEqual(response.status_code, 409)

    def test_unused_item_and_person_can_still_be_deleted(self):
        self.assertEqual(self.client.delete(f"/api/items/{self.beer.id}/").status_code, 204)
        self.assertEqual(self.client.delete(f"/api/persons/{self.guest.id}/").status_code, 204)


class StockTests(ApiTestCase):
    def test_set_stock_rejects_negative_quantity(self):
        self.login_as_admin()

        response = self.client.post(f"/api/items/{self.beer.id}/set-stock", {"stock_quantity": "-1"}, format="json")

        self.assertEqual(response.status_code, 400)

    def test_set_stock_updates_quantity(self):
        self.login_as_admin()

        response = self.client.post(f"/api/items/{self.beer.id}/set-stock", {"stock_quantity": "12.5"}, format="json")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(Decimal(response.data["stock_quantity"]), Decimal("12.500"))


class BrewBatchTests(ApiTestCase):
    def setUp(self):
        super().setUp()
        self.login_as_admin()

    def brew(self, grams):
        payload = {
            "ingredients": [{"coffee_id": self.coffee.id, "grams": grams}],
            "output_item_id": self.cold_brew.id,
            "output_ml": "1000",
        }
        return self.client.post("/api/brew-batches", payload, format="json")

    def test_brew_moves_stock_from_coffee_to_cold_brew(self):
        response = self.brew("80")

        self.assertEqual(response.status_code, 201)
        self.coffee.refresh_from_db()
        self.cold_brew.refresh_from_db()
        self.assertEqual(self.coffee.stock_quantity, Decimal("20"))
        self.assertEqual(self.cold_brew.stock_quantity, Decimal("1000"))
        self.assertTrue(self.cold_brew.active)
        self.assertEqual(BrewBatch.objects.get().ingredients.count(), 1)

    def test_brew_adds_to_existing_output_stock(self):
        self.brew("10")
        self.brew("10")

        self.cold_brew.refresh_from_db()
        self.assertEqual(self.cold_brew.stock_quantity, Decimal("2000"))

    def test_brew_with_insufficient_coffee_is_rejected(self):
        response = self.brew("400")

        self.assertEqual(response.status_code, 400)
        self.assertIn("error", response.data)
        self.assertEqual(BrewBatch.objects.count(), 0)

    def test_brew_history_requires_admin(self):
        self.client.logout()

        response = self.client.get("/api/brew-batches")

        self.assertEqual(response.status_code, 403)


class StockCheckTests(ApiTestCase):
    def weigh(self, measured, tare="14", item=None):
        payload = {"item_id": (item or self.coffee).id, "measured_grams": measured, "tare_grams": tare}
        return self.client.post("/api/stock-checks", payload, format="json")

    def test_kiosk_records_weighing_against_system_stock(self):
        self.order(self.alice, self.coffee, quantity="20")

        response = self.weigh("100")

        self.assertEqual(response.status_code, 201)
        self.assertEqual(Decimal(response.data["expected_grams"]), Decimal("80"))
        self.assertEqual(Decimal(response.data["net_grams"]), Decimal("86"))
        self.assertEqual(Decimal(response.data["difference_grams"]), Decimal("6"))
        self.assertEqual(StockCheck.objects.count(), 1)

    def test_item_without_tracked_stock_is_rejected(self):
        response = self.weigh("100", item=self.cold_brew)

        self.assertEqual(response.status_code, 400)

    def test_history_requires_admin_and_filters_by_item(self):
        self.weigh("100")
        self.assertEqual(self.client.get("/api/stock-checks").status_code, 403)

        self.login_as_admin()
        response = self.client.get(f"/api/stock-checks?item_id={self.coffee.id}")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["item_name"], "Ethiopia")


class SessionAndDebtTests(ApiTestCase):
    def test_active_session_without_session_is_empty(self):
        response = self.client.get("/api/session/active")

        self.assertEqual(response.data, {"session": None, "per_person": [], "total": 0})

    def test_active_session_sums_debt_per_person(self):
        self.order(self.alice, self.beer)
        self.order(self.alice, self.beer)

        response = self.client.get("/api/session/active")

        row = response.data["per_person"][0]
        self.assertEqual(row["person_id"], self.alice.id)
        self.assertEqual(row["count_items"], 2)
        self.assertEqual(response.data["total"], Decimal("3.000"))

    def test_session_reset_starts_new_session(self):
        self.order(self.alice, self.beer)
        self.login_as_admin()

        response = self.client.post("/api/session/reset")

        self.assertIsNotNone(response.data["previous"]["ended_at"])
        self.assertEqual(Session.objects.filter(ended_at__isnull=True).count(), 1)

    def reset_debt(self, person):
        self.login_as_admin()
        return self.client.post(f"/api/persons/{person.id}/reset-debt")

    def test_reset_debt_keeps_transactions_and_records_payment(self):
        self.order(self.alice, self.beer)
        self.order(self.bob, self.beer)

        response = self.reset_debt(self.alice)

        self.assertEqual(response.data, {"ok": True})
        self.assertEqual(Transaction.objects.count(), 2)
        payment = Payment.objects.get()
        self.assertEqual((payment.person, payment.amount), (self.alice, Decimal("1.500")))
        self.assertEqual(Transaction.objects.get(person=self.alice).payment, payment)
        self.assertIsNone(Transaction.objects.get(person=self.bob).payment)

    def test_reset_debt_zeroes_debt_but_not_stats(self):
        self.order(self.alice, self.beer)
        self.reset_debt(self.alice)

        session = self.client.get("/api/session/active").data
        stats = self.client.get("/api/stats").data

        self.assertEqual(session["per_person"], [])
        self.assertEqual(session["total"], 0)
        self.assertEqual(stats["grand_count"], 1)
        self.assertEqual(Decimal(stats["grand_total"]), Decimal("1.500"))

    def test_orders_after_reset_form_a_new_debt(self):
        self.order(self.alice, self.beer)
        self.reset_debt(self.alice)
        self.order(self.alice, self.beer)

        row = self.client.get("/api/session/active").data["per_person"][0]

        self.assertEqual((row["count_items"], row["total_eur"]), (1, Decimal("1.500")))

    def test_reset_without_debt_records_no_payment(self):
        self.reset_debt(self.alice)

        self.assertEqual(Payment.objects.count(), 0)

    def test_undo_skips_paid_transactions(self):
        self.order(self.alice, self.beer)
        self.reset_debt(self.alice)

        response = self.client.post("/api/transactions/undo", {"person_id": self.alice.id}, format="json")

        self.assertEqual(response.status_code, 404)
        self.assertEqual(Transaction.objects.count(), 1)

    def pay_by_square_url(self, person):
        return self.client.get(f"/api/persons/{person.id}/").data["pay_by_square_url"]

    @override_settings(PAYMENT_IBAN="SK0000000000000000000000")
    def test_pay_by_square_renders_payment_page(self):
        self.order(self.alice, self.beer)

        response = self.client.get(self.pay_by_square_url(self.alice))

        self.assertEqual(response.status_code, 200)
        self.assertContains(response, "SK0000000000000000000000")
        self.assertContains(response, "1.50 EUR")

    @override_settings(PAYMENT_IBAN="SK0000000000000000000000")
    def test_pay_by_square_without_debt_is_rejected(self):
        response = self.client.get(self.pay_by_square_url(self.bob))

        self.assertEqual(response.status_code, 400)

    def test_pay_by_square_link_cannot_be_forged(self):
        self.order(self.alice, self.beer)
        forged_token = signing.dumps(self.alice.id, key="attacker-key", salt=PAY_LINK_SALT)

        self.assertEqual(self.client.get(f"/api/pay/{forged_token}/").status_code, 404)
        self.assertEqual(self.client.get(f"/api/pay/{self.alice.id}/").status_code, 404)
        self.assertEqual(self.client.get(f"/api/persons/{self.alice.id}/pay-by-square/").status_code, 404)

    @override_settings(PAYMENT_IBAN="")
    def test_pay_by_square_without_iban_is_unavailable(self):
        self.order(self.alice, self.beer)

        self.assertEqual(self.client.get(self.pay_by_square_url(self.alice)).status_code, 503)


class StatsTests(ApiTestCase):
    def test_stats_report_totals(self):
        self.order(self.alice, self.beer)

        response = self.client.get("/api/stats")

        self.assertEqual(response.data["grand_count"], 1)
        self.assertEqual(response.data["grand_total"], "1.500")
        self.assertEqual(response.data["top_items"][0]["item__name"], "Pilsner")


@override_settings(ADMIN_PIN="4321")
class AdminAuthTests(APITestCase):
    def setUp(self):
        cache.clear()

    def wrong_pin(self, client_ip):
        return self.client.post(
            "/api/auth/admin-login", {"pin": "0000"}, format="json", HTTP_X_FORWARDED_FOR=client_ip,
        )

    def test_correct_pin_grants_admin_session(self):
        login = self.client.post("/api/auth/admin-login", {"pin": "4321"}, format="json")
        check = self.client.get("/api/auth/admin-check")

        self.assertEqual(login.data, {"ok": True})
        self.assertEqual(check.status_code, 200)

    def test_wrong_pin_is_rejected(self):
        response = self.client.post("/api/auth/admin-login", {"pin": "0000"}, format="json")

        self.assertEqual(response.status_code, 401)
        self.assertEqual(self.client.get("/api/auth/admin-check").status_code, 403)

    def test_logout_drops_admin_session(self):
        self.client.post("/api/auth/admin-login", {"pin": "4321"}, format="json")
        self.client.post("/api/auth/admin-logout")

        self.assertEqual(self.client.get("/api/auth/admin-check").status_code, 403)

    def test_pin_guessing_is_throttled_per_client(self):
        for _ in range(10):
            self.wrong_pin("203.0.113.7")

        self.assertEqual(self.wrong_pin("203.0.113.7").status_code, 429)
        self.assertEqual(self.wrong_pin("203.0.113.8").status_code, 401)

    def test_forged_forwarded_for_entries_do_not_reset_the_throttle(self):
        for attempt in range(10):
            self.wrong_pin(f"10.0.0.{attempt}, 203.0.113.7")

        self.assertEqual(self.wrong_pin("10.0.0.99, 203.0.113.7").status_code, 429)


class CsrfTests(ApiTestCase):
    """Admin rights are a session flag, not a Django user, so DRF's own check would skip them."""

    def setUp(self):
        super().setUp()
        self.client = APIClient(enforce_csrf_checks=True)
        self.login_as_admin()

    def test_write_without_token_is_rejected(self):
        response = self.client.post("/api/categories/", {"name": "Wine"}, format="json")

        self.assertEqual(response.status_code, 403)
        self.assertFalse(Category.objects.filter(name="Wine").exists())

    def test_kiosk_order_without_token_is_rejected(self):
        self.assertEqual(self.order(self.alice, self.beer).status_code, 403)

    def test_write_with_token_succeeds(self):
        token = self.client.get("/api/auth/csrf").json()["csrftoken"]

        response = self.client.post("/api/categories/", {"name": "Wine"}, format="json", HTTP_X_CSRFTOKEN=token)

        self.assertEqual(response.status_code, 201)

    def test_reads_need_no_token(self):
        self.assertEqual(self.client.get("/api/items/").status_code, 200)


class HardeningTests(ApiTestCase):
    def test_api_answers_json_only(self):
        response = self.client.get("/api/items/", HTTP_ACCEPT="text/html")

        self.assertEqual(response.status_code, 406)

    def test_django_admin_is_switched_off(self):
        self.assertEqual(self.client.get("/django-admin/login/").status_code, 404)

    def test_cookies_are_secure_over_https_only(self):
        https = self.client.get("/api/auth/csrf", HTTP_X_FORWARDED_PROTO="https")
        plain = self.client.get("/api/auth/csrf")

        self.assertTrue(https.cookies["csrftoken"]["secure"])
        self.assertFalse(plain.cookies["csrftoken"]["secure"])
