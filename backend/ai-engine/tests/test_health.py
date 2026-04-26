"""Smoke tests for the FastAPI app surface — uses TestClient, no DB needed."""
import pytest


@pytest.fixture
def client(monkeypatch):
    monkeypatch.setenv("JWT_SECRET", "")
    from fastapi.testclient import TestClient
    from app.main import app
    return TestClient(app)


def test_health_endpoint_returns_ok(client):
    r = client.get("/health")
    assert r.status_code == 200
    body = r.json()
    assert body["status"] == "ok"


def test_metrics_endpoint_responds(client):
    r = client.get("/metrics")
    assert r.status_code == 200
    assert b"# HELP" in r.content or b"# TYPE" in r.content


def test_openapi_schema_exposes_routes(client):
    r = client.get("/openapi.json")
    assert r.status_code == 200
    paths = r.json().get("paths", {})
    # Whatever routes are registered, at least /health must show up
    assert "/health" in paths
