-- ============================================================
-- MEMORA '26 ticketing (aisca.lk/memora26 + admin.aisca.lk)
-- Run this ONCE in the Supabase SQL editor, BEFORE
-- scripts/create-memora-accounts.mjs. Safe to re-run.
-- ============================================================

-- 1. Allow the two MEMORA admin roles (every existing role stays allowed)
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
    'administration_manager', 'public_relations', 'rangeela_oc', 'rangeela_cash',
    'memora_oc', 'memora_cash'
  )) NOT VALID;
END $$;

-- 2. Tickets. One row = one person. Bank sales start as 'pending' and are
--    approved by hand; cash desk sales are approved straight away.
CREATE TABLE IF NOT EXISTS memora_tickets (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_number     text NOT NULL UNIQUE,
  full_name         text NOT NULL,
  email             text NOT NULL,
  whatsapp          text NOT NULL,
  school            text NOT NULL,
  al_batch          text NOT NULL,
  nic               text NOT NULL,
  nic_norm          text NOT NULL,
  payment_method    text NOT NULL DEFAULT 'bank' CHECK (payment_method IN ('bank', 'cash')),
  amount            numeric NOT NULL DEFAULT 3500,
  source            text NOT NULL DEFAULT 'online' CHECK (source IN ('online', 'cash_desk')),
  receipt_url       text,
  receipt_filename  text,
  notes             text,
  status            text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reject_reason     text,
  qr_token          text UNIQUE,
  approved_by       text,
  approved_at       timestamptz,
  ticket_emailed_at timestamptz,
  email_error       text,
  sms_sent_at       timestamptz,
  sms_error         text,
  created_by        text,
  checked_in_at     timestamptz,
  checked_in_by     text,
  created_at        timestamptz NOT NULL DEFAULT now()
);

-- One live ticket per NIC. A rejected request does not block a new one.
-- (The API looks for "nic" in this index name to show a friendly message.)
CREATE UNIQUE INDEX IF NOT EXISTS memora_tickets_live_nic_uniq
  ON memora_tickets (nic_norm) WHERE status <> 'rejected';
CREATE INDEX IF NOT EXISTS memora_tickets_status_idx ON memora_tickets (status, created_at DESC);

-- 3. Every scan at the entrance, for the audit trail
CREATE TABLE IF NOT EXISTS memora_scans (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id   uuid REFERENCES memora_tickets(id) ON DELETE SET NULL,
  code        text,
  result      text NOT NULL,
  scanned_by  text,
  scanned_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS memora_scans_at_idx ON memora_scans (scanned_at DESC);

-- Only the servers (service role) read or write these tables.
ALTER TABLE memora_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE memora_scans   ENABLE ROW LEVEL SECURITY;
