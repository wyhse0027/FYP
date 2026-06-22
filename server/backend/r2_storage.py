"""Migration-compatibility shim.

Retained ONLY because the historical migration ``shop/0031`` imports
``backend.r2_storage.R2Storage`` in its field definitions. The project no longer
uses Cloudflare R2 — runtime media is served from Google Cloud Storage (see
``STORAGES`` in ``settings.py``). This class is never used for live storage and
must not depend on any R2/AWS settings, so a fresh ``migrate`` can replay 0031
without legacy configuration present.
"""
from storages.backends.s3 import S3Storage


class R2Storage(S3Storage):
    default_acl = None
    querystring_auth = False
    file_overwrite = False
