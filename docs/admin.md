# CogniGrid AI . Admin Console

The Admin Console is gated by the `ADMIN` role (enforced both by the React `AdminRoute`
component and by `@PreAuthorize("hasRole('ADMIN')")` on every `/api/admin/**` endpoint).

## Default account

A default administrator is auto-seeded by the gateway on first start:

| Email | Password | Role |
|---|---|---|
| `admin@gmail.com` | `admin4321` | `ADMIN` |

**Change the password immediately** via *Admin Console → ⋯ → Reset password* (the action revokes existing refresh tokens).

The seed is idempotent: if the account already exists at startup, the bootstrap leaves it alone unless `admin.bootstrap.force-reset=true` is set.

## Capabilities

| Section | Path | What it does |
|---|---|---|
| Overview | `/app/admin` | KPIs (total / active / suspended / admins), per-role distribution |
| Users | `/app/admin` | List all accounts, filter by role / status, search by name / email |
| User detail | (modal) | Full record: id, email, name, role, last_login, created_at, updated_at |
| Reset password | (modal) | Admin-only password reset, revokes refresh tokens |
| Suspend / Activate | (row action) | Disables login + revokes tokens for that user |
| Role change | (inline select) | ADMIN ↔ ANALYST ↔ VIEWER |
| Delete | (row action, confirm modal) | Permanent — refresh tokens removed first |
| Activity Log | `/app/admin?tab=activity` | Audit trail (logins, password resets, role changes, deletes) |

## Self-protection

The console blocks the following actions on the *current* admin's own account:

- Cannot delete yourself (returns 400 `"You cannot delete your own admin account"`).
- Cannot suspend yourself (button disabled, returns 400 if forced).
- Cannot demote your own role (the `<select>` is disabled when `email == currentUser.email`).

This guarantees there is always at least one functional admin in the system.

## Activity Log

Every admin action and every login event is recorded with:

```
id          UUID
user_id     who performed the action (or "anonymous" for failed logins)
target_id   on whom (nullable)
type        LOGIN_OK, LOGIN_FAIL, PASSWORD_RESET, ROLE_CHANGE, SUSPEND, ACTIVATE, DELETE_USER
detail      free-form context (e.g. "demoted ADMIN→ANALYST")
ip_address  request originator
created_at  timestamp
```

Records are kept indefinitely; rotate with a Postgres job if needed.
