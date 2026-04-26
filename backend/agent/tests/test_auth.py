"""Smoke tests for the Agent's JWT helpers (incl. get_auth_header)."""
import jwt
from unittest.mock import MagicMock


def _request_with(authz):
    req = MagicMock()
    req.headers = {"Authorization": authz} if authz else {}
    return req


def test_no_secret_falls_back_to_no_verify(monkeypatch):
    monkeypatch.delenv("JWT_SECRET", raising=False)
    import importlib
    import app.api.auth as auth_mod
    importlib.reload(auth_mod)

    token = jwt.encode({"sub": "user@x.com"}, "any-key", algorithm="HS256")
    assert auth_mod.get_user_id(_request_with(f"Bearer {token}")) == "user@x.com"


def test_with_secret_verifies_signature(monkeypatch):
    monkeypatch.setenv("JWT_SECRET", "my-secret-key-of-sufficient-length-12345")
    import importlib
    import app.api.auth as auth_mod
    importlib.reload(auth_mod)

    token = jwt.encode({"sub": "alice@x.com"}, "my-secret-key-of-sufficient-length-12345", algorithm="HS256")
    assert auth_mod.get_user_id(_request_with(f"Bearer {token}")) == "alice@x.com"


def test_forged_token_rejected(monkeypatch):
    monkeypatch.setenv("JWT_SECRET", "real-secret-12345-padding-padding")
    import importlib
    import app.api.auth as auth_mod
    importlib.reload(auth_mod)

    forged = jwt.encode({"sub": "attacker@x.com"}, "wrong-key", algorithm="HS256")
    assert auth_mod.get_user_id(_request_with(f"Bearer {forged}")) is None


def test_get_auth_header_returns_raw():
    """The agent forwards the bearer token unchanged to downstream services."""
    import app.api.auth as auth_mod
    raw = "Bearer some.jwt.token"
    assert auth_mod.get_auth_header(_request_with(raw)) == raw


def test_get_auth_header_returns_none_when_missing():
    import app.api.auth as auth_mod
    assert auth_mod.get_auth_header(_request_with(None)) is None
