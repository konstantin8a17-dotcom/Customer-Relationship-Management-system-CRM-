from django.utils import timezone

from .permissions import get_profile, is_admin


def crm_user(request):
    if not request.user.is_authenticated:
        return {"crm_profile": None, "is_crm_admin": False, "due_tasks_count": 0}

    from tasks.models import Task

    qs = Task.objects.filter(completed=False, due_at__date__lte=timezone.localdate())
    if not is_admin(request.user):
        qs = qs.filter(owner=request.user)
    return {
        "crm_profile": get_profile(request.user),
        "is_crm_admin": is_admin(request.user),
        "due_tasks_count": qs.count(),
    }
