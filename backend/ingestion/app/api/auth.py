"""
JWT helper — verify signature against JWT_SECRET and extract user identity.

Behavior:
- If JWT_SECRET is set, verify HS256 signature. Reject any token whose signature
  does not match — this prevents anyone bypassing the gateway and forging tokens
  by hitting the service port directly.
- If JWT_SECRET is NOT set, fall back to no-signature-verification mode and log
  a single startup warning. Useful only for local development where the JWT
  secret may not be aligned across services.
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
    """Decode a token, verifying signature when JWT_SECRET is configured."""
    try:
        if JWT_SECRET:
            return jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
        return jwt.decode(token, options={"verify_signature": False}, algorithms=["HS256"])
    except jwt.ExpiredSignatureError:
        logger.info("[auth] token rejected: expired")
        return None
    except jwt.InvalidSignatureError:
        logger.warning("[auth] token rejected: invalid signature (possible forgery attempt)")
        return None
    except jwt.InvalidTokenError as e:
        logger.info("[auth] token rejected: %s", e)
        return None
    except Exception as e:  # noqa: BLE001
        logger.warning("[auth] unexpected token decode error: %s", e)
        return None


def get_user_id(request: Request) -> str | None:
    """Return the user's email (sub claim) from the Bearer token, or None."""
    auth = request.headers.get("Authorization", "")
    if not auth.startswith("Bearer "):
        return None
    payload = _decode(auth.removeprefix("Bearer ").strip())
    return payload.get("sub") if payload else None
