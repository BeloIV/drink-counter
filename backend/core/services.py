"""Business rules for orders, stock, brewing and settling debts."""
from decimal import ROUND_HALF_EVEN, ROUND_HALF_UP, Decimal
from typing import NamedTuple

from django.db import transaction as db_transaction
from django.db.models import F, Sum
from django.db.models.functions import Greatest
from django.utils import timezone

from .models import (
    CATEGORY_BEER, CATEGORY_COFFEE,
    BrewBatch, BrewBatchIngredient, CoffeePreset, Item, Person, Session, Transaction,
)

DECIMAL_STEP = Decimal("0.001")
ZERO = Decimal("0")
GRAMS_PER_COFFEE_CUP = Decimal("15")
BREWS_PER_STOCK_CHECK = 10


class InsufficientStockError(Exception):
    def __init__(self, item, requested):
        super().__init__(f"Not enough stock for {item.name}")
        self.item = item
        self.requested = requested


class Settlement(NamedTuple):
    transactions: list
    total_value: Decimal
    share: Decimal


def quantize(value, rounding=ROUND_HALF_UP):
    return value.quantize(DECIMAL_STEP, rounding=rounding)


def category_key(item):
    category = item.category
    return category.name.lower() if category and category.name else None


# ── Sessions ──────────────────────────────────────────────────────────────

def active_session(create=True):
    session = Session.objects.filter(ended_at__isnull=True).order_by("-id").first()
    if not session and create:
        session = Session.objects.create()
    return session


def start_new_session():
    previous = active_session()
    previous.ended_at = timezone.now()
    previous.save()
    return previous, Session.objects.create()


def session_debt(person):
    debt = (
        Transaction.objects.filter(session=active_session(), person=person)
        .aggregate(total=Sum("price_at_time"))["total"]
    )
    return debt or 0


def clear_session_debt(person):
    Transaction.objects.filter(session=active_session(), person=person).delete()


# ── Pricing ───────────────────────────────────────────────────────────────

def calculate_price(item, quantity):
    # Prices round half-even (Decimal's default) so historic totals stay identical.
    price = quantize(item.price * quantity, rounding=ROUND_HALF_EVEN)
    if item.pricing_mode == "per_gram" and category_key(item) == CATEGORY_COFFEE:
        preset = _coffee_preset_for(quantity)
        if preset:
            price = quantize(price + preset.extra_eur, rounding=ROUND_HALF_EVEN)
    return price


def _coffee_preset_for(grams):
    return (
        CoffeePreset.objects
        .filter(g_min__lte=grams, g_max__gte=grams)
        .order_by("g_min", "id")
        .first()
    )


# ── Consumption counters ──────────────────────────────────────────────────

