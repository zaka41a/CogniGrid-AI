-- V4: Audit log of admin / auth actions
-- Captured: login success/fail, password reset (self + admin), role change, suspend, activate, delete.
-- Records are kept indefinitely; rotate with a Postgres job if storage becomes a concern.

CREATE TABLE activity_events (
    id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_email VARCHAR(255) NOT NULL,        -- who did the action ('anonymous' for failed logins)
    target_id   UUID         NULL,            -- on whom (nullable for self-actions)
    target_email VARCHAR(255) NULL,           -- denormalised for display when target is later deleted
    type        VARCHAR(64)  NOT NULL,        -- LOGIN_OK, LOGIN_FAIL, PASSWORD_RESET, ROLE_CHANGE, SUSPEND, ACTIVATE, DELETE_USER, etc.
    detail      VARCHAR(1024) NULL,           -- free-form context (e.g. 'demoted ADMIN→ANALYST')
    ip_address  VARCHAR(64)  NULL,
    created_at  TIMESTAMP    NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_activity_actor    ON activity_events(actor_email);
CREATE INDEX idx_activity_target   ON activity_events(target_id);
CREATE INDEX idx_activity_type     ON activity_events(type);
CREATE INDEX idx_activity_created  ON activity_events(created_at DESC);
