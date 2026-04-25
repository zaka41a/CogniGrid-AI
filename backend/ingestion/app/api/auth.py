"""
JWT helper — extract user identity from Authorization header.
Decodes the token without signature verification (the gateway already validated it).
The `sub` claim holds the user's email/username.
"""
from fastapi import Request
import jwt


def get_user_id(request: Request) -> str | None:
    """Return the user's email (sub claim) from the Bearer token, or None."""
    auth = request.headers.get("Authorization", "")
    if not auth.startswith("Bearer "):
        return None
    token = auth.removeprefix("Bearer ").strip()
    try:
        payload = jwt.decode(token, options={"verify_signature": False}, algorithms=["HS256"])
        return payload.get("sub")
    except Exception:
        return None
