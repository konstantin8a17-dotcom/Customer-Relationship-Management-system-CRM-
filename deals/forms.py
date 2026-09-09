from django import forms
from django.utils import timezone

from accounts.permissions import is_admin
from contacts.forms import style_form
from .models import Deal


class DealForm(forms.ModelForm):
    class Meta:
        model = Deal
        fields = (
            "title",
            "contact",
            "stage",
            "value",
            "probability",
            "expected_close_date",
            "closed_at",
            "notes",
            "owner",
        )
        widgets = {
            "expected_close_date": forms.DateInput(attrs={"type": "date"}),
            "closed_at": forms.DateInput(attrs={"type": "date"}),
        }

    def __init__(self, *args, user=None, contacts=None, **kwargs):
        self.user = user
        super().__init__(*args, **kwargs)
        style_form(self)
        if contacts is not None:
            self.fields["contact"].queryset = contacts
        if not is_admin(user):
            self.fields.pop("owner", None)

    def clean(self):
        cleaned = super().clean()
        stage = cleaned.get("stage")
        contact = cleaned.get("contact")
        previous_stage = None
        if self.instance.pk:
            previous_stage = Deal.objects.filter(pk=self.instance.pk).values_list("stage", flat=True).first()

        if contact:
            self.instance.company = contact.company
        if not is_admin(self.user):
            self.instance.owner = self.user

        self.instance.stage = stage or self.instance.stage
        self.instance.probability = cleaned.get("probability", self.instance.probability)
        self.instance.closed_at = cleaned.get("closed_at")
        self.instance.apply_stage_defaults(previous_stage)
        cleaned["probability"] = self.instance.probability
        cleaned["closed_at"] = self.instance.closed_at
        self.previous_stage = previous_stage
        return cleaned

    def save(self, commit=True):
        obj = super().save(commit=False)
        if not is_admin(self.user):
            obj.owner = self.user
        if obj.contact_id:
            obj.company = obj.contact.company
        previous_stage = getattr(self, "previous_stage", None)
        obj.apply_stage_defaults(previous_stage)
        if commit:
            obj.save()
            obj.record_stage_change(self.user, previous_stage)
        return obj
