from django.contrib import admin

from .models import Deal, DealStageHistory


class DealStageHistoryInline(admin.TabularInline):
    model = DealStageHistory
    extra = 0
    readonly_fields = ("from_stage", "to_stage", "changed_by", "changed_at")


@admin.register(Deal)
class DealAdmin(admin.ModelAdmin):
    list_display = ("title", "stage", "value", "probability", "owner", "expected_close_date")
    list_filter = ("stage",)
    inlines = [DealStageHistoryInline]
