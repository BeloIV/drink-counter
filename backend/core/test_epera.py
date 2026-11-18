from decimal import Decimal
from unittest import mock

import requests
from django.test import override_settings

from .models import AllowedEmail, EperaImport, Item, Person
from .tests import ApiTestCase

KENA_FILTER = {
    "key": "10:filter-svetle", "line_key": "10:filter-svetle:1", "coffee_id": 10, "name": "Káva KEŇA",
    "roast": "Filter (svetlé)", "roast_count": 2, "color": "#479c47", "member": {"id": 1, "name": "Štefan"},
    "grams": 1000, "cents": 2890,
}
PERU = {
    "key": "17:", "line_key": "17::1", "coffee_id": 17, "name": "Káva PERU", "roast": "", "roast_count": 0,
    "color": "", "member": {"id": 1, "name": "Štefan"}, "grams": 500, "cents": 1590,
}
# A flatmate's bag of the same coffee.
KENA_FILTER_DAVID = {**KENA_FILTER, "line_key": "10:filter-svetle:2", "member": {"id": 2, "name": "Dávid"},
                     "grams": 500, "cents": 1445}


def epera_answer(lines, round_id=7, status=200):
    response = mock.Mock(status_code=status, ok=status < 400)
    response.json.return_value = {
        "round": {"id": round_id, "status": "ordered", "ordered_at": "2026-11-10T10:00:00Z", "done_at": None},
        "lines": lines,
    }
    return response


