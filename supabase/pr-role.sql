-- ============================================================
-- Public Relations admin role (pr@aisca.lk, Lehara Rajapakse)
-- Run this ONCE in the Supabase SQL editor, BEFORE
-- scripts/create-pr-account.mjs. Safe to re-run.
--
-- admin_users.role has a fixed CHECK list. Replace it with one that
-- also allows 'public_relations'. Every existing role stays allowed.
-- ============================================================
DO $$
DECLARE c record;
BEGIN
  FOR c IN
    SELECT conname FROM pg_constraint
    WHERE conrelid = 'admin_users'::regclass AND contype = 'c'
      AND pg_get_constraintdef(oid) ILIKE '%role%'
  LOOP
    EXECUTE format('ALTER TABLE admin_users DROP CONSTRAINT %I', c.conname);
  END LOOP;
  ALTER TABLE admin_users ADD CONSTRAINT admin_users_role_check CHECK (role IN (
    'chairman', 'deputy_chairman', 'cfo', 'marketing_manager', 'co_secretary',
    'administration_manager', 'public_relations', 'rangeela_oc', 'rangeela_cash'
  )) NOT VALID;  -- NOT VALID: never fails on any older rows already in the table
END $$;
