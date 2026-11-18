"""Stock import from the Epera group-order app: the household's coffee from the last order placed.

Epera answers on the private Docker network epera-bridge (its backend/coffee/internal.py);
the household is every e-mail Drink Counter knows. Each line is one coffee and roast with
its grams and what the household paid, so the price per gram carries over. A line
is one person's bags of one coffee and roast; the admin picks which lines to book, and the
rest can be booked later.
"""
from decimal import Decimal

import requests
from django.conf import settings
from django.db import IntegrityError
from django.db import transaction as db_transaction
from django.db.models import F

from . import google_auth
from .models import CATEGORY_COFFEE, AllowedEmail, Category, EperaImport, Item, Person
from .services import ZERO, quantize

TIMEOUT_SECONDS = 10
DEFAULT_COLOR = "#ffffff"
NAME_PREFIX = "káva "


class EperaError(Exception):
    """Epera can't be asked, or its answer doesn't fit; the message is shown to the admin."""


class AlreadyImported(EperaError):
    pass


def is_configured():
    return bool(settings.EPERA_API_TOKEN)


def household_emails():
    emails = {email.strip().lower() for email in Person.objects.exclude(email__isnull=True)
              .exclude(email="").values_list("email", flat=True)}
    emails |= {email.lower() for email in AllowedEmail.objects.values_list("email", flat=True)}
    return sorted(emails | google_auth.env_admin_emails())


def fetch_household_order():
    """{"round": {...} | None, "lines": [...]} straight from Epera."""
    if not is_configured():
        raise EperaError("Prepojenie s Eperou nie je nastavené (EPERA_API_TOKEN).")
    emails = household_emails()
    if not emails:
        raise EperaError("Drink Counter nepozná žiadny e-mail, podľa ktorého by hľadal objednávku.")
    try:
        response = requests.post(
            f"{settings.EPERA_API_URL}/internal/household-order",
            json={"emails": emails},
            headers={"Authorization": f"Bearer {settings.EPERA_API_TOKEN}"},
            timeout=TIMEOUT_SECONDS,
        )
    except requests.RequestException as error:
        raise EperaError("Epera neodpovedá.") from error
    if response.status_code == 401:
        raise EperaError("Epera odmietla token.")
    if not response.ok:
        raise EperaError(f"Epera vrátila chybu {response.status_code}.")
    try:
        return response.json()
    except ValueError as error:
        raise EperaError("Epera poslala nečitateľnú odpoveď.") from error


# ── Lines ─────────────────────────────────────────────────────────────────

def base_name(line):
    """'Káva KEŇA' → 'KEŇA'."""
    name = line["name"].strip()
    if name.lower().startswith(NAME_PREFIX):
        name = name[len(NAME_PREFIX):].strip()
    return name


def display_name(line):
    """'Káva KEŇA' + 'Filter (svetlé)' → 'KEŇA – Filter' when the coffee comes in several roasts."""
    name = base_name(line)
    if line.get("roast") and line.get("roast_count", 0) > 1:
        name = f"{name} – {line['roast'].split(' (')[0]}"
    return name[:100]


def price_per_gram(line):
    return quantize(Decimal(line["cents"]) / 100 / Decimal(line["grams"]))


def coffee_items():
    return Item.objects.filter(category__name__iexact=CATEGORY_COFFEE, pricing_mode="per_gram")


def suggested_item(line, items):
    """The item this coffee went to last time, else one with the same name, with or without the roast."""
    by_key = next((item for item in items if item.epera_key == line["key"]), None)
    if by_key:
        return by_key
    unclaimed = [item for item in items if item.epera_key is None]
    for name in (display_name(line).lower(), base_name(line).lower()):
        match = next((item for item in unclaimed if item.name.strip().lower() == name), None)
        if match:
            return match
    return None


