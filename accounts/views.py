from django.contrib import messages
from django.contrib.auth.models import User
from django.contrib.auth.views import LoginView, LogoutView
from django.urls import reverse_lazy
from django.views.generic import CreateView, ListView

from .forms import SalesUserForm, StyledAuthenticationForm
from .permissions import AdminRequiredMixin


class CRMLoginView(LoginView):
    template_name = "registration/login.html"
    authentication_form = StyledAuthenticationForm
    redirect_authenticated_user = True


class CRMLogoutView(LogoutView):
    next_page = reverse_lazy("login")


class UserListView(AdminRequiredMixin, ListView):
    model = User
    template_name = "accounts/user_list.html"
    context_object_name = "users"
    queryset = User.objects.select_related("profile").order_by("first_name", "username")


class UserCreateView(AdminRequiredMixin, CreateView):
    form_class = SalesUserForm
    template_name = "accounts/user_form.html"
    success_url = reverse_lazy("user_list")

    def form_valid(self, form):
        messages.success(self.request, "Потребителят е създаден.")
        return super().form_valid(form)
