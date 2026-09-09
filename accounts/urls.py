from django.urls import path

from .views import CRMLoginView, CRMLogoutView, UserCreateView, UserListView

urlpatterns = [
    path("login/", CRMLoginView.as_view(), name="login"),
    path("logout/", CRMLogoutView.as_view(), name="logout"),
    path("users/", UserListView.as_view(), name="user_list"),
    path("users/new/", UserCreateView.as_view(), name="user_create"),
]
