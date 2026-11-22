-- ============================================================
-- CFO login for Matheesha Ranasinghe (matheesha@aisca.lk)
--
-- Use this if you cannot run scripts/create-cfo-account.mjs.
-- 1. Supabase > Authentication > Users > Add user > Create new user
--      Email: matheesha@aisca.lk   Password: (choose one)   Auto Confirm User: ON
-- 2. Then run this in the SQL editor. Safe to re-run.
-- ============================================================

-- Permissions row (the server checks this table, not the browser)
UPDATE admin_users SET name = 'Matheesha Ranasinghe', role = 'cfo'
WHERE lower(email) = 'matheesha@aisca.lk';

INSERT INTO admin_users (email, name, role)
SELECT 'matheesha@aisca.lk', 'Matheesha Ranasinghe', 'cfo'
WHERE NOT EXISTS (SELECT 1 FROM admin_users WHERE lower(email) = 'matheesha@aisca.lk');

-- Name and role for the dashboard menu
UPDATE auth.users
SET raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb) || '{"name": "Matheesha Ranasinghe", "role": "cfo"}'::jsonb
WHERE lower(email) = 'matheesha@aisca.lk';

-- Check: should show one row with role cfo
SELECT a.email, a.role, u.raw_user_meta_data->>'role' AS menu_role, u.email_confirmed_at IS NOT NULL AS confirmed
FROM admin_users a LEFT JOIN auth.users u ON lower(u.email) = lower(a.email)
WHERE lower(a.email) = 'matheesha@aisca.lk';
