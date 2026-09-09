from datetime import timedelta
from decimal import Decimal

from django.contrib.auth.models import User
from django.core.management.base import BaseCommand
from django.utils import timezone

from accounts.models import Profile
from contacts.models import Communication, Company, Contact
from deals.models import Deal
from tasks.models import Task


class Command(BaseCommand):
    help = "Създава демо потребители, контакти, сделки и задачи."

    def handle(self, *args, **options):
        admin = self._user(
            "admin",
            "Admin12345",
            first_name="Админ",
            last_name="Системов",
            email="admin@crm.local",
            role=Profile.Role.ADMIN,
            superuser=True,
        )
        ivan = self._user(
            "ivan",
            "Demo12345",
            first_name="Иван",
            last_name="Петров",
            email="ivan@crm.local",
            role=Profile.Role.SALES_REP,
        )
        maria = self._user(
            "maria",
            "Demo12345",
            first_name="Мария",
            last_name="Иванова",
            email="maria@crm.local",
            role=Profile.Role.SALES_REP,
        )

        today = timezone.localdate()
        now = timezone.now()

        acme = self._company("Аксес Софт ООД", "IT услуги", ivan, "https://access-soft.example", "София")
        riviera = self._company("Ривиера Хотели", "Туризъм", ivan, "", "Варна")
        nova = self._company("Нова Логистика АД", "Логистика", maria, "https://nova-log.example", "Пловдив")
        green = self._company("Грийн Енерджи ЕООД", "Енергетика", maria, "", "Бургас")

        c1 = self._contact("Георги", "Стоянов", "georgi@access.example", "Мениджър покупки", acme, ivan)
        c2 = self._contact("Елена", "Колева", "elena@riviera.example", "Директор", riviera, ivan)
        c3 = self._contact("Николай", "Димитров", "nikolay@nova.example", "Изпълнителен директор", nova, maria)
        c4 = self._contact("Петя", "Атанасова", "petya@green.example", "Търговски директор", green, maria)

        d1 = self._deal("Лицензи ERP", c1, ivan, Deal.Stage.NEW_LEAD, Decimal("18000"), today + timedelta(days=25))
        d2 = self._deal("CRM внедряване", c2, ivan, Deal.Stage.NEGOTIATION, Decimal("42000"), today + timedelta(days=12), 60)
        d3 = self._deal("Годишен договор хостинг", c1, ivan, Deal.Stage.CLOSED_WON, Decimal("9600"), today - timedelta(days=8), 100, today - timedelta(days=6))
        d4 = self._deal("WMS система", c3, maria, Deal.Stage.NEGOTIATION, Decimal("75000"), today + timedelta(days=20), 50)
        d5 = self._deal("Соларно офериране", c4, maria, Deal.Stage.NEW_LEAD, Decimal("31000"), today + timedelta(days=40))
        d6 = self._deal("Складова автоматизация", c3, maria, Deal.Stage.CLOSED_LOST, Decimal("22000"), today - timedelta(days=3), 0, today - timedelta(days=2))
        d7 = self._deal("Поддръжка 2026", c2, ivan, Deal.Stage.CLOSED_WON, Decimal("15400"), today - timedelta(days=20), 100, today - timedelta(days=18))

        self._comm(c1, ivan, Communication.Kind.CALL, "Първи разговор", "Обсъдихме нужда от ERP модули.", now - timedelta(days=4))
        self._comm(c2, ivan, Communication.Kind.MEETING, "Демо на продукта", "Показахме pipeline и отчети.", now - timedelta(days=2))
        self._comm(c3, maria, Communication.Kind.EMAIL, "Оферта WMS", "Изпратена оферта с 3 пакета.", now - timedelta(days=1))
        self._comm(c4, maria, Communication.Kind.NOTE, "Лид от изложение", "Срещнахме се на Green Expo.", now - timedelta(hours=8))

        self._task("Обаждане към Георги", Task.Kind.CALL, now + timedelta(days=1, hours=2), ivan, c1, d1)
        self._task("Среща в Ривиера", Task.Kind.MEETING, now + timedelta(days=3, hours=4), ivan, c2, d2)
        self._task("Последващ имейл за WMS", Task.Kind.FOLLOW_UP, now + timedelta(hours=6), maria, c3, d4)
        self._task("Презентация Green Energy", Task.Kind.MEETING, now + timedelta(days=5), maria, c4, d5)
        overdue = self._task("Просрочено напомняне", Task.Kind.CALL, now - timedelta(days=1), ivan, c1, d1)
        overdue.completed = False
        overdue.save()

        self.stdout.write(self.style.SUCCESS("Демо данните са готови."))
        self.stdout.write("Администратор: admin / Admin12345")
        self.stdout.write("Търговци: ivan / Demo12345  и  maria / Demo12345")

    def _user(self, username, password, first_name, last_name, email, role, superuser=False):
        user, created = User.objects.get_or_create(
            username=username,
            defaults={
                "first_name": first_name,
                "last_name": last_name,
                "email": email,
                "is_staff": superuser,
                "is_superuser": superuser,
            },
        )
        user.first_name = first_name
        user.last_name = last_name
        user.email = email
        user.is_staff = superuser
        user.is_superuser = superuser
        user.set_password(password)
        user.save()
        profile = user.profile
        profile.role = role
        profile.save(update_fields=["role"])
        return user

    def _company(self, name, industry, owner, website, address):
        obj, _ = Company.objects.get_or_create(name=name, defaults={"industry": industry, "owner": owner, "website": website, "address": address})
        return obj

    def _contact(self, first, last, email, position, company, owner):
        obj, _ = Contact.objects.get_or_create(
            email=email,
            defaults={
                "first_name": first,
                "last_name": last,
                "position": position,
                "company": company,
                "owner": owner,
            },
        )
        return obj

    def _deal(self, title, contact, owner, stage, value, expected, probability=None, closed_at=None):
        deal, created = Deal.objects.get_or_create(
            title=title,
            defaults={
                "contact": contact,
                "company": contact.company,
                "owner": owner,
                "stage": Deal.Stage.NEW_LEAD,
                "value": value,
                "probability": Deal.DEFAULT_PROBABILITY[Deal.Stage.NEW_LEAD],
                "expected_close_date": expected,
            },
        )
        if created:
            deal.record_stage_change(owner, "")
        previous = deal.stage
        deal.stage = stage
        deal.value = value
        deal.expected_close_date = expected
        deal.closed_at = closed_at
        deal.probability = probability if probability is not None else Deal.DEFAULT_PROBABILITY[stage]
        deal.apply_stage_defaults(previous)
        deal.save()
        deal.record_stage_change(owner, previous)
        return deal

    def _comm(self, contact, user, kind, subject, body, when):
        Communication.objects.get_or_create(
            contact=contact,
            subject=subject,
            defaults={"kind": kind, "body": body, "occurred_at": when, "created_by": user},
        )

    def _task(self, title, kind, due, owner, contact, deal):
        obj, _ = Task.objects.get_or_create(
            title=title,
            defaults={
                "kind": kind,
                "due_at": due,
                "reminder_at": due - timedelta(hours=2),
                "owner": owner,
                "contact": contact,
                "deal": deal,
            },
        )
        return obj
