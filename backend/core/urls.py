from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import HealthView
from .views import CsrfView
from .views import (
    PersonViewSet, CategoryViewSet, ItemViewSet,
    SessionActiveView, SessionResetView,
    TransactionView, TransactionListView, TransactionDetailView, TransactionUndoView,
    AdminLoginView, AdminLogoutView,ResetPersonDebtView,
CoffeePresetViewSet, GeneratePayBySquareView
)


router = DefaultRouter()
router.register(r"persons", PersonViewSet, basename="person")
router.register(r"categories", CategoryViewSet, basename="category")
router.register(r"items", ItemViewSet, basename="item")
router.register(r"coffee-presets", CoffeePresetViewSet, basename="coffee-preset")
router.register(r"coffee-filters", CoffeePresetViewSet, basename="coffee-filter")  # alias pre frontend

urlpatterns = [
    path("", include(router.urls)),
    path("session/active", SessionActiveView.as_view()),
    path("session/reset", SessionResetView.as_view()),
    path("transactions", TransactionView.as_view()),
    path("transactions/list", TransactionListView.as_view()),
    path("transactions/<int:pk>", TransactionDetailView.as_view()),
    path("transactions/undo", TransactionUndoView.as_view()),
    path("auth/admin-login", AdminLoginView.as_view()),
    path("auth/admin-logout", AdminLogoutView.as_view()),
    path("health", HealthView.as_view()),
    path("auth/csrf", CsrfView.as_view()),
    path("persons/<int:pk>/reset-debt", ResetPersonDebtView.as_view()),
    path("persons/<int:pk>/pay-by-square/", GeneratePayBySquareView.as_view(), name="pay-by-square"),

]
