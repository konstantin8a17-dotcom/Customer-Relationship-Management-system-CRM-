from django import forms

from accounts.permissions import is_admin
from contacts.forms import style_form
from .models import Task


class TaskForm(forms.ModelForm):
    class Meta:
        model = Task
        fields = (
            "title",
            "kind",
            "due_at",
            "reminder_at",
            "contact",
            "deal",
            "description",
            "completed",
            "owner",
        )
        widgets = {
            "due_at": forms.DateTimeInput(attrs={"type": "datetime-local"}, format="%Y-%m-%dT%H:%M"),
            "reminder_at": forms.DateTimeInput(attrs={"type": "datetime-local"}, format="%Y-%m-%dT%H:%M"),
        }

    def __init__(self, *args, user=None, contacts=None, deals=None, **kwargs):
        self.user = user
        super().__init__(*args, **kwargs)
        style_form(self)
        self.fields["due_at"].input_formats = ["%Y-%m-%dT%H:%M", "%Y-%m-%d %H:%M:%S"]
        self.fields["reminder_at"].input_formats = ["%Y-%m-%dT%H:%M", "%Y-%m-%d %H:%M:%S"]
        if contacts is not None:
            self.fields["contact"].queryset = contacts
        if deals is not None:
            self.fields["deal"].queryset = deals
        if not is_admin(user):
            self.fields.pop("owner", None)

    def save(self, commit=True):
        obj = super().save(commit=False)
        if not is_admin(self.user):
            obj.owner = self.user
        if obj.deal_id and not obj.contact_id:
            obj.contact = obj.deal.contact
        if commit:
            obj.save()
        return obj
