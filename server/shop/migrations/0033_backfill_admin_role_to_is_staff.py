from django.db import migrations


def backfill_admin_role_to_is_staff(apps, schema_editor):
    User = apps.get_model("shop", "User")
    User.objects.filter(role="admin", is_staff=False).update(is_staff=True)


def noop_reverse(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ("shop", "0032_alter_arexperience_storage_fields"),
    ]

    operations = [
        migrations.RunPython(backfill_admin_role_to_is_staff, noop_reverse),
    ]
