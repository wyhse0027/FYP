from django.conf import settings
from storages.backends.s3 import S3Storage

class R2Storage(S3Storage):
    default_acl = None
    querystring_auth = False
    file_overwrite = False

    # IMPORTANT: generate browser-friendly public URLs
    custom_domain = settings.AWS_S3_CUSTOM_DOMAIN or None
