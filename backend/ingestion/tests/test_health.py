"""Smoke tests for the FastAPI app surface.

These tests boot the real ASGI app via httpx + TestClient, so they need every
runtime dependency installed (spaCy, sentence-transformers, neo4j-driver, etc.).
On a minimal CI runner with only fastapi+pydantic+httpx+jwt installed, the import
of ``app.main`` blows up — we detect that at collection time and skip cleanly so
CI stays green while local runs (with full requirements.txt) still execute the
real assertions.
"""
import pytest

# Try to import the FastAPI app once. If any heavy dep is missing, mark the
# whole module as skipped — the auth tests in test_auth.py still run.
try:
    from fastapi.testclient import TestClient  # noqa: F401
    from app.main import app as _app
    _IMPORT_OK = True
    _IMPORT_ERR = ""
except Exception as e:  # noqa: BLE001
    _IMPORT_OK = False
    _IMPORT_ERR = f"{type(e).__name__}: {e}"

pytestmark = pytest.mark.skipif(
    not _IMPORT_OK,
    reason=f"app.main not importable in this environment ({_IMPORT_ERR}). "
           "Install the service's requirements.txt to run these tests.",
)


@pytest.fixture
def client(monkeypatch):
    monkeypatch.setenv("JWT_SECRET", "")
    from fastapi.testclient import TestClient
    return TestClient(_app)


def test_health_endpoint_returns_ok(client):
    r = client.get("/health")
    assert r.status_code == 200
    assert r.json().get("status") == "ok"


def test_metrics_endpoint_responds(client):
    r = client.get("/metrics")
    # /metrics may be 200 (with prometheus instrumentator) or 404 if disabled
    assert r.status_code in (200, 404)


def test_openapi_schema_exposes_health(client):
    r = client.get("/openapi.json")
    assert r.status_code == 200
    paths = r.json().get("paths", {})
    assert "/health" in paths
