-- V1: Users and Roles tables

CREATE TYPE user_role AS ENUM ('ADMIN', 'ANALYST', 'VIEWER');

CREATE TABLE users (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email         VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    full_name     VARCHAR(255),
    role          user_role    NOT NULL DEFAULT 'ANALYST',
    is_active     BOOLEAN      NOT NULL DEFAULT true,
    last_login_at TIMESTAMP,
    created_at    TIMESTAMP    NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMP    NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_email    ON users(email);
CREATE INDEX idx_users_role     ON users(role);
CREATE INDEX idx_users_active   ON users(is_active);

-- Default admin user (password: Admin@2024 — change immediately in production)
INSERT INTO users (email, password_hash, full_name, role)
VALUES (
    'admin@cognigrid.ai',
    '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4J/HS.iK2.',
    'Admin',
    'ADMIN'
);