def coffee_cups(grams):
    return max(1, int(grams // GRAMS_PER_COFFEE_CUP))


def _consumption_counter(item, quantity):
    """Return the Person counter field and amount an order affects, if any."""
    category = category_key(item)
    if category == CATEGORY_COFFEE:
        return "total_coffees", coffee_cups(quantity)
    if category == CATEGORY_BEER:
        return "total_beers", int(quantity)
    return None


def increment_person_counters(person_id, item, quantity):
    counter = _consumption_counter(item, quantity)
    if counter:
        field, amount = counter
        Person.objects.filter(pk=person_id).update(**{field: F(field) + amount})


def decrement_person_counters(person_id, item, quantity):
    counter = _consumption_counter(item, quantity)
    if counter:
        field, amount = counter
        Person.objects.filter(pk=person_id).update(**{field: Greatest(F(field) - amount, 0)})


# ── Stock ─────────────────────────────────────────────────────────────────

def deduct_stock(item, amount):
    """Atomically lower tracked stock (never below zero) and hide the item once empty."""
    if item.stock_quantity is None:
        return
    Item.objects.filter(pk=item.pk).update(
        stock_quantity=Greatest(F("stock_quantity") - amount, ZERO)
    )
    item.refresh_from_db(fields=["stock_quantity"])
    if item.stock_quantity <= ZERO:
        Item.objects.filter(pk=item.pk).update(active=False)


def restore_stock(transaction):
    item = transaction.item
    # Read the current value; the in-memory one may be stale.
    item.refresh_from_db(fields=["stock_quantity", "active"])
    if item.stock_quantity is None:
        return
    new_stock = item.stock_quantity + transaction.quantity
    changes = {"stock_quantity": new_stock}
    # An inactive item with stock was most likely auto-hidden when it ran out.
    if not item.active and new_stock > ZERO:
        changes["active"] = True
    Item.objects.filter(pk=item.pk).update(**changes)


def register_coffee_brew(item):
    """Count a per-gram coffee brew; return True when a stock check is due."""
    if item.pricing_mode != "per_gram" or category_key(item) != CATEGORY_COFFEE:
        return False
    Item.objects.filter(pk=item.pk).update(brew_count=F("brew_count") + 1)
    item.refresh_from_db(fields=["brew_count"])
    return item.brew_count % BREWS_PER_STOCK_CHECK == 0


# ── Transactions ──────────────────────────────────────────────────────────

def create_transaction(person, item, quantity):
    """Record an order and apply its side effects; return (transaction, stock_check_due)."""
    session = active_session()
    price = calculate_price(item, quantity)
    with db_transaction.atomic():
        created = Transaction.objects.create(
            session=session, person=person, item=item,
            quantity=quantity, price_at_time=price,
        )
        increment_person_counters(person.pk, item, quantity)
        deduct_stock(item, quantity)
        stock_check_due = register_coffee_brew(item)
    return created, stock_check_due


def delete_transaction(transaction):
    """Delete a transaction and reverse its counter and stock side effects."""
    with db_transaction.atomic():
        decrement_person_counters(transaction.person_id, transaction.item, transaction.quantity)
        restore_stock(transaction)
        transaction.delete()


def last_session_transaction(person_id):
    return (
        Transaction.objects.select_related("item__category")
        .filter(session=active_session(), person_id=person_id)
        .order_by("-id")
        .first()
    )


# ── Settling leftover stock ───────────────────────────────────────────────

def split_evenly(total, parts):
    """Split into equal rounded shares; the last share absorbs the rounding remainder."""
    share = quantize(total / parts)
    last_share = quantize(total - share * (parts - 1))
    return [share] * (parts - 1) + [last_share]


def settle_item_stock(item, people):
    """Charge the value of an item's remaining stock to people in equal shares."""
    remaining = item.stock_quantity
    total_value = quantize(remaining * item.price)
    value_shares = split_evenly(total_value, len(people))
    quantity_shares = split_evenly(remaining, len(people))
    session = active_session()

    with db_transaction.atomic():
        transactions = [
            Transaction.objects.create(
                session=session, person=person, item=item,
                quantity=quantity, price_at_time=value,
            )
            for person, quantity, value in zip(people, quantity_shares, value_shares, strict=True)
        ]
        Item.objects.filter(pk=item.pk).update(stock_quantity=ZERO, active=False)

    return Settlement(transactions, total_value, value_shares[0])


# ── Cold brew ─────────────────────────────────────────────────────────────

def create_brew_batch(ingredients, output_item, output_ml, note=""):
    """Turn coffee stock into cold brew stock and record the batch."""
    _ensure_enough_coffee(ingredients)
    with db_transaction.atomic():
        for ingredient in ingredients:
            deduct_stock(ingredient["coffee"], ingredient["grams"])
        _add_brewed_stock(output_item, output_ml)
        batch = BrewBatch.objects.create(output_item=output_item, output_ml=output_ml, note=note)
        BrewBatchIngredient.objects.bulk_create(
            BrewBatchIngredient(batch=batch, coffee=ingredient["coffee"], grams=ingredient["grams"], sort_order=index)
            for index, ingredient in enumerate(ingredients)
        )
    batch.refresh_from_db()
    return batch


def _ensure_enough_coffee(ingredients):
    for ingredient in ingredients:
        coffee, grams = ingredient["coffee"], ingredient["grams"]
        if coffee.stock_quantity is not None and coffee.stock_quantity < grams:
            raise InsufficientStockError(coffee, grams)


def _add_brewed_stock(item, millilitres):
    if item.stock_quantity is None:
        new_stock = millilitres
    else:
        new_stock = F("stock_quantity") + millilitres
    Item.objects.filter(pk=item.pk).update(stock_quantity=new_stock, active=True)
