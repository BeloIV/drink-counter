from decimal import Decimal, InvalidOperation

from django.conf import settings
from django.db.models import Count, F, Sum
from django.http import HttpResponse, JsonResponse
from django.middleware.csrf import get_token
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import ensure_csrf_cookie
from rest_framework import mixins, status, viewsets
from rest_framework.exceptions import NotFound, ValidationError
from rest_framework.response import Response
from rest_framework.throttling import AnonRateThrottle
from rest_framework.views import APIView

from . import google_auth, services
from .models import AllowedEmail, BrewBatch, Category, CoffeePreset, Item, Person, Transaction
from .payments import render_payment_page
from .permissions import CanManageAccess, IsAdminSession, ReadOnlyOrAdmin, can_manage_access
from .serializers import (
    AdminLoginSerializer, AllowedEmailSerializer, BrewBatchCreateSerializer, BrewBatchSerializer,
    CategorySerializer, CoffeePresetSerializer, ItemSerializer, PersonSerializer,
    SessionSerializer, TransactionCreateSerializer, TransactionPatchSerializer,
    TransactionSerializer,
)

DEFAULT_PAGE_SIZE = 20
MAX_PAGE_SIZE = 500
BREW_HISTORY_LIMIT = 30
TOP_ITEMS_LIMIT = 10


class AdminLoginThrottle(AnonRateThrottle):
    scope = "admin_login"


class TransactionThrottle(AnonRateThrottle):
    scope = "transactions"


def get_or_not_found(queryset, pk, label):
    """Fetch one object or respond 404 with the `{"error": ...}` body the frontend expects."""
    try:
        return queryset.get(pk=pk)
    except queryset.model.DoesNotExist:
        raise NotFound({"error": f"{label} not found"}) from None


# ── Catalogue ─────────────────────────────────────────────────────────────

class PersonViewSet(viewsets.ModelViewSet):
    queryset = Person.objects.all().order_by("id")
    serializer_class = PersonSerializer
    permission_classes = [ReadOnlyOrAdmin]


class CategoryViewSet(viewsets.ModelViewSet):
    queryset = Category.objects.all().order_by("id")
    serializer_class = CategorySerializer
    permission_classes = [ReadOnlyOrAdmin]


class ItemViewSet(viewsets.ModelViewSet):
    queryset = Item.objects.all().order_by("id")
    serializer_class = ItemSerializer
    permission_classes = [ReadOnlyOrAdmin]

    def get_queryset(self):
        items = super().get_queryset()
        active = self.request.query_params.get("active")
        category = self.request.query_params.get("category")
        if active is not None:
            items = items.filter(active=active.lower() == "true")
        if category:
            items = items.filter(category__name__iexact=category)
        return items


class CoffeePresetViewSet(viewsets.ModelViewSet):
    queryset = CoffeePreset.objects.all().order_by("g_min", "id")
    serializer_class = CoffeePresetSerializer
    permission_classes = [ReadOnlyOrAdmin]


# ── Sessions and debts ────────────────────────────────────────────────────

class SessionActiveView(APIView):
    def get(self, request):
        session = services.active_session(create=False)
        if not session:
            return Response({"session": None, "per_person": [], "total": 0})

        transactions = Transaction.objects.filter(session=session)
        per_person = (
            transactions.values("person_id")
            .annotate(
                person_name=F("person__name"),
                total_eur=Sum("price_at_time"),
                count_items=Count("id"),
            )
            .order_by("person_id")
        )
        total = transactions.aggregate(total=Sum("price_at_time"))["total"] or 0
        return Response({
            "session": SessionSerializer(session).data,
            "per_person": list(per_person),
            "total": total,
        })


class SessionResetView(APIView):
    permission_classes = [IsAdminSession]

    def post(self, request):
        previous, current = services.start_new_session()
        return Response({
            "previous": SessionSerializer(previous).data,
            "active": SessionSerializer(current).data,
        })


class ResetPersonDebtView(APIView):
    permission_classes = [IsAdminSession]

    def post(self, request, pk):
        person = get_or_not_found(Person.objects.all(), pk, "Person")
        services.clear_session_debt(person)
        return Response({"ok": True}, status=status.HTTP_200_OK)


class PayBySquareView(APIView):
    def get(self, request, pk):
        person = get_or_not_found(Person.objects.all(), pk, "Person")
        debt = services.session_debt(person)
        if debt <= 0:
            return JsonResponse({"error": "No debt to pay"}, status=400)
        return HttpResponse(render_payment_page(person, debt, settings.PAYMENT_IBAN))


# ── Transactions ──────────────────────────────────────────────────────────

class TransactionView(APIView):
    throttle_classes = [TransactionThrottle]

    def post(self, request):
        serializer = TransactionCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        person = serializer.validated_data["person"]
        item = serializer.validated_data["item"]
        quantity = serializer.validated_data.get("quantity", Decimal("1.000"))

        created, stock_check_due = services.create_transaction(person, item, quantity)
        person.refresh_from_db(fields=["total_beers", "total_coffees"])

        data = TransactionSerializer(created).data
        data["trigger_check"] = stock_check_due
        return Response(data, status=status.HTTP_201_CREATED)


