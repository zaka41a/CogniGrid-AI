"""
JWT helper for the Agent service — verify signature and forward bearer tokens.

The agent makes downstream HTTP calls to graph/graphrag/etc. on behalf of the
user, so it needs both:
  - get_user_id(request)     — read the verified `sub` claim
  - get_auth_header(request) — return the raw Authorization header so we can
                               forward it to internal services
"""
import logging
import os
from fastapi import Request
import jwt

logger = logging.getLogger(__name__)

JWT_SECRET = os.getenv("JWT_SECRET", "").strip()

if not JWT_SECRET:
    logger.warning(
        "[auth] JWT_SECRET is not set — running in INSECURE no-verify mode. "
        "Set JWT_SECRET in .env to match the gateway for production safety."
    )


def _decode(token: str) -> dict | None:
    try:
        if JWT_SECRET:
            return jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
        return jwt.decode(token, options={"verify_signature": False}, algorithms=["HS256"])
    except jwt.ExpiredSignatureError:
        logger.info("[auth] token rejected: expired")
        return None
    except jwt.InvalidSignatureError:
        logger.warning("[auth] token rejected: invalid signature")
        return None
    except jwt.InvalidTokenError as e:
        logger.info("[auth] token rejected: %s", e)
        return None
    except Exception as e:  # noqa: BLE001
        logger.warning("[auth] unexpected decode error: %s", e)
        return None


def get_user_id(request: Request) -> str | None:
    auth = request.headers.get("Authorization", "")
    if not auth.startswith("Bearer "):
        return None
    payload = _decode(auth.removeprefix("Bearer ").strip())
    return payload.get("sub") if payload else None


def get_auth_header(request: Request) -> str | None:
    """Return the raw Authorization header so we can forward it downstream.

    We DON'T re-validate here — `get_user_id` was responsible for that. We just
    pass through whatever the client sent so internal services can do their own
    verification on receipt.
    """
    auth = request.headers.get("Authorization", "")
    return auth or None
