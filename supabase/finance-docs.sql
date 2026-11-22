-- ============================================================
-- AISCA Finance Desk: requisitions, quotations, payment vouchers,
-- reimbursements, income receipts, petty cash and the approval matrix.
-- Follows the CFO's proposed process (Nov 2026).
--
-- Run this ONCE in the Supabase SQL editor. Safe to re-run.
-- It only CREATES new fin_* tables. It never changes or drops
-- finance_ledger, finance_ledger_details or finance_audit_log.
-- ============================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Running numbers for the paper trail (REQ-0001, PV-0001 ...)
CREATE SEQUENCE IF NOT EXISTS fin_req_seq;
CREATE SEQUENCE IF NOT EXISTS fin_pv_seq;
CREATE SEQUENCE IF NOT EXISTS fin_rb_seq;
CREATE SEQUENCE IF NOT EXISTS fin_ir_seq;
CREATE SEQUENCE IF NOT EXISTS fin_pc_seq;

-- 1. Approval matrix (one row). Below the threshold the CFO alone approves.
--    Above it a second approver signs too (Chairperson by default).
CREATE TABLE IF NOT EXISTS fin_settings (
  id                  INT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  approval_threshold  NUMERIC(12,2) NOT NULL DEFAULT 100000,
  second_approver     TEXT NOT NULL DEFAULT 'chairman'
                      CHECK (second_approver IN ('chairman', 'deputy_or_chairman')),
  updated_by          TEXT,
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);
INSERT INTO fin_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