@override_settings(EPERA_API_TOKEN="secret", EPERA_API_URL="http://epera-backend:8000", BOOTSTRAP_ADMIN_EMAILS="")
class EperaImportTests(ApiTestCase):
    def setUp(self):
        super().setUp()
        self.login_as_admin()
        AllowedEmail.objects.create(email="me@example.com")
        Person.objects.filter(pk=self.alice.pk).update(email="Alice@Example.com")
        patcher = mock.patch("core.epera.requests.post", return_value=epera_answer([KENA_FILTER, PERU, KENA_FILTER_DAVID]))
        self.post = patcher.start()
        self.addCleanup(patcher.stop)

    def preview(self):
        return self.client.get("/api/epera/last-order")

    def book(self, choices, round_id=7):
        return self.client.post("/api/epera/import", {"round_id": round_id, "choices": choices}, format="json")

    def test_needs_the_admin_pin(self):
        self.client.session.flush()
        self.client.logout()
        self.assertEqual(self.preview().status_code, 403)

    def test_preview_asks_for_every_known_email_with_the_token(self):
        response = self.preview()

        self.assertEqual(response.status_code, 200)
        _, kwargs = self.post.call_args
        self.assertEqual(kwargs["json"], {"emails": ["alice@example.com", "me@example.com"]})
        self.assertEqual(kwargs["headers"], {"Authorization": "Bearer secret"})
        kena, peru, kena_david = response.data["lines"]
        self.assertEqual(kena["name"], "KEŇA – Filter")
        self.assertEqual((kena["member"], kena_david["member"]), ("Štefan", "Dávid"))
        self.assertEqual(kena["price"], "0.029")
        self.assertIsNone(kena["item_id"])
        self.assertEqual(peru["name"], "PERU")
        self.assertEqual(peru["color"], "#ffffff")
        self.assertFalse(any(line["imported"] for line in response.data["lines"]))

    def test_preview_suggests_an_item_with_the_same_name(self):
        peru = Item.objects.create(name="Peru", category=self.coffee_category, pricing_mode="per_gram")
        lines = self.preview().data["lines"]
        self.assertEqual(lines[1]["item_id"], peru.pk)

    def test_preview_suggests_an_item_named_without_the_roast(self):
        kena = Item.objects.create(name="KEŇA", category=self.coffee_category, pricing_mode="per_gram")
        self.assertEqual(self.preview().data["lines"][0]["item_id"], kena.pk)

    def test_import_creates_new_items_and_remembers_the_key(self):
        response = self.book({KENA_FILTER["line_key"]: None, PERU["line_key"]: None})

        self.assertEqual(response.status_code, 201)
        kena = Item.objects.get(epera_key=KENA_FILTER["key"])
        self.assertEqual(kena.name, "KEŇA – Filter")
        self.assertEqual(kena.stock_quantity, Decimal("1000"))
        self.assertEqual(kena.price, Decimal("0.029"))
        self.assertEqual(kena.color, "#479c47")
        self.assertEqual(kena.category, self.coffee_category)
        self.assertTrue(kena.active)
        # Next time the same coffee goes to the same item, and only the flatmate's bag is left.
        lines = self.preview().data["lines"]
        self.assertEqual([line["item_id"] for line in lines], [kena.pk, Item.objects.get(epera_key="17:").pk, kena.pk])
        self.assertEqual([line["imported"] for line in lines], [True, True, False])

    def test_two_peoples_bags_of_a_new_coffee_make_one_item(self):
        response = self.book({KENA_FILTER["line_key"]: None, KENA_FILTER_DAVID["line_key"]: None})

        self.assertEqual(response.status_code, 201)
        kena = Item.objects.get(epera_key=KENA_FILTER["key"])
        self.assertEqual(kena.stock_quantity, Decimal("1500"))
        self.assertEqual(Item.objects.filter(name="KEŇA – Filter").count(), 1)

    def test_import_into_an_existing_item_averages_the_price_per_gram(self):
        # 100 g left at 0.050 €/g, plus 1000 g at 0.0289 €/g.
        response = self.book({KENA_FILTER["line_key"]: self.coffee.pk})

        self.assertEqual(response.status_code, 201)
        self.coffee.refresh_from_db()
        self.assertEqual(self.coffee.stock_quantity, Decimal("1100"))
        self.assertEqual(self.coffee.price, Decimal("0.031"))
        self.assertEqual(self.coffee.epera_key, KENA_FILTER["key"])
        self.assertEqual(self.coffee.restock_count, 1)
        self.assertFalse(Item.objects.filter(epera_key="17:").exists())

    def test_unchecked_lines_can_be_booked_later_but_each_only_once(self):
        self.assertEqual(self.book({KENA_FILTER["line_key"]: None}).status_code, 201)
        self.assertEqual(self.book({KENA_FILTER["line_key"]: None}).status_code, 409)
        # Later the preview offers the item the first bag went to.
        kena_id = self.preview().data["lines"][2]["item_id"]
        self.assertEqual(self.book({KENA_FILTER_DAVID["line_key"]: kena_id}).status_code, 201)
        self.assertEqual(Item.objects.get(epera_key=KENA_FILTER["key"]).stock_quantity, Decimal("1500"))
        self.assertEqual(EperaImport.objects.count(), 2)

    def test_nothing_chosen(self):
        self.assertEqual(self.book({}).status_code, 502)

    def test_refuses_a_round_that_is_no_longer_the_last(self):
        self.assertEqual(self.book({PERU["line_key"]: None}, round_id=6).status_code, 502)
        self.assertFalse(EperaImport.objects.exists())

    def test_refuses_an_unknown_line(self):
        self.assertEqual(self.book({"99::1": None}).status_code, 502)

    def test_refuses_a_non_coffee_item(self):
        response = self.book({KENA_FILTER["line_key"]: self.beer.pk, PERU["line_key"]: None})
        self.assertEqual(response.status_code, 502)
        # Nothing is booked when one line fails.
        self.assertFalse(EperaImport.objects.exists())
        self.assertFalse(Item.objects.filter(epera_key="17:").exists())
        self.beer.refresh_from_db()
        self.assertEqual(self.beer.stock_quantity, Decimal("2"))

    def test_epera_down_is_a_readable_error(self):
        self.post.side_effect = requests.ConnectionError()
        response = self.preview()
        self.assertEqual(response.status_code, 502)
        self.assertEqual(response.data["error"], "Epera neodpovedá.")

    def test_no_delivered_order_yet(self):
        self.post.return_value.json.return_value = {"round": None, "lines": []}
        self.assertEqual(self.preview().data, {"round": None, "lines": []})

    @override_settings(EPERA_API_TOKEN="")
    def test_switched_off_without_a_token(self):
        response = self.preview()
        self.assertEqual(response.status_code, 502)
        self.post.assert_not_called()
