from django.db import migrations


def backfill_staff_role_display(apps, schema_editor):
    User = apps.get_model("shop", "User")
    User.objects.filter(is_staff=True, role="user").update(role="admin")


def noop_reverse(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ("shop", "0033_backfill_admin_role_to_is_staff"),
    ]

    operations = [
        migrations.RunPython(backfill_staff_role_display, noop_reverse),
    ]