-- 2. Expense requisitions (a request BEFORE money is approved).
--    Many requisitions can exist for one category; only approved ones get a voucher.
CREATE TABLE IF NOT EXISTS fin_requisitions (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  req_no           TEXT UNIQUE NOT NULL DEFAULT 'REQ-' || LPAD(nextval('fin_req_seq')::TEXT, 4, '0'),
  event            TEXT NOT NULL DEFAULT 'General',
  department       TEXT NOT NULL,
  category         TEXT NOT NULL,
  title            TEXT NOT NULL,
  details          TEXT,                      -- what is expected / deliverables
  quantity         NUMERIC(12,2),
  budgeted_amount  NUMERIC(12,2),
  estimated_amount NUMERIC(12,2) NOT NULL CHECK (estimated_amount > 0),
  needed_by        DATE,
  requested_by     TEXT NOT NULL,             -- team member who prepared it
  head_name        TEXT NOT NULL,             -- department head who signed
  head_signed_on   DATE,
  form_url         TEXT,                      -- scan of the signed paper form
  status           TEXT NOT NULL DEFAULT 'pending_cfo'
                   CHECK (status IN ('pending_cfo', 'pending_second', 'approved', 'rejected', 'cancelled')),
  cfo_by           TEXT, cfo_name TEXT, cfo_at TIMESTAMPTZ, cfo_note TEXT,
  second_by        TEXT, second_name TEXT, second_at TIMESTAMPTZ, second_note TEXT,
  reject_reason    TEXT,
  created_by       TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS fin_requisitions_event_idx ON fin_requisitions(event);

-- 3. Procurement comparison sheet: 2 to 3 vendor quotations per requisition.
CREATE TABLE IF NOT EXISTS fin_quotations (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requisition_id  UUID NOT NULL REFERENCES fin_requisitions(id) ON DELETE CASCADE,
  vendor          TEXT NOT NULL,
  amount          NUMERIC(12,2) NOT NULL CHECK (amount >= 0),
  contact         TEXT,
  notes           TEXT,
  file_url        TEXT,
  selected        BOOLEAN NOT NULL DEFAULT FALSE,
  created_by      TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS fin_quotations_req_idx ON fin_quotations(requisition_id);

-- 4. Payment vouchers: issued by the CFO only for an APPROVED requisition.
--    One voucher per requisition. Only paid vouchers reach finance_ledger.
CREATE TABLE IF NOT EXISTS fin_vouchers (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pv_no            TEXT UNIQUE NOT NULL DEFAULT 'PV-' || LPAD(nextval('fin_pv_seq')::TEXT, 4, '0'),
  requisition_id   UUID NOT NULL REFERENCES fin_requisitions(id),
  quotation_id     UUID REFERENCES fin_quotations(id),
  payee            TEXT NOT NULL,
  description      TEXT,
  quantity         NUMERIC(12,2),
  budgeted_amount  NUMERIC(12,2),
  actual_amount    NUMERIC(12,2) NOT NULL CHECK (actual_amount > 0),
  payment_method   TEXT NOT NULL DEFAULT 'bank' CHECK (payment_method IN ('bank', 'cash', 'petty_cash')),
  payment_ref      TEXT,
  bill_no          TEXT,
  bill_url         TEXT,
  status           TEXT NOT NULL DEFAULT 'authorised' CHECK (status IN ('authorised', 'paid', 'void')),
  prepared_by      TEXT, prepared_name TEXT, prepared_at TIMESTAMPTZ DEFAULT NOW(),
  paid_by          TEXT, paid_name TEXT, paid_at TIMESTAMPTZ, paid_on DATE,
  ledger_id        UUID,
  void_reason      TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);
-- One live (not void) voucher per requisition. A voided voucher stays on file.
CREATE UNIQUE INDEX IF NOT EXISTS fin_vouchers_one_live ON fin_vouchers(requisition_id) WHERE status <> 'void';

-- 5. Expense reimbursements (someone paid out of pocket).
--    Original bill is mandatory and the claim can never exceed the bill.
CREATE TABLE IF NOT EXISTS fin_reimbursements (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rb_no           TEXT UNIQUE NOT NULL DEFAULT 'RB-' || LPAD(nextval('fin_rb_seq')::TEXT, 4, '0'),
  event           TEXT NOT NULL DEFAULT 'General',
  department      TEXT,
  category        TEXT NOT NULL DEFAULT 'Other Expenses',
  claimant        TEXT NOT NULL,
  purpose         TEXT NOT NULL,
  bill_no         TEXT NOT NULL,
  bill_date       DATE,
  bill_amount     NUMERIC(12,2) NOT NULL CHECK (bill_amount > 0),
  claim_amount    NUMERIC(12,2) NOT NULL CHECK (claim_amount > 0),
  bill_url        TEXT NOT NULL,
  status          TEXT NOT NULL DEFAULT 'pending_cfo'
                  CHECK (status IN ('pending_cfo', 'pending_second', 'approved', 'paid', 'rejected')),
  cfo_by          TEXT, cfo_name TEXT, cfo_at TIMESTAMPTZ,
  second_by       TEXT, second_name TEXT, second_at TIMESTAMPTZ,
  reject_reason   TEXT,
  payment_method  TEXT CHECK (payment_method IN ('bank', 'cash', 'petty_cash')),
  payment_ref     TEXT,
  paid_by         TEXT, paid_name TEXT, paid_at TIMESTAMPTZ, paid_on DATE,
  ledger_id       UUID,
  created_by      TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT fin_reimb_claim_le_bill CHECK (claim_amount <= bill_amount)
);

-- 6. Income receipts, kept per event (money and in-kind sponsorship).
CREATE TABLE IF NOT EXISTS fin_income_receipts (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ir_no              TEXT UNIQUE NOT NULL DEFAULT 'IR-' || LPAD(nextval('fin_ir_seq')::TEXT, 4, '0'),
  event              TEXT NOT NULL DEFAULT 'General',
  source_type        TEXT NOT NULL,              -- Sponsorship, Ticket sales, Registration fees ...
  received_from      TEXT NOT NULL,
  kind               TEXT NOT NULL DEFAULT 'monetary' CHECK (kind IN ('monetary', 'in_kind')),
  amount             NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (amount >= 0),
  in_kind_description TEXT,
  in_kind_value      NUMERIC(12,2),
  payment_method     TEXT CHECK (payment_method IN ('bank', 'cash')),
  reference          TEXT,
  received_on        DATE NOT NULL DEFAULT CURRENT_DATE,
  proof_url          TEXT,
  notes              TEXT,
  ledger_id          UUID,
  recorded_by        TEXT, recorded_name TEXT, recorded_at TIMESTAMPTZ DEFAULT NOW(),
  void_reason        TEXT,
  CONSTRAINT fin_income_kind_ok CHECK (
    (kind = 'monetary' AND amount > 0) OR (kind = 'in_kind' AND in_kind_description IS NOT NULL)
  )
);
CREATE INDEX IF NOT EXISTS fin_income_event_idx ON fin_income_receipts(event);

-- 7. Petty cash book (top ups in, small spends out).
CREATE TABLE IF NOT EXISTS fin_petty_cash (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pc_no        TEXT UNIQUE NOT NULL DEFAULT 'PC-' || LPAD(nextval('fin_pc_seq')::TEXT, 4, '0'),
  entry_type   TEXT NOT NULL CHECK (entry_type IN ('top_up', 'spend')),
  amount       NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  purpose      TEXT NOT NULL,
  event        TEXT NOT NULL DEFAULT 'General',
  category     TEXT,
  bill_no      TEXT,
  bill_url     TEXT,
  entry_date   DATE NOT NULL DEFAULT CURRENT_DATE,
  ledger_id    UUID,
  voucher_id   UUID REFERENCES fin_vouchers(id),
  recorded_by  TEXT, recorded_name TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Bill register: the "Recorded" seal in data form. A bill number can be
--    claimed only once across vouchers, reimbursements and petty cash, so the
--    same bill can never be submitted twice.
CREATE TABLE IF NOT EXISTS fin_bill_register (
  bill_key     TEXT PRIMARY KEY,          -- lower-cased bill number without spaces
  bill_no      TEXT NOT NULL,
  doc_type     TEXT NOT NULL,             -- voucher / reimbursement / petty_cash
  doc_id       UUID NOT NULL,
  doc_no       TEXT,
  recorded_by  TEXT,
  recorded_at  TIMESTAMPTZ DEFAULT NOW()
);

-- 9. Audit trail for every action on these documents.
CREATE TABLE IF NOT EXISTS fin_doc_log (
  id        BIGSERIAL PRIMARY KEY,
  doc_type  TEXT NOT NULL,
  doc_id    UUID,
  doc_no    TEXT,
  action    TEXT NOT NULL,
  by_email  TEXT,
  by_name   TEXT,
  note      TEXT,
  at        TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS fin_doc_log_doc_idx ON fin_doc_log(doc_id);

-- Only the server (service role, after checking the admin's role) reads or
-- writes these tables. No browser access.
ALTER TABLE fin_settings         ENABLE ROW LEVEL SECURITY;
ALTER TABLE fin_requisitions     ENABLE ROW LEVEL SECURITY;
ALTER TABLE fin_quotations       ENABLE ROW LEVEL SECURITY;
ALTER TABLE fin_vouchers         ENABLE ROW LEVEL SECURITY;
ALTER TABLE fin_reimbursements   ENABLE ROW LEVEL SECURITY;
ALTER TABLE fin_income_receipts  ENABLE ROW LEVEL SECURITY;
ALTER TABLE fin_petty_cash       ENABLE ROW LEVEL SECURITY;
ALTER TABLE fin_bill_register    ENABLE ROW LEVEL SECURITY;
ALTER TABLE fin_doc_log          ENABLE ROW LEVEL SECURITY;