def preview():
    order = fetch_household_order()
    round_ = order.get("round")
    if round_ is None:
        return {"round": None, "lines": []}
    items = list(coffee_items())
    booked = set(EperaImport.objects.filter(round_id=round_["id"]).values_list("line_key", flat=True))
    lines = []
    for line in order["lines"]:
        if line["grams"] <= 0:
            continue
        match = suggested_item(line, items)
        lines.append({
            "line_key": line["line_key"], "key": line["key"], "member": line["member"]["name"],
            "name": display_name(line), "shop_name": line["name"], "roast": line["roast"],
            "color": line["color"] or DEFAULT_COLOR, "grams": line["grams"],
            "price": str(price_per_gram(line)), "item_id": match.pk if match else None,
            "imported": line["line_key"] in booked,
        })
    return {"round": round_, "lines": lines}


# ── Booking ───────────────────────────────────────────────────────────────

def _weighted_price(item, grams, price):
    """Leftover stock and the new bags priced together, so the price per gram stays fair."""
    stock = item.stock_quantity if item.stock_quantity and item.stock_quantity > ZERO else ZERO
    if stock == ZERO:
        return price
    return quantize((stock * item.price + grams * price) / (stock + grams))


def _claim_key(item, key):
    Item.objects.filter(epera_key=key).exclude(pk=item.pk).update(epera_key=None)
    item.epera_key = key


def _new_item(line, category, price, grams):
    item = Item.objects.create(
        name=display_name(line), category=category, price=price, pricing_mode="per_gram",
        color=line["color"] or DEFAULT_COLOR, stock_quantity=grams, active=True, restock_count=1,
    )
    _claim_key(item, line["key"])
    item.save(update_fields=["epera_key"])
    return item


def _add_to_item(item_id, line, grams, price):
    item = coffee_items().select_for_update().filter(pk=item_id).first()
    if item is None:
        raise EperaError("Vybraná položka už neexistuje alebo nie je káva na gramy.")
    item.price = _weighted_price(item, grams, price)
    item.stock_quantity = (item.stock_quantity or ZERO) + grams
    item.active = True
    _claim_key(item, line["key"])
    item.save(update_fields=["price", "stock_quantity", "active", "epera_key"])
    Item.objects.filter(pk=item.pk).update(restock_count=F("restock_count") + 1)
    return item


def import_order(round_id, choices):
    """Book the chosen lines. `choices` maps a line key to an item id, or None for a new item;
    lines left out stay unbooked."""
    if not choices:
        raise EperaError("Nie je vybraná žiadna káva.")
    order = fetch_household_order()
    if not order.get("round") or order["round"]["id"] != round_id:
        raise EperaError("Posledná objednávka sa medzitým zmenila, načítaj ju znova.")
    lines = {line["line_key"]: line for line in order["lines"] if line["grams"] > 0}
    unknown = set(choices) - set(lines)
    if unknown:
        raise EperaError("Objednávka sa medzitým zmenila, načítaj ju znova.")
    if EperaImport.objects.filter(round_id=round_id, line_key__in=choices).exists():
        raise AlreadyImported("Niečo z vybraného už je na sklade, načítaj objednávku znova.")
    category = Category.objects.filter(name__iexact=CATEGORY_COFFEE).first()
    if category is None:
        raise EperaError("Chýba kategória Coffee.")

    booked = []
    created = {}  # coffee key → item made in this import, so two people's bags of a new coffee share it
    try:
        with db_transaction.atomic():
            for line_key, item_id in choices.items():
                line = lines[line_key]
                grams, price = Decimal(line["grams"]), price_per_gram(line)
                if item_id is None and line["key"] in created:
                    item_id = created[line["key"]].pk
                if item_id is None:
                    item = _new_item(line, category, price, grams)
                    created[line["key"]] = item
                else:
                    item = _add_to_item(item_id, line, grams, price)
                EperaImport.objects.create(round_id=round_id, line_key=line_key, item=item, grams=grams, price=price)
                booked.append({"item_id": item.pk, "name": item.name, "grams": line["grams"], "price": str(price)})
    except IntegrityError as error:
        raise AlreadyImported("Niečo z vybraného už je na sklade, načítaj objednávku znova.") from error
    return booked
