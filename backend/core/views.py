import base64
from decimal import Decimal, ROUND_HALF_UP
from io import BytesIO

import qrcode
from django.conf import settings
from django.db import transaction
from django.db.models import Count, F, Sum
from django.db.models.functions import Greatest
from django.http import HttpResponse, JsonResponse
from django.middleware.csrf import get_token
from django.utils import timezone
from django.utils import html as html_utils
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import ensure_csrf_cookie
from qrcode.constants import ERROR_CORRECT_M
from qrcode.image.pil import PilImage
from rest_framework import status, viewsets
from rest_framework.response import Response
from rest_framework.throttling import AnonRateThrottle
from rest_framework.views import APIView

from .models import Category, Item, Session, CoffeePreset, Person, Transaction, BrewBatch, BrewBatchIngredient, CATEGORY_COFFEE, CATEGORY_BEER
from .permissions import ReadOnlyOrAdmin, IsAdminSession
from .serializers import (
    PersonSerializer, CategorySerializer, ItemSerializer,
    SessionSerializer, TransactionCreateSerializer, TransactionSerializer,
    TransactionPatchSerializer, AdminLoginSerializer, CoffeePresetSerializer,
    BrewBatchCreateSerializer, BrewBatchSerializer,
)


class AdminLoginThrottle(AnonRateThrottle):
    scope = 'admin_login'


class TransactionThrottle(AnonRateThrottle):
    scope = 'transactions'


# ===== Helper =====
def get_active_session(create=True):
    s = Session.objects.filter(ended_at__isnull=True).order_by("-id").first()
    if not s and create:
        s = Session.objects.create()
    return s






def generate_epc_spd_payload(account: str, amount: float, currency: str, variable_symbol: str, message: str) -> str:
    safe_msg = " ".join(str(message).split())
    return f"SPD*1.0*ACC:{account}*AM:{amount:.2f}*CC:{currency}*X-VS:{variable_symbol}*MSG:{safe_msg}"


class GeneratePayBySquareView(APIView):
    def get(self, request, pk):
        try:
            person = Person.objects.get(pk=pk)
        except Person.DoesNotExist:
            return JsonResponse({"error": "Person not found"}, status=404)

        session = get_active_session()
        debt = Transaction.objects.filter(session=session, person=person)\
                                  .aggregate(total=Sum("price_at_time"))["total"] or 0

        if debt <= 0:
            return JsonResponse({"error": "No debt to pay"}, status=400)

        iban = settings.PAYMENT_IBAN
        vs = f"{person.id:06d}"
        message = f"Debt payment for {person.name}"
        safe_name = html_utils.escape(person.name)
        safe_iban = html_utils.escape(iban)
        safe_vs = html_utils.escape(vs)
        safe_message = html_utils.escape(message)

        payload = generate_epc_spd_payload(
            account=iban,
            amount=float(debt),
            currency="EUR",
            variable_symbol=vs,
            message=message
        )

        qr = qrcode.QRCode(
            version=None,
            error_correction=ERROR_CORRECT_M,
            box_size=10,
            border=4,
        )
        qr.add_data(payload)
        qr.make(fit=True)
        img = qr.make_image(image_factory=PilImage)

        buf = BytesIO()
        img.save(buf, format="PNG")
        img_base64 = base64.b64encode(buf.getvalue()).decode("utf-8")

        # vrátime HTML s QR a údajmi
        html = f"""
        <html>
          <head><title>Pay by Square</title></head>
          <body style="font-family: sans-serif; text-align: center;">
            <h2>Platba dlhu</h2>
            <img src="data:image/png;base64,{img_base64}" alt="QR kód" /><br/><br/>
            <table style="margin: 0 auto; text-align: left;">
              <tr><td><b>IBAN:</b></td><td>{safe_iban}</td></tr>
              <tr><td><b>Suma:</b></td><td>{debt:.2f} EUR</td></tr>
              <tr><td><b>Variabilný symbol:</b></td><td>{safe_vs}</td></tr>
              <tr><td><b>Správa pre prijímateľa:</b></td><td>{safe_message}</td></tr>
            </table>
          </body>
        </html>
        """
        return HttpResponse(html)

