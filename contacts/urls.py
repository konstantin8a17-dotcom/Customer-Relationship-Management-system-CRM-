from django.urls import path

from . import views

urlpatterns = [
    path("", views.ContactListView.as_view(), name="contact_list"),
    path("new/", views.ContactCreateView.as_view(), name="contact_create"),
    path("<int:pk>/", views.ContactDetailView.as_view(), name="contact_detail"),
    path("<int:pk>/edit/", views.ContactUpdateView.as_view(), name="contact_update"),
    path("<int:pk>/communication/", views.CommunicationCreateView.as_view(), name="communication_create"),
    path("companies/", views.CompanyListView.as_view(), name="company_list"),
    path("companies/new/", views.CompanyCreateView.as_view(), name="company_create"),
    path("companies/<int:pk>/", views.CompanyDetailView.as_view(), name="company_detail"),
    path("companies/<int:pk>/edit/", views.CompanyUpdateView.as_view(), name="company_update"),
]
