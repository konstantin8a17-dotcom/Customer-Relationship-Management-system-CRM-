from django.conf import settings
from django.db import models
from django.db.models.signals import post_save
from django.dispatch import receiver


class Profile(models.Model):
    class Role(models.TextChoices):
        ADMIN = "admin", "Администратор"
        SALES_REP = "sales_rep", "Търговски представител"

    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="profile")
    role = models.CharField(max_length=20, choices=Role.choices, default=Role.SALES_REP)
    phone = models.CharField("телефон", max_length=40, blank=True)

    class Meta:
        verbose_name = "профил"
        verbose_name_plural = "профили"

    def __str__(self):
        return f"{self.user.get_full_name() or self.user.username} ({self.get_role_display()})"

    @property
    def is_admin(self):
        return self.role == self.Role.ADMIN or self.user.is_superuser

    @property
    def is_sales_rep(self):
        return self.role == self.Role.SALES_REP


@receiver(post_save, sender=settings.AUTH_USER_MODEL)
def create_user_profile(sender, instance, created, **kwargs):
    if created:
        role = Profile.Role.ADMIN if instance.is_superuser else Profile.Role.SALES_REP
        Profile.objects.create(user=instance, role=role)
    else:
        Profile.objects.get_or_create(user=instance)