# ===== Person / Category / Item =====
class PersonViewSet(viewsets.ModelViewSet):
    queryset = Person.objects.all().order_by("id")
    serializer_class = PersonSerializer
    permission_classes = [ReadOnlyOrAdmin]


class CategoryViewSet(viewsets.ModelViewSet):
    queryset = Category.objects.all().order_by("id")
    serializer_class = CategorySerializer
    permission_classes = [ReadOnlyOrAdmin]  # menenie kategórií len admin


class ItemViewSet(viewsets.ModelViewSet):
    queryset = Item.objects.all().order_by("id")
    serializer_class = ItemSerializer
    permission_classes = [ReadOnlyOrAdmin]  # ceny/položky mení len admin

    def get_queryset(self):
        qs = super().get_queryset()
        active = self.request.query_params.get("active")
        category = self.request.query_params.get("category")
        if active is not None:
            qs = qs.filter(active=active.lower() == "true")
        if category:
            qs = qs.filter(category__name__iexact=category)
        return qs


# ===== Coffee Presets =====
class CoffeePresetViewSet(viewsets.ModelViewSet):
    queryset = CoffeePreset.objects.all().order_by( "g_min", "id")
    serializer_class = CoffeePresetSerializer
    permission_classes = [ReadOnlyOrAdmin]


# ===== Sessions =====
class SessionActiveView(APIView):
    def get(self, request):
        s = get_active_session(create=False)
        if not s:
            return Response({"session": None, "per_person": [], "total": 0})
        tx = (
            Transaction.objects.filter(session=s)
            .values("person_id")
            .annotate(
                person_name=F("person__name"),
                total_eur=Sum("price_at_time"),
                count_items=Count("id"),
            )
            .order_by("person_id")
        )
        total = (
            Transaction.objects.filter(session=s)
            .aggregate(total=Sum("price_at_time"))
            .get("total") or 0
        )
        return Response({
            "session": SessionSerializer(s).data,
            "per_person": list(tx),
            "total": total
        })


class SessionResetView(APIView):
    permission_classes = [IsAdminSession]

    def post(self, request):
        s = get_active_session()
        s.ended_at = timezone.now()
        s.save()
        s2 = Session.objects.create()
        return Response({
            "previous": SessionSerializer(s).data,
            "active": SessionSerializer(s2).data
        })


# ===== Transactions =====
class TransactionListView(APIView):
    """GET: list transactions with pagination (limit/offset)"""
    def get(self, request):
        try:
            limit = max(1, min(int(request.query_params.get("limit", 20)), 500))
            offset = max(0, int(request.query_params.get("offset", 0)))
        except (ValueError, TypeError):
            return Response({"error": "limit and offset must be integers"}, status=400)

        qs = Transaction.objects.select_related("person", "item__category").order_by("-created_at")
        person_id = request.query_params.get("person_id")
        if person_id:
            ids = [i.strip() for i in person_id.split(",") if i.strip().isdigit()]
            if ids:
                qs = qs.filter(person_id__in=ids)

        transactions = qs[offset:offset+limit]
        total_count = qs.count()
        
        return Response({
            "results": TransactionSerializer(transactions, many=True).data,
            "count": total_count,
            "limit": limit,
            "offset": offset
        })

class TransactionDetailView(APIView):
    """PATCH: update, DELETE: delete specific transaction"""
    permission_classes = [IsAdminSession]
    
    def patch(self, request, pk):
        try:
            tx = Transaction.objects.select_related("person", "item__category").get(pk=pk)
        except Transaction.DoesNotExist:
            return Response({"error": "Transaction not found"}, status=404)

        ser = TransactionPatchSerializer(data=request.data)
        ser.is_valid(raise_exception=True)

        update_fields = []
        if "quantity" in ser.validated_data:
            tx.quantity = ser.validated_data["quantity"].quantize(Decimal("0.001"), rounding=ROUND_HALF_UP)
            update_fields.append("quantity")
        if "price_at_time" in ser.validated_data:
            tx.price_at_time = ser.validated_data["price_at_time"].quantize(Decimal("0.001"), rounding=ROUND_HALF_UP)
            update_fields.append("price_at_time")

        if update_fields:
            tx.save(update_fields=update_fields)
        return Response(TransactionSerializer(tx).data)
    
    def delete(self, request, pk):
        try:
            tx = Transaction.objects.select_related("item__category").get(pk=pk)
        except Transaction.DoesNotExist:
            return Response({"error": "Transaction not found"}, status=404)

        data = TransactionSerializer(tx).data
        with transaction.atomic():
            _decrement_person_counters(tx)
            _restore_item_stock(tx)
            tx.delete()
        return Response({"deleted": data})

