from decimal import Decimal

from django.conf import settings
from django.core.exceptions import ValidationError
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models
from django.urls import reverse
from django.utils import timezone

from contacts.models import Company, Contact


class Deal(models.Model):
    class Stage(models.TextChoices):
        NEW_LEAD = "new_lead", "Нов лийд"
        NEGOTIATION = "negotiation", "Преговори"
        CLOSED_WON = "closed_won", "Затворена — спечелена"
        CLOSED_LOST = "closed_lost", "Затворена — загубена"

    OPEN_STAGES = (Stage.NEW_LEAD, Stage.NEGOTIATION)
    CLOSED_STAGES = (Stage.CLOSED_WON, Stage.CLOSED_LOST)
    STAGE_ORDER = (Stage.NEW_LEAD, Stage.NEGOTIATION, Stage.CLOSED_WON, Stage.CLOSED_LOST)
    DEFAULT_PROBABILITY = {
        Stage.NEW_LEAD: 20,
        Stage.NEGOTIATION: 55,
        Stage.CLOSED_WON: 100,
        Stage.CLOSED_LOST: 0,
    }

    title = models.CharField("заглавие", max_length=180)
    contact = models.ForeignKey(Contact, verbose_name="контакт", on_delete=models.PROTECT, related_name="deals")
    company = models.ForeignKey(Company, verbose_name="компания", on_delete=models.PROTECT, related_name="deals")
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        verbose_name="представител",
        on_delete=models.PROTECT,
        related_name="deals",
    )
    stage = models.CharField("етап", max_length=20, choices=Stage.choices, default=Stage.NEW_LEAD)
    value = models.DecimalField(
        "прогнозна стойност (лв.)",
        max_digits=12,
        decimal_places=2,
        validators=[MinValueValidator(Decimal("0.01"))],
    )
    probability = models.PositiveSmallIntegerField(
        "вероятност за затваряне (%)",
        validators=[MinValueValidator(0), MaxValueValidator(100)],
        default=20,
    )
    expected_close_date = models.DateField("очаквана дата на затваряне")
    closed_at = models.DateField("дата на затваряне", null=True, blank=True)
    notes = models.TextField("бележки", blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-updated_at"]
        verbose_name = "сделка"
        verbose_name_plural = "сделки"

    def __str__(self):
        return self.title

    def get_absolute_url(self):
        return reverse("deal_detail", args=[self.pk])

    @property
    def weighted_value(self):
        return (self.value * Decimal(self.probability)) / Decimal(100)

    @property
    def is_closed(self):
        return self.stage in self.CLOSED_STAGES

    def clean(self):
        errors = {}
        if self.value is not None and self.value <= 0:
            errors["value"] = "Стойността на сделката трябва да е по-голяма от 0."
        if self.probability is not None and not 0 <= self.probability <= 100:
            errors["probability"] = "Вероятността трябва да е между 0 и 100."
        if self.stage == self.Stage.CLOSED_WON and self.probability != 100:
            errors["probability"] = "Спечелена сделка трябва да има 100% вероятност."
        if self.stage == self.Stage.CLOSED_LOST and self.probability != 0:
            errors["probability"] = "Загубена сделка трябва да има 0% вероятност."
        if self.stage in self.CLOSED_STAGES and not self.closed_at:
            errors["closed_at"] = "Посочете дата на затваряне за затворена сделка."
        if self.stage in self.OPEN_STAGES and self.closed_at:
            errors["closed_at"] = "Отворена сделка не може да има дата на затваряне."
        if self.contact_id and self.company_id and self.contact.company_id != self.company_id:
            errors["company"] = "Компанията трябва да съвпада с компанията на контакта."
        if errors:
            raise ValidationError(errors)

    def apply_stage_defaults(self, previous_stage=None):
        if previous_stage != self.stage or self.probability is None:
            if self.stage in self.DEFAULT_PROBABILITY and (
                previous_stage is None or self.probability in (None, self.DEFAULT_PROBABILITY.get(previous_stage))
            ):
                self.probability = self.DEFAULT_PROBABILITY[self.stage]
        if self.stage == self.Stage.CLOSED_WON:
            self.probability = 100
            self.closed_at = self.closed_at or timezone.localdate()
        elif self.stage == self.Stage.CLOSED_LOST:
            self.probability = 0
            self.closed_at = self.closed_at or timezone.localdate()
        else:
            self.closed_at = None

    def record_stage_change(self, user, previous_stage):
        if previous_stage == self.stage:
            return
        DealStageHistory.objects.create(
            deal=self,
            from_stage=previous_stage or "",
            to_stage=self.stage,
            changed_by=user,
        )


class DealStageHistory(models.Model):
    deal = models.ForeignKey(Deal, on_delete=models.CASCADE, related_name="stage_history")
    from_stage = models.CharField(max_length=20, blank=True)
    to_stage = models.CharField(max_length=20)
    changed_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT)
    changed_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["changed_at"]
        verbose_name = "история на етап"
        verbose_name_plural = "история на етапи"