class TransactionListView(APIView):
    """List transactions newest first, paginated with limit/offset."""

    def get(self, request):
        try:
            limit, offset = _parse_pagination(request.query_params)
        except (TypeError, ValueError):
            return Response({"error": "limit and offset must be integers"}, status=400)

        transactions = (
            Transaction.objects.select_related("person", "item__category").order_by("-created_at")
        )
        person_ids = _parse_person_ids(request.query_params.get("person_id"))
        if person_ids:
            transactions = transactions.filter(person_id__in=person_ids)

        return Response({
            "results": TransactionSerializer(transactions[offset:offset + limit], many=True).data,
            "count": transactions.count(),
            "limit": limit,
            "offset": offset,
        })


def _parse_pagination(params):
    limit = int(params.get("limit", DEFAULT_PAGE_SIZE))
    offset = int(params.get("offset", 0))
    return max(1, min(limit, MAX_PAGE_SIZE)), max(0, offset)


def _parse_person_ids(raw):
    if not raw:
        return []
    return [part.strip() for part in raw.split(",") if part.strip().isdigit()]


class TransactionDetailView(APIView):
    permission_classes = [IsAdminSession]
    editable_fields = ("quantity", "price_at_time")

    def patch(self, request, pk):
        transaction = get_or_not_found(
            Transaction.objects.select_related("person", "item__category"), pk, "Transaction"
        )
        serializer = TransactionPatchSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        changed = [field for field in self.editable_fields if field in serializer.validated_data]
        for field in changed:
            setattr(transaction, field, services.quantize(serializer.validated_data[field]))
        if changed:
            transaction.save(update_fields=changed)
        return Response(TransactionSerializer(transaction).data)

    def delete(self, request, pk):
        transaction = get_or_not_found(
            Transaction.objects.select_related("item__category"), pk, "Transaction"
        )
        data = TransactionSerializer(transaction).data
        services.delete_transaction(transaction)
        return Response({"deleted": data})


class TransactionUndoView(APIView):
    def post(self, request):
        person_id = request.data.get("person_id")
        if not person_id:
            return Response({"detail": "person_id required"}, status=400)

        last = services.last_session_transaction(person_id)
        if not last:
            return Response({"detail": "nothing to undo"}, status=404)

        data = TransactionSerializer(last).data
        services.delete_transaction(last)
        return Response({"undone": data})


# ── Stats ─────────────────────────────────────────────────────────────────

class StatsView(APIView):
    def get(self, request):
        totals = Transaction.objects.aggregate(total=Sum("price_at_time"), count=Count("id"))
        return Response({
            "persons": _person_stats(),
            "top_items": _top_items(),
            "grand_total": str(totals["total"] or 0),
            "grand_count": totals["count"] or 0,
        })


def _person_stats():
    return list(
        Person.objects.annotate(
            total_spent=Sum("transactions__price_at_time"),
            tx_count=Count("transactions"),
        )
        .values("id", "name", "is_guest", "total_beers", "total_coffees", "total_spent", "tx_count")
        .order_by("-total_spent")
    )


def _top_items():
    return list(
        Transaction.objects.values("item__name", "item__category__name")
        .annotate(count=Count("id"), total_qty=Sum("quantity"), total_eur=Sum("price_at_time"))
        .order_by("-count")[:TOP_ITEMS_LIMIT]
    )


# ── Inventory ─────────────────────────────────────────────────────────────

class ItemSetStockView(APIView):
    permission_classes = [IsAdminSession]

    def post(self, request, pk):
        item = get_or_not_found(Item.objects.all(), pk, "Item")
        raw_quantity = request.data.get("stock_quantity")
        if raw_quantity is None:
            return Response({"error": "stock_quantity required"}, status=400)

        quantity = _parse_non_negative_decimal(raw_quantity)
        if quantity is None:
            return Response({"error": "stock_quantity must be a non-negative number"}, status=400)

        Item.objects.filter(pk=pk).update(stock_quantity=quantity)
        item.refresh_from_db()
        return Response(ItemSerializer(item).data)


def _parse_non_negative_decimal(raw):
    try:
        value = services.quantize(Decimal(str(raw)))
        if value < 0:
            return None
    except InvalidOperation:
        return None
    return value


class ItemSettleView(APIView):
    """Split the value of an item's leftover stock among active home members."""
    permission_classes = [IsAdminSession]

    def post(self, request, pk):
        item = get_or_not_found(Item.objects.all(), pk, "Item")
        if item.stock_quantity is None or item.stock_quantity <= 0:
            return Response({"error": "No stock to settle"}, status=400)

        members = list(Person.objects.filter(is_guest=False, active=True).order_by("id"))
        if not members:
            return Response({"error": "No domestic users found"}, status=400)

        settlement = services.settle_item_stock(item, members)
        return Response({
            "settled": TransactionSerializer(settlement.transactions, many=True).data,
            "remaining_value": str(settlement.total_value),
            "per_person": str(settlement.share),
            "count": len(members),
        }, status=status.HTTP_201_CREATED)


