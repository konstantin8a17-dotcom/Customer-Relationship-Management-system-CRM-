from django import forms

from accounts.permissions import is_admin
from .models import Communication, Company, Contact


def style_form(form):
    for field in form.fields.values():
        if isinstance(field.widget, (forms.Select, forms.SelectMultiple)):
            field.widget.attrs.setdefault("class", "form-select")
        elif isinstance(field.widget, forms.CheckboxInput):
            field.widget.attrs.setdefault("class", "form-check-input")
        elif isinstance(field.widget, forms.Textarea):
            field.widget.attrs.setdefault("class", "form-control")
            field.widget.attrs.setdefault("rows", 3)
        else:
            field.widget.attrs.setdefault("class", "form-control")
    return form


class OwnerScopedFormMixin:
    def __init__(self, *args, user=None, **kwargs):
        self.user = user
        super().__init__(*args, **kwargs)
        style_form(self)
        if not is_admin(user):
            self.fields.pop("owner", None)


class CompanyForm(OwnerScopedFormMixin, forms.ModelForm):
    class Meta:
        model = Company
        fields = ("name", "industry", "website", "address", "notes", "owner")

    def save(self, commit=True):
        obj = super().save(commit=False)
        if not is_admin(self.user):
            obj.owner = self.user
        if commit:
            obj.save()
        return obj


class ContactForm(OwnerScopedFormMixin, forms.ModelForm):
    class Meta:
        model = Contact
        fields = ("first_name", "last_name", "email", "phone", "position", "company", "notes", "owner")

    def __init__(self, *args, companies=None, **kwargs):
        super().__init__(*args, **kwargs)
        if companies is not None:
            self.fields["company"].queryset = companies

    def save(self, commit=True):
        obj = super().save(commit=False)
        if not is_admin(self.user):
            obj.owner = self.user
        if commit:
            obj.save()
        return obj


class CommunicationForm(forms.ModelForm):
    class Meta:
        model = Communication
        fields = ("kind", "subject", "body", "occurred_at")
        widgets = {
            "occurred_at": forms.DateTimeInput(attrs={"type": "datetime-local"}, format="%Y-%m-%dT%H:%M"),
        }

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        style_form(self)
        self.fields["occurred_at"].input_formats = ["%Y-%m-%dT%H:%M", "%Y-%m-%d %H:%M:%S"]
