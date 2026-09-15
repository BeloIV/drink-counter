from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    AdminCheckView, AdminLoginView, AdminLogoutView, AllowedEmailViewSet, AuthStatusView,
    BrewBatchView, CategoryViewSet,
    CoffeePresetViewSet, CsrfView, GoogleLoginView, GoogleLogoutView, HealthView, ItemSetStockView, ItemSettleView, ItemViewSet,
    PayBySquareView, PersonViewSet, ResetPersonDebtView, SessionActiveView, SessionResetView,
    StatsView, TransactionDetailView, TransactionListView, TransactionUndoView, TransactionView,
)

router = DefaultRouter()
router.register(r"persons", PersonViewSet, basename="person")
router.register(r"categories", CategoryViewSet, basename="category")
router.register(r"items", ItemViewSet, basename="item")
router.register(r"coffee-presets", CoffeePresetViewSet, basename="coffee-preset")
# The frontend calls coffee presets "coffee filters".
router.register(r"coffee-filters", CoffeePresetViewSet, basename="coffee-filter")
router.register(r"allowed-emails", AllowedEmailViewSet, basename="allowed-email")

urlpatterns = [
    path("", include(router.urls)),
    path("health", HealthView.as_view()),
    path("auth/csrf", CsrfView.as_view()),
    path("auth/admin-login", AdminLoginView.as_view()),
    path("auth/admin-logout", AdminLogoutView.as_view()),
    path("auth/admin-check", AdminCheckView.as_view()),
    path("auth/me", AuthStatusView.as_view()),
    path("auth/google", GoogleLoginView.as_view()),
    path("auth/google-logout", GoogleLogoutView.as_view()),
    path("session/active", SessionActiveView.as_view()),
    path("session/reset", SessionResetView.as_view()),
    path("transactions", TransactionView.as_view()),
    path("transactions/list", TransactionListView.as_view()),
    path("transactions/<int:pk>", TransactionDetailView.as_view()),
    path("transactions/undo", TransactionUndoView.as_view()),
    path("persons/<int:pk>/reset-debt", ResetPersonDebtView.as_view()),
    path("persons/<int:pk>/pay-by-square/", PayBySquareView.as_view(), name="pay-by-square"),
    path("items/<int:pk>/set-stock", ItemSetStockView.as_view(), name="item-set-stock"),
    path("items/<int:pk>/settle", ItemSettleView.as_view(), name="item-settle"),
    path("stats", StatsView.as_view()),
    path("brew-batches", BrewBatchView.as_view(), name="brew-batches"),
]
