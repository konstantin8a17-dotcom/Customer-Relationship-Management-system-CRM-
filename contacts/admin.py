from django.contrib import admin

from .models import Communication, Company, Contact


@admin.register(Company)
class CompanyAdmin(admin.ModelAdmin):
    list_display = ("name", "industry", "owner")
    search_fields = ("name",)


@admin.register(Contact)
class ContactAdmin(admin.ModelAdmin):
    list_display = ("first_name", "last_name", "email", "company", "owner")
    search_fields = ("first_name", "last_name", "email")


@admin.register(Communication)
class CommunicationAdmin(admin.ModelAdmin):
    list_display = ("subject", "kind", "contact", "occurred_at")
