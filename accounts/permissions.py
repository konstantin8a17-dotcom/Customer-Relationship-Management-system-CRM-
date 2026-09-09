from django.contrib.auth.mixins import LoginRequiredMixin, UserPassesTestMixin
from django.core.exceptions import PermissionDenied

from .models import Profile


def get_profile(user):
    if not user.is_authenticated:
        return None
    profile, _ = Profile.objects.get_or_create(
        user=user,
        defaults={"role": Profile.Role.ADMIN if user.is_superuser else Profile.Role.SALES_REP},
    )
    if user.is_superuser and profile.role != Profile.Role.ADMIN:
        profile.role = Profile.Role.ADMIN
        profile.save(update_fields=["role"])
    return profile


def is_admin(user):
    profile = get_profile(user)
    return bool(profile and profile.is_admin)


def scoped_queryset(user, queryset, owner_field="owner"):
    if is_admin(user):
        return queryset
    return queryset.filter(**{owner_field: user})


def ensure_object_access(user, obj, owner_field="owner"):
    if is_admin(user):
        return
    owner = getattr(obj, owner_field, None)
    if owner != user:
        raise PermissionDenied("Нямате достъп до този запис.")


class AdminRequiredMixin(LoginRequiredMixin, UserPassesTestMixin):
    def test_func(self):
        return is_admin(self.request.user)
