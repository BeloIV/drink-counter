"""Give old group orders a shared group id.

Before the group endpoint, the kiosk booked a group as one request per person, all
sent at once. Such rows share the session, item, quantity and price and were created
within a moment of each other, which a single person tapping through the kiosk cannot do.
Old settlements of leftover stock look the same and are paired as well.
"""
import uuid
from datetime import timedelta
from decimal import Decimal

from django.core.management.base import BaseCommand
from django.db import transaction as db_transaction

from core.models import Transaction

# Parallel requests land within a second; a person's next order takes several taps.
SAME_BOOKING_WINDOW = timedelta(seconds=2)


# Settling leftover stock splits evenly, but the last share absorbs a rounding remainder.
ROUNDING_TOLERANCE = Decimal("0.001")


def _same_booking(previous, current):
    return (
        previous.session_id == current.session_id
        and previous.item_id == current.item_id
        and abs(previous.quantity - current.quantity) <= ROUNDING_TOLERANCE
        and abs(previous.price_at_time - current.price_at_time) <= ROUNDING_TOLERANCE
        and abs(current.created_at - previous.created_at) <= SAME_BOOKING_WINDOW
    )


def find_old_groups():
    """Return lists of ungrouped transactions that were most likely booked as one group order."""
    # Zero quantities and negative prices are manual corrections, never orders.
    candidates = (
        Transaction.objects.filter(group_id__isnull=True, quantity__gt=0, price_at_time__gt=0)
        .select_related("person", "item")
        .order_by("session_id", "item_id", "quantity", "price_at_time", "created_at")
    )
    groups, current = [], []
    for transaction in candidates.iterator():
        if current and _same_booking(current[-1], transaction):
            current.append(transaction)
            continue
        groups.append(current)
        current = [transaction]
    groups.append(current)
    # A group order books at least two different people.
    return [group for group in groups if len({transaction.person_id for transaction in group}) > 1]


class Command(BaseCommand):
    help = "Pair old group orders under a shared group id. Lists them only, unless --apply is given."

    def add_arguments(self, parser):
        parser.add_argument("--apply", action="store_true", help="Write the group ids.")

    def handle(self, *args, apply, **options):
        groups = sorted(find_old_groups(), key=lambda group: group[0].created_at)
        for group in groups:
            first = group[0]
            people = ", ".join(transaction.person.name for transaction in group)
            self.stdout.write(
                f"{first.created_at:%Y-%m-%d %H:%M:%S}  {first.item.name}  {first.quantity} × {len(group)}  {people}"
            )

        paired = sum(len(group) for group in groups)
        if not apply:
            self.stdout.write(f"\n{len(groups)} groups ({paired} transactions) found; nothing written, use --apply.")
            return

        with db_transaction.atomic():
            for group in groups:
                Transaction.objects.filter(pk__in=[transaction.pk for transaction in group]).update(
                    group_id=uuid.uuid4(),
                )
        self.stdout.write(self.style.SUCCESS(f"\nPaired {len(groups)} groups ({paired} transactions)."))
