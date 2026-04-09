-- V3: Convert user_role enum to VARCHAR for Hibernate 6 compatibility.
-- Only runs ALTER if column is still a user-defined type; CASCADE drops any dependents.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users'
      AND column_name = 'role'
      AND data_type = 'USER-DEFINED'
  ) THEN
    ALTER TABLE users ALTER COLUMN role TYPE VARCHAR(50) USING role::VARCHAR;
  END IF;
END$$;

DROP TYPE IF EXISTS user_role CASCADE;
