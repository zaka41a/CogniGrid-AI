"""Extract user identity from Authorization header (no signature verification needed — gateway validated it)."""
from fastapi import Request
import jwt


def get_user_id(request: Request) -> str | None:
    auth = request.headers.get("Authorization", "")
    if not auth.startswith("Bearer "):
        return None
    token = auth.removeprefix("Bearer ").strip()
    try:
        payload = jwt.decode(token, options={"verify_signature": False}, algorithms=["HS256"])
        return payload.get("sub")
    except Exception:
        return None
