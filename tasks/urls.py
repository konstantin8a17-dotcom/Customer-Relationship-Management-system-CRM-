from django.urls import path

from . import views

urlpatterns = [
    path("", views.TaskListView.as_view(), name="task_list"),
    path("calendar/", views.CalendarView.as_view(), name="task_calendar"),
    path("new/", views.TaskCreateView.as_view(), name="task_create"),
    path("<int:pk>/edit/", views.TaskUpdateView.as_view(), name="task_update"),
    path("<int:pk>/complete/", views.TaskCompleteView.as_view(), name="task_complete"),
]
