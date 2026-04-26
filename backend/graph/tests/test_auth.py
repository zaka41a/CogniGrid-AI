"""Smoke tests for the JWT helper — runs without DB / network dependencies."""
import os
import jwt
from unittest.mock import MagicMock


def _request_with(token: str | None):
    """Build a stand-in fastapi.Request with just headers populated."""
    req = MagicMock()
    req.headers = {"Authorization": f"Bearer {token}"} if token else {}
    return req


def test_no_secret_falls_back_to_no_verify(monkeypatch):
    """When JWT_SECRET isn't set, the helper still extracts `sub` (dev mode)."""
    monkeypatch.delenv("JWT_SECRET", raising=False)
    # Re-import to pick up the changed env
    import importlib
    import app.api.auth as auth_mod
    importlib.reload(auth_mod)

    token = jwt.encode({"sub": "user@x.com"}, "any-key", algorithm="HS256")
    assert auth_mod.get_user_id(_request_with(token)) == "user@x.com"


def test_with_secret_verifies_signature(monkeypatch):
    """Tokens signed with the configured secret are accepted."""
    monkeypatch.setenv("JWT_SECRET", "my-secret-key-of-sufficient-length-12345")
    import importlib
    import app.api.auth as auth_mod
    importlib.reload(auth_mod)

    token = jwt.encode({"sub": "alice@x.com"}, "my-secret-key-of-sufficient-length-12345", algorithm="HS256")
    assert auth_mod.get_user_id(_request_with(token)) == "alice@x.com"


def test_with_secret_rejects_forged_signature(monkeypatch):
    """Tokens signed with a different key are rejected when verification is on."""
    monkeypatch.setenv("JWT_SECRET", "real-secret-12345-padding-padding")
    import importlib
    import app.api.auth as auth_mod
    importlib.reload(auth_mod)

    forged = jwt.encode({"sub": "attacker@x.com"}, "wrong-key", algorithm="HS256")
    assert auth_mod.get_user_id(_request_with(forged)) is None


def test_missing_authorization_header_returns_none():
    import app.api.auth as auth_mod
    assert auth_mod.get_user_id(_request_with(None)) is None


def test_malformed_token_returns_none():
    import app.api.auth as auth_mod
    req = MagicMock()
    req.headers = {"Authorization": "Bearer not.a.jwt"}
    assert auth_mod.get_user_id(req) is None
