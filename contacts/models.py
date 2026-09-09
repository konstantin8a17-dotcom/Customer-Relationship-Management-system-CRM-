from django.conf import settings
from django.db import models
from django.urls import reverse


class Company(models.Model):
    name = models.CharField("име", max_length=180)
    industry = models.CharField("индустрия", max_length=120, blank=True)
    website = models.URLField("уебсайт", blank=True)
    address = models.CharField("адрес", max_length=255, blank=True)
    notes = models.TextField("бележки", blank=True)
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        verbose_name="представител",
        on_delete=models.PROTECT,
        related_name="companies",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["name"]
        verbose_name = "компания"
        verbose_name_plural = "компании"

    def __str__(self):
        return self.name

    def get_absolute_url(self):
        return reverse("company_detail", args=[self.pk])


class Contact(models.Model):
    first_name = models.CharField("име", max_length=80)
    last_name = models.CharField("фамилия", max_length=80)
    email = models.EmailField("имейл")
    phone = models.CharField("телефон", max_length=40, blank=True)
    position = models.CharField("длъжност", max_length=120, blank=True)
    company = models.ForeignKey(
        Company,
        verbose_name="компания",
        on_delete=models.PROTECT,
        related_name="contacts",
    )
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        verbose_name="представител",
        on_delete=models.PROTECT,
        related_name="contacts",
    )
    notes = models.TextField("бележки", blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["last_name", "first_name"]
        verbose_name = "контакт"
        verbose_name_plural = "контакти"

    def __str__(self):
        return self.full_name

    @property
    def full_name(self):
        return f"{self.first_name} {self.last_name}".strip()

    def get_absolute_url(self):
        return reverse("contact_detail", args=[self.pk])


class Communication(models.Model):
    class Kind(models.TextChoices):
        CALL = "call", "Обаждане"
        EMAIL = "email", "Имейл"
        MEETING = "meeting", "Среща"
        NOTE = "note", "Бележка"

    contact = models.ForeignKey(Contact, on_delete=models.CASCADE, related_name="communications")
    kind = models.CharField("тип", max_length=20, choices=Kind.choices, default=Kind.NOTE)
    subject = models.CharField("тема", max_length=180)
    body = models.TextField("съдържание")
    occurred_at = models.DateTimeField("дата")
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="communications")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-occurred_at"]
        verbose_name = "комуникация"
        verbose_name_plural = "комуникации"

    def __str__(self):
        return f"{self.get_kind_display()}: {self.subject}"