class BrewBatchView(APIView):
    permission_classes = [IsAdminSession]

    def get(self, request):
        batches = (
            BrewBatch.objects.select_related("output_item")
            .prefetch_related("ingredients__coffee")
            .order_by("-created_at")[:BREW_HISTORY_LIMIT]
        )
        return Response(BrewBatchSerializer(batches, many=True).data)

    def post(self, request):
        serializer = BrewBatchCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        try:
            batch = services.create_brew_batch(
                data["ingredients"], data["output_item"], data["output_ml"], data.get("note") or "",
            )
        except services.InsufficientStockError as error:
            coffee = error.item
            message = f"Nedostatok zásoby pre {coffee.name}: {coffee.stock_quantity} g < {error.requested} g"
            return Response({"error": message}, status=400)
        return Response(BrewBatchSerializer(batch).data, status=status.HTTP_201_CREATED)


# ── Auth and health ───────────────────────────────────────────────────────

@method_decorator(ensure_csrf_cookie, name="dispatch")
class CsrfView(APIView):
    def get(self, request):
        return JsonResponse({"csrftoken": get_token(request)})


class AdminLoginView(APIView):
    throttle_classes = [AdminLoginThrottle]

    def post(self, request):
        serializer = AdminLoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        if serializer.validated_data["pin"] == settings.ADMIN_PIN:
            request.session["is_admin"] = True
            return Response({"ok": True})
        return Response({"ok": False, "detail": "Invalid PIN"}, status=401)


class AdminLogoutView(APIView):
    def post(self, request):
        request.session.pop("is_admin", None)
        return Response({"ok": True})


class AdminCheckView(APIView):
    permission_classes = [IsAdminSession]

    def get(self, request):
        return Response({"ok": True})


class HealthView(APIView):
    def get(self, request):
        return Response({"ok": True})


# ── Google sign-in and allowed emails ─────────────────────────────────────

class GoogleLoginThrottle(AnonRateThrottle):
    scope = "google_login"


def auth_status(request):
    email = google_auth.session_email(request)
    return {
        "login_required": google_auth.is_public_host(request),
        "client_id": settings.GOOGLE_CLIENT_ID,
        "email": email or None,
        "is_allowed": google_auth.is_allowed(email),
        "is_admin": google_auth.is_admin(email),
        "can_manage_access": can_manage_access(request),
    }


class AuthStatusView(APIView):
    def get(self, request):
        return Response(auth_status(request))


class GoogleLoginView(APIView):
    throttle_classes = [GoogleLoginThrottle]

    def post(self, request):
        credential = request.data.get("credential")
        if not credential:
            return Response({"error": "credential required"}, status=400)
        try:
            email = google_auth.verify_google_credential(credential)
        except google_auth.GoogleTokenError:
            return Response({"error": "Invalid Google credential"}, status=401)
        if not google_auth.is_allowed(email):
            return Response({"error": "Access denied", "email": email}, status=403)

        # A fresh session id on sign-in prevents session fixation.
        request.session.cycle_key()
        request.session[google_auth.SESSION_KEY] = email
        return Response(auth_status(request))


class GoogleLogoutView(APIView):
    def post(self, request):
        request.session.pop(google_auth.SESSION_KEY, None)
        return Response(auth_status(request))


class AllowedEmailViewSet(
    mixins.ListModelMixin, mixins.CreateModelMixin, mixins.UpdateModelMixin,
    mixins.DestroyModelMixin, viewsets.GenericViewSet,
):
    """Google accounts allowed on the public domain. Admins from .env are listed but read-only."""
    queryset = AllowedEmail.objects.all()
    serializer_class = AllowedEmailSerializer
    permission_classes = [CanManageAccess]
    # The lookup is the email itself, and emails contain dots.
    lookup_value_regex = "[^/]+"

    def list(self, request):
        env_admins = google_auth.env_admin_emails()
        stored = [
            {**row, "from_env": row["email"] in env_admins}
            for row in self.get_serializer(self.get_queryset(), many=True).data
        ]
        stored_emails = {row["email"] for row in stored}
        env_only = [
            {"email": email, "is_admin": True, "created_at": None, "from_env": True}
            for email in sorted(env_admins - stored_emails)
        ]
        return Response(env_only + stored)

    def perform_update(self, serializer):
        is_self = serializer.instance.email == google_auth.session_email(self.request)
        if is_self and not serializer.validated_data.get("is_admin", True):
            raise ValidationError({"error": "Nemôžeš si odobrať správcu."})
        serializer.save()

    def perform_destroy(self, instance):
        if instance.email == google_auth.session_email(self.request):
            raise ValidationError({"error": "Nemôžeš odobrať prístup sám sebe."})
        instance.delete()
