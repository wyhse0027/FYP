from django.db.models.fields.files import FileField
from shop.models import ARExperience


def test_production_default_storage_is_gcs():
    from backend import settings as production_settings

    backend = production_settings.STORAGES["default"]["BACKEND"]
    assert backend == "storages.backends.gcloud.GoogleCloudStorage"
    assert production_settings.STORAGES["default"]["OPTIONS"]["querystring_auth"] is False


def test_ar_file_fields_do_not_bind_legacy_storage_classes():
    for name in ("marker_image", "marker_mind", "model_glb", "app_download_file"):
        field = ARExperience._meta.get_field(name)
        _name, _path, _args, kwargs = field.deconstruct()
        assert isinstance(field, FileField)
        assert "storage" not in kwargs
