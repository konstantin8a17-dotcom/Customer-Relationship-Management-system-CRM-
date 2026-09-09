from django import forms
from django.contrib.auth.forms import AuthenticationForm, UserCreationForm
from django.contrib.auth.models import User

from .models import Profile


class StyledAuthenticationForm(AuthenticationForm):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields["username"].widget.attrs.update({"class": "form-control", "placeholder": "Потребителско име"})
        self.fields["password"].widget.attrs.update({"class": "form-control", "placeholder": "Парола"})
        self.fields["username"].label = "Потребителско име"
        self.fields["password"].label = "Парола"


class SalesUserForm(UserCreationForm):
    first_name = forms.CharField(label="Име", max_length=150)
    last_name = forms.CharField(label="Фамилия", max_length=150)
    email = forms.EmailField(label="Имейл")
    role = forms.ChoiceField(label="Роля", choices=Profile.Role.choices)
    phone = forms.CharField(label="Телефон", max_length=40, required=False)

    class Meta:
        model = User
        fields = ("username", "first_name", "last_name", "email", "role", "phone", "password1", "password2")

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        for field in self.fields.values():
            css = "form-select" if isinstance(field.widget, forms.Select) else "form-control"
            field.widget.attrs.setdefault("class", css)

    def save(self, commit=True):
        user = super().save(commit=False)
        user.first_name = self.cleaned_data["first_name"]
        user.last_name = self.cleaned_data["last_name"]
        user.email = self.cleaned_data["email"]
        if commit:
            user.save()
            profile = user.profile
            profile.role = self.cleaned_data["role"]
            profile.phone = self.cleaned_data["phone"]
            profile.save()
        return user
