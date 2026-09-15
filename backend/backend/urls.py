from django.conf import settings
from django.contrib import admin
from django.urls import include, path, re_path
from django.views.static import serve
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView

urlpatterns = [
    # /admin belongs to the React admin page, so Django admin gets its own prefix.
    path("django-admin/", admin.site.urls),
    path("api/", include("core.urls")),
    # Django serves uploads in every environment; this homelab has no CDN.
    re_path(r"^media/(?P<path>.*)$", serve, {"document_root": settings.MEDIA_ROOT}),
]

if settings.DEBUG:
    urlpatterns += [
        path("api/schema/", SpectacularAPIView.as_view(), name="schema"),
        path("api/docs/", SpectacularSwaggerView.as_view(url_name="schema"), name="swagger-ui"),
    ]
