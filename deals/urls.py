from django.urls import path

from . import views

urlpatterns = [
    path("", views.DealListView.as_view(), name="deal_list"),
    path("pipeline/", views.PipelineView.as_view(), name="pipeline"),
    path("new/", views.DealCreateView.as_view(), name="deal_create"),
    path("<int:pk>/", views.DealDetailView.as_view(), name="deal_detail"),
    path("<int:pk>/edit/", views.DealUpdateView.as_view(), name="deal_update"),
    path("<int:pk>/stage/", views.DealStageUpdateView.as_view(), name="deal_stage"),
]
