import base64
from decimal import Decimal
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

from .models import Category, Item, Session, CoffeePreset, Person, Transaction, CATEGORY_COFFEE, CATEGORY_BEER
from .permissions import ReadOnlyOrAdmin, IsAdminSession
from .serializers import (
    PersonSerializer, CategorySerializer, ItemSerializer,
    SessionSerializer, TransactionCreateSerializer, TransactionSerializer,
    TransactionPatchSerializer, AdminLoginSerializer, CoffeePresetSerializer
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
            limit = max(1, min(int(request.query_params.get("limit", 20)), 200))
            offset = max(0, int(request.query_params.get("offset", 0)))
        except (ValueError, TypeError):
            return Response({"error": "limit and offset must be integers"}, status=400)
        
        transactions = Transaction.objects.select_related("person", "item__category").order_by("-created_at")[offset:offset+limit]
        total_count = Transaction.objects.count()
        
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
            tx.quantity = ser.validated_data["quantity"]
            update_fields.append("quantity")
        if "price_at_time" in ser.validated_data:
            tx.price_at_time = ser.validated_data["price_at_time"]
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
            total = item.price.quantize(Decimal("0.001"))

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
                    total_beers=F("total_beers") + 1
                )

        # ak potrebuješ aktuálne hodnoty v odpovedi:
        person.refresh_from_db(fields=["total_beers", "total_coffees"])

        return Response(TransactionSerializer(t).data, status=status.HTTP_201_CREATED)


class TransactionUndoView(APIView):
    permission_classes = [IsAdminSession]

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
            total_beers=Greatest(F("total_beers") - 1, 0)
        )


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


class HealthView(APIView):
    def get(self, request):
        return Response({"ok": True})