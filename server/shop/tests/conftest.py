import pytest
from django.core.cache import cache


@pytest.fixture(autouse=True)
def _isolate_cache():
    """Clear the cache around every test so shared state (e.g. DRF throttle
    counters, which live in the default LocMem cache) never leaks between tests."""
    cache.clear()
    yield
    cache.clear()