class TransactionView(APIView):
    throttle_classes = [TransactionThrottle]

    def post(self, request):
        s = get_active_session()
        ser = TransactionCreateSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        person = ser.validated_data["person"]
        item = ser.validated_data["item"]
        qty = ser.validated_data.get("quantity", Decimal("1.000"))

        if item.pricing_mode in ("per_gram", "per_ml"):
            total = (item.price * qty).quantize(Decimal("0.001"))
            if item.pricing_mode == "per_gram" and (item.category and item.category.name.lower() == CATEGORY_COFFEE):
                preset = (CoffeePreset.objects
                          .filter(g_min__lte=qty, g_max__gte=qty)
                          .order_by("g_min", "id")
                          .first())
                if preset:
                    total = (total + preset.extra_eur).quantize(Decimal("0.001"))
        else:
            total = (item.price * qty).quantize(Decimal("0.001"))

        cat = (item.category.name.lower() if item.category and item.category.name else None)

        with transaction.atomic():
            # vytvor transakciu
            t = Transaction.objects.create(
                session=s, person=person, item=item,
                quantity=qty, price_at_time=total
            )

            # inkrementuj počty cez SQL (bez načítania a ukladania objektu)
            if cat == CATEGORY_COFFEE:
                cups = max(1, int(qty // Decimal("15")))
                Person.objects.filter(pk=person.pk).update(
                    total_coffees=F("total_coffees") + cups
                )
            elif cat == CATEGORY_BEER:
                Person.objects.filter(pk=person.pk).update(
                    total_beers=F("total_beers") + int(qty)
                )

            # odpočítaj zásobu atomicky (bez race condition pri viacerých requestoch)
            if item.stock_quantity is not None:
                Item.objects.filter(pk=item.pk).update(
                    stock_quantity=Greatest(F("stock_quantity") - qty, Decimal("0"))
                )
                item.refresh_from_db(fields=["stock_quantity"])
                if item.stock_quantity <= Decimal("0"):
                    Item.objects.filter(pk=item.pk).update(active=False)

            # brew_count pre coffee per_gram — signál každých 10 varení
            trigger_check = False
            if cat == CATEGORY_COFFEE and item.pricing_mode == "per_gram":
                Item.objects.filter(pk=item.pk).update(brew_count=F("brew_count") + 1)
                item.refresh_from_db(fields=["brew_count"])
                trigger_check = (item.brew_count % 10 == 0)

        person.refresh_from_db(fields=["total_beers", "total_coffees"])

        data = TransactionSerializer(t).data
        data["trigger_check"] = trigger_check
        return Response(data, status=status.HTTP_201_CREATED)


class TransactionUndoView(APIView):

    def post(self, request):
        s = get_active_session()
        person_id = request.data.get("person_id")
        if not person_id:
            return Response({"detail": "person_id required"}, status=400)
        t = Transaction.objects.select_related("item__category").filter(session=s, person_id=person_id).order_by("-id").first()
        if not t:
            return Response({"detail": "nothing to undo"}, status=404)
        data = TransactionSerializer(t).data
        with transaction.atomic():
            _decrement_person_counters(t)
            _restore_item_stock(t)
            t.delete()
        return Response({"undone": data})


# ===== Helpers =====
def _decrement_person_counters(tx):
    """Reverse the counter increments made when a transaction was created."""
    cat = (
        tx.item.category.name.lower()
        if tx.item and tx.item.category and tx.item.category.name
        else None
    )
    if cat == CATEGORY_COFFEE:
        cups = max(1, int(tx.quantity // Decimal("15")))
        Person.objects.filter(pk=tx.person_id).update(
            total_coffees=Greatest(F("total_coffees") - cups, 0)
        )
    elif cat == CATEGORY_BEER:
        Person.objects.filter(pk=tx.person_id).update(
            total_beers=Greatest(F("total_beers") - int(tx.quantity), 0)
        )


def _restore_item_stock(tx):
    """Vráti zásobu položky späť po zmazaní transakcie."""
    item = tx.item
    # Refresh priamo z DB aby sme mali aktuálnu hodnotu (nie stale in-memory)
    item.refresh_from_db(fields=["stock_quantity", "active"])
    if item.stock_quantity is None:
        return
    new_stock = item.stock_quantity + tx.quantity
    update_kwargs = {"stock_quantity": new_stock}
    # reaktivuj len ak bola deaktivovaná (pravdepodobne auto-deaktiváciou pri stock=0)
    if not item.active and new_stock > Decimal("0"):
        update_kwargs["active"] = True
    Item.objects.filter(pk=item.pk).update(**update_kwargs)


class StatsView(APIView):
    def get(self, request):
        from django.db.models import Sum, Count, Avg

        persons_stats = list(
            Person.objects.annotate(
                total_spent=Sum("transactions__price_at_time"),
                tx_count=Count("transactions"),
            ).values("id", "name", "is_guest", "total_beers", "total_coffees", "total_spent", "tx_count")
            .order_by("-total_spent")
        )

        top_items = list(
            Transaction.objects.values(
                "item__name", "item__category__name"
            ).annotate(
                count=Count("id"),
                total_qty=Sum("quantity"),
                total_eur=Sum("price_at_time"),
            ).order_by("-count")[:10]
        )

        grand = Transaction.objects.aggregate(
            total=Sum("price_at_time"),
            count=Count("id"),
        )

        return Response({
            "persons": persons_stats,
            "top_items": top_items,
            "grand_total": str(grand["total"] or 0),
            "grand_count": grand["count"] or 0,
        })


# ===== Inventory / Stock =====
class ItemSetStockView(APIView):
    """POST: nastaví zásobu na položke"""
    permission_classes = [IsAdminSession]

    def post(self, request, pk):
        try:
            item = Item.objects.get(pk=pk)
        except Item.DoesNotExist:
            return Response({"error": "Item not found"}, status=404)

        raw = request.data.get("stock_quantity")
        if raw is None:
            return Response({"error": "stock_quantity required"}, status=400)

        try:
            qty = Decimal(str(raw)).quantize(Decimal("0.001"), rounding=ROUND_HALF_UP)
            if qty < 0:
                raise ValueError
        except Exception:
            return Response({"error": "stock_quantity must be a non-negative number"}, status=400)

        Item.objects.filter(pk=pk).update(stock_quantity=qty)
        item.refresh_from_db()
        return Response(ItemSerializer(item).data)


class ItemSettleView(APIView):
    """POST: rozrátá zostatok zásoby medzi domácich užívateľov ako nové transakcie"""
    permission_classes = [IsAdminSession]

    def post(self, request, pk):
        try:
            item = Item.objects.get(pk=pk)
        except Item.DoesNotExist:
            return Response({"error": "Item not found"}, status=404)

        if item.stock_quantity is None or item.stock_quantity <= Decimal("0"):
            return Response({"error": "No stock to settle"}, status=400)

        domestic = list(Person.objects.filter(is_guest=False, active=True).order_by("id"))
        if not domestic:
            return Response({"error": "No domestic users found"}, status=400)

        remaining = item.stock_quantity
        remaining_value = (remaining * item.price).quantize(Decimal("0.001"), rounding=ROUND_HALF_UP)
        count = len(domestic)
        per_person = (remaining_value / count).quantize(Decimal("0.001"), rounding=ROUND_HALF_UP)
        qty_per_person = (remaining / count).quantize(Decimal("0.001"), rounding=ROUND_HALF_UP)

        s = get_active_session()
        created = []

        with transaction.atomic():
            total_assigned = Decimal("0")
            for i, person in enumerate(domestic):
                if i == count - 1:
                    # posledný dostane zvyšok (korrektúra zaokrúhlovania)
                    share = (remaining_value - total_assigned).quantize(Decimal("0.001"), rounding=ROUND_HALF_UP)
                    qty_share = (remaining - (qty_per_person * i)).quantize(Decimal("0.001"), rounding=ROUND_HALF_UP)
                else:
                    share = per_person
                    qty_share = qty_per_person
                    total_assigned += share

                t = Transaction.objects.create(
                    session=s,
                    person=person,
                    item=item,
                    quantity=qty_share,
                    price_at_time=share,
                )
                created.append(t)

            Item.objects.filter(pk=pk).update(stock_quantity=Decimal("0"), active=False)

        return Response({
            "settled": TransactionSerializer(created, many=True).data,
            "remaining_value": str(remaining_value),
            "per_person": str(per_person),
            "count": count,
        }, status=status.HTTP_201_CREATED)


# ===== Reset / Admin / Misc =====
class ResetPersonDebtView(APIView):
    permission_classes = [IsAdminSession]

    def post(self, request, pk):
        try:
            person = Person.objects.get(pk=pk)
        except Person.DoesNotExist:
            return Response({"error": "Person not found"}, status=404)

        session = get_active_session()
        Transaction.objects.filter(session=session, person=person).delete()
        return Response({"ok": True}, status=status.HTTP_200_OK)


@method_decorator(ensure_csrf_cookie, name="dispatch")
class CsrfView(APIView):
    def get(self, request):
        return JsonResponse({"csrftoken": get_token(request)})


class AdminLoginView(APIView):
    throttle_classes = [AdminLoginThrottle]

    def post(self, request):
        ser = AdminLoginSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        if ser.validated_data["pin"] == settings.ADMIN_PIN:
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


class BrewBatchView(APIView):
    permission_classes = [IsAdminSession]

    def get(self, request):
        batches = BrewBatch.objects.select_related(
            "output_item"
        ).prefetch_related(
            "ingredients__coffee"
        ).order_by("-created_at")[:30]
        return Response(BrewBatchSerializer(batches, many=True).data)

    def post(self, request):
        ser = BrewBatchCreateSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        d = ser.validated_data

        ingredients = d["ingredients"]  # list of {coffee: Item, grams: Decimal}
        output = d["output_item"]
        output_ml = d["output_ml"]

        # Validate stock for each ingredient
        for idx, ing in enumerate(ingredients):
            coffee = ing["coffee"]
            grams = ing["grams"]
            if coffee.stock_quantity is not None and coffee.stock_quantity < grams:
                return Response(
                    {"error": f"Nedostatok zásoby pre {coffee.name}: {coffee.stock_quantity} g < {grams} g"},
                    status=400,
                )

        with transaction.atomic():
            # Deduct each coffee's stock
            for ing in ingredients:
                coffee = ing["coffee"]
                grams = ing["grams"]
                if coffee.stock_quantity is not None:
                    Item.objects.filter(pk=coffee.pk).update(
                        stock_quantity=Greatest(F("stock_quantity") - grams, Decimal("0"))
                    )
                    coffee.refresh_from_db(fields=["stock_quantity"])
                    if coffee.stock_quantity <= Decimal("0"):
                        Item.objects.filter(pk=coffee.pk).update(active=False)

            # Add ml to output item (activate if was inactive)
            if output.stock_quantity is None:
                Item.objects.filter(pk=output.pk).update(stock_quantity=output_ml, active=True)
            else:
                Item.objects.filter(pk=output.pk).update(
                    stock_quantity=F("stock_quantity") + output_ml,
                    active=True,
                )

            batch = BrewBatch.objects.create(
                output_item=output,
                output_ml=output_ml,
                note=d.get("note") or "",
            )
            for sort_idx, ing in enumerate(ingredients):
                BrewBatchIngredient.objects.create(
                    batch=batch,
                    coffee=ing["coffee"],
                    grams=ing["grams"],
                    sort_order=sort_idx,
                )

        batch.refresh_from_db()
        return Response(BrewBatchSerializer(batch).data, status=status.HTTP_201_CREATED)


class HealthView(APIView):
    def get(self, request):
        return Response({"ok": True})