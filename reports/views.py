import json
from datetime import timedelta
from decimal import Decimal

from django.contrib.auth.mixins import LoginRequiredMixin
from django.contrib.auth.models import User
from django.db.models import Count, Q, Sum
from django.db.models.functions import Coalesce, TruncMonth
from django.utils import timezone
from django.views.generic import TemplateView

from accounts.permissions import is_admin, scoped_queryset
from contacts.models import Contact
from deals.models import Deal, DealStageHistory
from tasks.models import Task


def _period(request):
    today = timezone.localdate()
    start_s = request.GET.get("from") or (today.replace(day=1)).isoformat()
    end_s = request.GET.get("to") or today.isoformat()
    try:
        start = timezone.datetime.fromisoformat(start_s).date()
        end = timezone.datetime.fromisoformat(end_s).date()
    except ValueError:
        start, end = today.replace(day=1), today
    return start, end


class DashboardView(LoginRequiredMixin, TemplateView):
    template_name = "reports/dashboard.html"

    def get_context_data(self, **kwargs):
        ctx = super().get_context_data(**kwargs)
        user = self.request.user
        deals = scoped_queryset(user, Deal.objects.all())
        tasks = scoped_queryset(user, Task.objects.all())
        contacts = scoped_queryset(user, Contact.objects.all())
        open_deals = deals.filter(stage__in=Deal.OPEN_STAGES)
        won = deals.filter(stage=Deal.Stage.CLOSED_WON)
        ctx.update(
            {
                "contact_count": contacts.count(),
                "open_count": open_deals.count(),
                "open_value": open_deals.aggregate(total=Sum("value"))["total"] or 0,
                "forecast": sum((d.weighted_value for d in open_deals), start=Decimal("0")),
                "won_value": won.aggregate(total=Sum("value"))["total"] or 0,
                "due_tasks": tasks.filter(completed=False, due_at__date__lte=timezone.localdate()).count(),
                "upcoming": tasks.filter(completed=False, due_at__gte=timezone.now()).order_by("due_at")[:6],
                "recent_deals": deals.order_by("-updated_at")[:6],
                "funnel_json": json.dumps(
                    {
                        "labels": [label for _, label in Deal.Stage.choices if _ != Deal.Stage.CLOSED_LOST],
                        "values": [
                            deals.filter(stage=Deal.Stage.NEW_LEAD).count(),
                            deals.filter(stage=Deal.Stage.NEGOTIATION).count(),
                            deals.filter(stage=Deal.Stage.CLOSED_WON).count(),
                        ],
                    }
                ),
            }
        )
        return ctx


class ReportsView(LoginRequiredMixin, TemplateView):
    template_name = "reports/reports.html"

    def get_context_data(self, **kwargs):
        ctx = super().get_context_data(**kwargs)
        user = self.request.user
        start, end = _period(self.request)
        deals = scoped_queryset(user, Deal.objects.select_related("owner")).filter(created_at__date__lte=end)
        created_in_period = deals.filter(created_at__date__gte=start, created_at__date__lte=end)
        total_leads = created_in_period.count() or deals.filter(created_at__date__gte=start).count()

        reached = {}
        for stage, _label in Deal.Stage.choices:
            reached[stage] = DealStageHistory.objects.filter(
                deal__in=created_in_period,
                to_stage=stage,
                changed_at__date__lte=end,
            ).values("deal").distinct().count()
        # Every new deal is a lead even without history row if created in that stage.
        reached[Deal.Stage.NEW_LEAD] = created_in_period.count()

        conversion_rows = []
        previous_count = reached[Deal.Stage.NEW_LEAD] or 0
        for stage, label in Deal.Stage.choices:
            count = reached[stage]
            rate = (count / previous_count * 100) if previous_count else 0
            from_leads = (count / reached[Deal.Stage.NEW_LEAD] * 100) if reached[Deal.Stage.NEW_LEAD] else 0
            conversion_rows.append(
                {"stage": stage, "label": label, "count": count, "rate": rate, "from_leads": from_leads}
            )
            if stage == Deal.Stage.NEW_LEAD:
                previous_count = count
            elif stage == Deal.Stage.NEGOTIATION:
                previous_count = count

        closed_won = created_in_period.filter(stage=Deal.Stage.CLOSED_WON)
        closed_lost = created_in_period.filter(stage=Deal.Stage.CLOSED_LOST)
        closed_total = closed_won.count() + closed_lost.count()
        win_rate = (closed_won.count() / closed_total * 100) if closed_total else 0

        sales_qs = scoped_queryset(user, Deal.objects.select_related("owner")).filter(
            stage=Deal.Stage.CLOSED_WON,
            closed_at__gte=start,
            closed_at__lte=end,
        )
        if not is_admin(user):
            sales_qs = sales_qs.filter(owner=user)

        by_rep = list(
            sales_qs.values("owner__id", "owner__first_name", "owner__last_name", "owner__username")
            .annotate(total=Sum("value"), deals=Count("id"))
            .order_by("-total")
        )
        for row in by_rep:
            name = f"{row['owner__first_name']} {row['owner__last_name']}".strip()
            row["name"] = name or row["owner__username"]

        monthly = list(
            sales_qs.annotate(month=TruncMonth("closed_at"))
            .values("month")
            .annotate(total=Sum("value"))
            .order_by("month")
        )

        ctx.update(
            {
                "start": start,
                "end": end,
                "conversion_rows": conversion_rows,
                "win_rate": win_rate,
                "closed_won_count": closed_won.count(),
                "closed_lost_count": closed_lost.count(),
                "won_value": sales_qs.aggregate(total=Sum("value"))["total"] or 0,
                "by_rep": by_rep,
                "conversion_json": json.dumps(
                    {
                        "labels": [r["label"] for r in conversion_rows],
                        "values": [r["count"] for r in conversion_rows],
                    }
                ),
                "sales_json": json.dumps(
                    {
                        "labels": [r["name"] for r in by_rep],
                        "values": [float(r["total"] or 0) for r in by_rep],
                    }
                ),
                "monthly_json": json.dumps(
                    {
                        "labels": [row["month"].strftime("%Y-%m") for row in monthly if row["month"]],
                        "values": [float(row["total"] or 0) for row in monthly],
                    }
                ),
            }
        )
        return ctx
