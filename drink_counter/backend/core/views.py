from decimal import Decimal

from django.conf import settings
from django.db.models import Sum, Count, F
from django.http import JsonResponse
from django.middleware.csrf import get_token
from django.utils import timezone
from django.utils.decorators import method_decorator
from django.views import View
from django.views.decorators.csrf import ensure_csrf_cookie
from rest_framework import status
from rest_framework import viewsets
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Category, Item
from .models import Person, Transaction, Session
from .permissions import ReadOnlyOrAdmin, IsAdminSession
from .serializers import (
    PersonSerializer, CategorySerializer, ItemSerializer,
    SessionSerializer, TransactionCreateSerializer, TransactionSerializer,
    AdminLoginSerializer
)


class ResetPersonDebtView(APIView):
    def post(self, request, pk):
        try:
            person = Person.objects.get(pk=pk)
        except Person.DoesNotExist:
            return Response({"error": "Person not found"}, status=404)

        session = get_active_session()
        # zmaž všetky transakcie tejto osoby v aktuálnej session
        Transaction.objects.filter(session=session, person=person).delete()
        return Response({"ok": True}, status=status.HTTP_200_OK)

@method_decorator(ensure_csrf_cookie, name="dispatch")
class CsrfView(APIView):
    def get(self, request):
        return JsonResponse({"csrftoken": get_token(request)})
def get_active_session():
    s = Session.objects.filter(ended_at__isnull=True).order_by("-id").first()
    if not s:
        s = Session.objects.create()
    return s

class PersonViewSet(viewsets.ModelViewSet):
    queryset = Person.objects.all().order_by("id")
    serializer_class = PersonSerializer
    # osoby nechávame voľné (môžeš pridávať hostí/rename bez PINu)

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


class SessionActiveView(APIView):
    def get(self, request):
        s = get_active_session()
        tx = (
            Transaction.objects.filter(session=s)
            .values("person_id")  # skupinovanie podľa FK stĺpca
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
        return Response({"session": SessionSerializer(s).data, "per_person": list(tx), "total": total})

class SessionResetView(APIView):
    permission_classes = [IsAdminSession]
    def post(self, request):
        s = get_active_session()
        s.ended_at = timezone.now()
        s.save()
        s2 = Session.objects.create()
        return Response({"previous": SessionSerializer(s).data, "active": SessionSerializer(s2).data})



class TransactionView(APIView):
    def post(self, request):
        s = get_active_session()
        ser = TransactionCreateSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        person = ser.validated_data["person"]
        item = ser.validated_data["item"]
        qty = ser.validated_data.get("quantity", Decimal("1.000"))
        if item.pricing_mode == "per_gram":
            total = (item.price * qty).quantize(Decimal("0.001"))
        else:
            total = item.price.quantize(Decimal("0.001"))
        t = Transaction.objects.create(session=s, person=person, item=item, quantity=qty, price_at_time=total)
        return Response(TransactionSerializer(t).data, status=status.HTTP_201_CREATED)

class TransactionUndoView(APIView):
    def post(self, request):
        s = get_active_session()
        person_id = request.data.get("person_id")
        if not person_id:
            return Response({"detail": "person_id required"}, status=400)
        t = Transaction.objects.filter(session=s, person_id=person_id).order_by("-id").first()
        if not t:
            return Response({"detail": "nothing to undo"}, status=404)
        data = TransactionSerializer(t).data
        t.delete()
        return Response({"undone": data})

class AdminLoginView(APIView):
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



class HealthView(View):
    def get(self, request): return JsonResponse({"ok": True})