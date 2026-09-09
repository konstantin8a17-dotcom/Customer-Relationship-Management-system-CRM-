import calendar
from datetime import datetime

from django.contrib import messages
from django.contrib.auth.mixins import LoginRequiredMixin
from django.shortcuts import get_object_or_404, redirect
from django.utils import timezone
from django.views import View
from django.views.generic import CreateView, ListView, UpdateView

from accounts.permissions import scoped_queryset
from contacts.models import Contact
from deals.models import Deal
from .forms import TaskForm
from .models import Task


class TaskQuerysetMixin:
    def get_queryset(self):
        return scoped_queryset(self.request.user, Task.objects.select_related("contact", "deal", "owner"))


class TaskListView(LoginRequiredMixin, TaskQuerysetMixin, ListView):
    model = Task
    template_name = "tasks/task_list.html"
    context_object_name = "tasks"

    def get_queryset(self):
        qs = super().get_queryset()
        if self.request.GET.get("done") != "1":
            qs = qs.filter(completed=False)
        return qs


class TaskFormMixin:
    form_class = TaskForm
    template_name = "tasks/form.html"

    def get_form_kwargs(self):
        kwargs = super().get_form_kwargs()
        kwargs["user"] = self.request.user
        kwargs["contacts"] = scoped_queryset(self.request.user, Contact.objects.all())
        kwargs["deals"] = scoped_queryset(self.request.user, Deal.objects.all())
        return kwargs


class TaskCreateView(LoginRequiredMixin, TaskFormMixin, CreateView):
    extra_context = {"page_title": "Нова задача"}

    def get_initial(self):
        initial = super().get_initial()
        for key in ("contact", "deal"):
            if self.request.GET.get(key):
                initial[key] = self.request.GET[key]
        return initial

    def form_valid(self, form):
        messages.success(self.request, "Задачата е създадена.")
        return super().form_valid(form)


class TaskUpdateView(LoginRequiredMixin, TaskQuerysetMixin, TaskFormMixin, UpdateView):
    extra_context = {"page_title": "Редакция на задача"}

    def form_valid(self, form):
        messages.success(self.request, "Задачата е обновена.")
        return super().form_valid(form)


class TaskCompleteView(LoginRequiredMixin, View):
    def post(self, request, pk):
        task = get_object_or_404(scoped_queryset(request.user, Task.objects.all()), pk=pk)
        task.completed = True
        task.save(update_fields=["completed"])
        messages.success(request, "Задачата е маркирана като изпълнена.")
        return redirect("task_list")


class CalendarView(LoginRequiredMixin, TaskQuerysetMixin, ListView):
    model = Task
    template_name = "tasks/calendar.html"
    context_object_name = "tasks"

    def get_queryset(self):
        year, month = self._month()
        start = timezone.make_aware(datetime(year, month, 1))
        if month == 12:
            end = timezone.make_aware(datetime(year + 1, 1, 1))
        else:
            end = timezone.make_aware(datetime(year, month + 1, 1))
        return (
            super()
            .get_queryset()
            .filter(due_at__gte=start, due_at__lt=end, kind__in=[Task.Kind.CALL, Task.Kind.MEETING])
        )

    def _month(self):
        today = timezone.localdate()
        try:
            year = int(self.request.GET.get("year", today.year))
            month = int(self.request.GET.get("month", today.month))
            datetime(year, month, 1)
        except ValueError:
            year, month = today.year, today.month
        return year, month

    def get_context_data(self, **kwargs):
        ctx = super().get_context_data(**kwargs)
        year, month = self._month()
        weeks = calendar.Calendar(0).monthdatescalendar(year, month)
        by_day = {}
        for task in ctx["tasks"]:
            by_day.setdefault(timezone.localtime(task.due_at).date(), []).append(task)
        ctx["weeks"] = weeks
        ctx["by_day"] = by_day
        ctx["year"] = year
        ctx["month"] = month
        ctx["month_name"] = calendar.month_name[month]
        ctx["today"] = timezone.localdate()
        prev_month = month - 1 or 12
        prev_year = year if month > 1 else year - 1
        next_month = month + 1 if month < 12 else 1
        next_year = year if month < 12 else year + 1
        ctx["prev"] = {"year": prev_year, "month": prev_month}
        ctx["next"] = {"year": next_year, "month": next_month}
        return ctx
