from django.contrib import admin

from .models import Task


@admin.register(Task)
class TaskAdmin(admin.ModelAdmin):
    list_display = ("title", "kind", "due_at", "owner", "completed")
    list_filter = ("kind", "completed")
