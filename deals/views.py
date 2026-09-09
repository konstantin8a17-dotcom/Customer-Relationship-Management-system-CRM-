from django.contrib import messages
from django.contrib.auth.mixins import LoginRequiredMixin
from django.db.models import Sum
from django.shortcuts import get_object_or_404, redirect
from django.urls import reverse
from django.views import View
from django.views.generic import CreateView, DetailView, ListView, UpdateView

from accounts.permissions import scoped_queryset
from contacts.models import Contact
from .forms import DealForm
from .models import Deal


class DealQuerysetMixin:
    def get_queryset(self):
        return scoped_queryset(self.request.user, Deal.objects.select_related("contact", "company", "owner"))


class DealListView(LoginRequiredMixin, DealQuerysetMixin, ListView):
    model = Deal
    template_name = "deals/deal_list.html"
    context_object_name = "deals"

    def get_queryset(self):
        qs = super().get_queryset()
        stage = self.request.GET.get("stage")
        if stage:
            qs = qs.filter(stage=stage)
        return qs

    def get_context_data(self, **kwargs):
        ctx = super().get_context_data(**kwargs)
        qs = self.get_queryset()
        ctx["total_value"] = qs.aggregate(total=Sum("value"))["total"] or 0
        ctx["stages"] = Deal.Stage.choices
        return ctx


class PipelineView(LoginRequiredMixin, DealQuerysetMixin, ListView):
    model = Deal
    template_name = "deals/pipeline.html"
    context_object_name = "deals"

    def get_context_data(self, **kwargs):
        ctx = super().get_context_data(**kwargs)
        deals = list(self.get_queryset().exclude(stage=Deal.Stage.CLOSED_LOST))
        lost = list(self.get_queryset().filter(stage=Deal.Stage.CLOSED_LOST))
        columns = []
        for key, label in Deal.Stage.choices:
            if key == Deal.Stage.CLOSED_LOST:
                continue
            items = [d for d in deals if d.stage == key]
            columns.append(
                {
                    "key": key,
                    "label": label,
                    "deals": items,
                    "value": sum((d.value for d in items), start=0),
                }
            )
        ctx["columns"] = columns
        ctx["lost_deals"] = lost
        return ctx


class DealFormMixin:
    form_class = DealForm
    template_name = "deals/form.html"

    def get_form_kwargs(self):
        kwargs = super().get_form_kwargs()
        kwargs["user"] = self.request.user
        kwargs["contacts"] = scoped_queryset(self.request.user, Contact.objects.select_related("company"))
        return kwargs


class DealCreateView(LoginRequiredMixin, DealFormMixin, CreateView):
    extra_context = {"page_title": "Нова сделка"}

    def get_initial(self):
        initial = super().get_initial()
        if self.request.GET.get("contact"):
            initial["contact"] = self.request.GET["contact"]
        return initial

    def form_valid(self, form):
        messages.success(self.request, "Сделката е създадена.")
        return super().form_valid(form)


class DealUpdateView(LoginRequiredMixin, DealQuerysetMixin, DealFormMixin, UpdateView):
    extra_context = {"page_title": "Редакция на сделка"}

    def form_valid(self, form):
        messages.success(self.request, "Сделката е обновена.")
        return super().form_valid(form)


class DealDetailView(LoginRequiredMixin, DealQuerysetMixin, DetailView):
    template_name = "deals/deal_detail.html"

    def get_queryset(self):
        return super().get_queryset().prefetch_related("stage_history__changed_by", "tasks")


class DealStageUpdateView(LoginRequiredMixin, View):
    def post(self, request, pk):
        deal = get_object_or_404(
            scoped_queryset(request.user, Deal.objects.select_related("contact")),
            pk=pk,
        )
        next_stage = request.POST.get("stage")
        if next_stage not in dict(Deal.Stage.choices):
            messages.error(request, "Невалиден етап.")
            return redirect("pipeline")
        previous = deal.stage
        deal.stage = next_stage
        deal.apply_stage_defaults(previous)
        deal.save()
        deal.record_stage_change(request.user, previous)
        messages.success(request, f"Сделката е преместена към „{deal.get_stage_display()}“.")
        return redirect(request.POST.get("next") or reverse("pipeline"))
