from django.urls import path

from .views import DashboardView, ReportsView

urlpatterns = [
    path("", DashboardView.as_view(), name="dashboard"),
    path("reports/", ReportsView.as_view(), name="reports"),
]
