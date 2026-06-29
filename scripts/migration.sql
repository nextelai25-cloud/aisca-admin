-- AISCA Finance System Upgrade Migration

-- 1. Finance Budgets
CREATE TABLE IF NOT EXISTS finance_budgets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  category TEXT NOT NULL,
  fund TEXT NOT NULL DEFAULT 'General Fund',
  period_type TEXT NOT NULL DEFAULT 'monthly', -- monthly / quarterly / annual
  period_label TEXT NOT NULL, -- e.g. "June 2026", "Q2 2026", "2026"
  budget_amount NUMERIC NOT NULL,
  created_by UUID REFERENCES admin_users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Finance Reconciliation
CREATE TABLE IF NOT EXISTS finance_reconciliation (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  period_label TEXT NOT NULL, -- e.g. "June 2026"
  opening_balance NUMERIC NOT NULL DEFAULT 0,
  closing_balance_book NUMERIC,
  closing_balance_bank NUMERIC,
  status TEXT DEFAULT 'draft', -- draft / completed
  notes TEXT,
  created_by UUID REFERENCES admin_users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Finance Reconciliation Items
CREATE TABLE IF NOT EXISTS finance_reconciliation_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  reconciliation_id UUID REFERENCES finance_reconciliation(id) ON DELETE CASCADE,
  ledger_entry_id UUID REFERENCES finance_ledger(id),
  bank_date DATE,
  bank_description TEXT,
  bank_amount NUMERIC,
  match_status TEXT DEFAULT 'unmatched', -- matched / unmatched / manual
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Finance Ledger Details (Bank Ref / Receipt #)
CREATE TABLE IF NOT EXISTS finance_ledger_details (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  ledger_entry_id UUID REFERENCES finance_ledger(id) ON DELETE CASCADE,
  bank_reference_number TEXT,
  invoice_number TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure 1:1 relationship
CREATE UNIQUE INDEX IF NOT EXISTS finance_ledger_details_ledger_entry_id_idx ON finance_ledger_details(ledger_entry_id);
