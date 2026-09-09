from django.contrib import admin
from django.urls import include, path

urlpatterns = [
    path("admin/", admin.site.urls),
    path("accounts/", include("accounts.urls")),
    path("contacts/", include("contacts.urls")),
    path("deals/", include("deals.urls")),
    path("tasks/", include("tasks.urls")),
    path("", include("reports.urls")),
]
