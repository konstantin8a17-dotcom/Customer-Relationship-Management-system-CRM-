from django.contrib import messages
from django.contrib.auth.mixins import LoginRequiredMixin
from django.shortcuts import get_object_or_404, redirect
from django.urls import reverse, reverse_lazy
from django.utils import timezone
from django.views import View
from django.views.generic import CreateView, DetailView, ListView, UpdateView

from accounts.permissions import ensure_object_access, scoped_queryset
from .forms import CommunicationForm, CompanyForm, ContactForm
from .models import Company, Contact


class CompanyListView(LoginRequiredMixin, ListView):
    model = Company
    template_name = "contacts/company_list.html"
    context_object_name = "companies"

    def get_queryset(self):
        qs = scoped_queryset(self.request.user, Company.objects.select_related("owner"))
        q = self.request.GET.get("q")
        if q:
            qs = qs.filter(name__icontains=q)
        return qs


class CompanyCreateView(LoginRequiredMixin, CreateView):
    form_class = CompanyForm
    template_name = "contacts/form.html"
    extra_context = {"page_title": "Нова компания"}

    def get_form_kwargs(self):
        kwargs = super().get_form_kwargs()
        kwargs["user"] = self.request.user
        return kwargs

    def form_valid(self, form):
        messages.success(self.request, "Компанията е създадена.")
        return super().form_valid(form)


class CompanyDetailView(LoginRequiredMixin, DetailView):
    model = Company
    template_name = "contacts/company_detail.html"

    def get_queryset(self):
        return scoped_queryset(self.request.user, Company.objects.prefetch_related("contacts"))


class CompanyUpdateView(LoginRequiredMixin, UpdateView):
    model = Company
    form_class = CompanyForm
    template_name = "contacts/form.html"
    extra_context = {"page_title": "Редакция на компания"}

    def get_queryset(self):
        return scoped_queryset(self.request.user, Company.objects.all())

    def get_form_kwargs(self):
        kwargs = super().get_form_kwargs()
        kwargs["user"] = self.request.user
        return kwargs

    def form_valid(self, form):
        messages.success(self.request, "Компанията е обновена.")
        return super().form_valid(form)


class ContactListView(LoginRequiredMixin, ListView):
    model = Contact
    template_name = "contacts/contact_list.html"
    context_object_name = "contacts"

    def get_queryset(self):
        qs = scoped_queryset(self.request.user, Contact.objects.select_related("company", "owner"))
        q = self.request.GET.get("q")
        if q:
            qs = qs.filter(first_name__icontains=q) | qs.filter(last_name__icontains=q) | qs.filter(email__icontains=q)
        return qs.distinct()


class ContactFormMixin:
    form_class = ContactForm
    template_name = "contacts/form.html"

    def get_form_kwargs(self):
        kwargs = super().get_form_kwargs()
        kwargs["user"] = self.request.user
        kwargs["companies"] = scoped_queryset(self.request.user, Company.objects.all())
        return kwargs


class ContactCreateView(LoginRequiredMixin, ContactFormMixin, CreateView):
    extra_context = {"page_title": "Нов контакт"}

    def get_initial(self):
        initial = super().get_initial()
        company_id = self.request.GET.get("company")
        if company_id:
            initial["company"] = company_id
        return initial

    def form_valid(self, form):
        messages.success(self.request, "Контактът е създаден.")
        return super().form_valid(form)


class ContactUpdateView(LoginRequiredMixin, ContactFormMixin, UpdateView):
    model = Contact
    extra_context = {"page_title": "Редакция на контакт"}

    def get_queryset(self):
        return scoped_queryset(self.request.user, Contact.objects.all())

    def form_valid(self, form):
        messages.success(self.request, "Контактът е обновен.")
        return super().form_valid(form)


class ContactDetailView(LoginRequiredMixin, DetailView):
    model = Contact
    template_name = "contacts/contact_detail.html"

    def get_queryset(self):
        return scoped_queryset(
            self.request.user,
            Contact.objects.select_related("company", "owner").prefetch_related("communications", "deals", "tasks"),
        )

    def get_context_data(self, **kwargs):
        ctx = super().get_context_data(**kwargs)
        ctx["comm_form"] = CommunicationForm(initial={"occurred_at": timezone.localtime().strftime("%Y-%m-%dT%H:%M")})
        return ctx


class CommunicationCreateView(LoginRequiredMixin, View):
    def post(self, request, pk):
        contact = get_object_or_404(scoped_queryset(request.user, Contact.objects.all()), pk=pk)
        form = CommunicationForm(request.POST)
        if form.is_valid():
            comm = form.save(commit=False)
            comm.contact = contact
            comm.created_by = request.user
            comm.save()
            messages.success(request, "Комуникацията е записана.")
        else:
            messages.error(request, "Проверете данните за комуникацията.")
        return redirect(contact.get_absolute_url())
