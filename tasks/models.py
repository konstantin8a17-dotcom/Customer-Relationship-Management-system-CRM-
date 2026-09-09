from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models
from django.urls import reverse

from contacts.models import Contact
from deals.models import Deal


class Task(models.Model):
    class Kind(models.TextChoices):
        CALL = "call", "Обаждане"
        MEETING = "meeting", "Среща"
        FOLLOW_UP = "follow_up", "Последващо действие"
        OTHER = "other", "Друго"

    title = models.CharField("заглавие", max_length=180)
    description = models.TextField("описание", blank=True)
    kind = models.CharField("тип", max_length=20, choices=Kind.choices, default=Kind.FOLLOW_UP)
    due_at = models.DateTimeField("срок")
    reminder_at = models.DateTimeField("напомняне", null=True, blank=True)
    completed = models.BooleanField("изпълнена", default=False)
    contact = models.ForeignKey(
        Contact,
        verbose_name="контакт",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="tasks",
    )
    deal = models.ForeignKey(
        Deal,
        verbose_name="сделка",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="tasks",
    )
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        verbose_name="представител",
        on_delete=models.PROTECT,
        related_name="tasks",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["completed", "due_at"]
        verbose_name = "задача"
        verbose_name_plural = "задачи"

    def __str__(self):
        return self.title

    def get_absolute_url(self):
        return reverse("task_list")

    def clean(self):
        if not self.contact_id and not self.deal_id:
            raise ValidationError("Задачата трябва да е свързана с контакт или сделка.")
        if self.reminder_at and self.due_at and self.reminder_at > self.due_at:
            raise ValidationError({"reminder_at": "Напомнянето не може да е след срока."})
        if self.deal_id and self.contact_id and self.deal.contact_id != self.contact_id:
            raise ValidationError("Контактът трябва да съвпада с контакта по сделката.")
