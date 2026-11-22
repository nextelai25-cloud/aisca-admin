-- ============================================================
-- Petty cash on the imprest system (Finance Desk).
-- Run ONCE in the Supabase SQL editor, AFTER finance-docs.sql.
-- Safe to re-run. Only adds columns; nothing is removed.
-- ============================================================

-- Fixed float kept in the petty cash box, and the most one petty cash
-- voucher may pay. Change both later from Finance Desk > Petty cash.
ALTER TABLE fin_settings ADD COLUMN IF NOT EXISTS petty_float     NUMERIC(12,2) NOT NULL DEFAULT 10000;
ALTER TABLE fin_settings ADD COLUMN IF NOT EXISTS petty_max_spend NUMERIC(12,2) NOT NULL DEFAULT 5000;

-- Who received the cash (printed on the petty cash voucher)
ALTER TABLE fin_petty_cash ADD COLUMN IF NOT EXISTS paid_to   TEXT;
-- Bank / cheque reference for money drawn to restore the float
ALTER TABLE fin_petty_cash ADD COLUMN IF NOT EXISTS reference TEXT;

-- Make the new settings visible to the API straight away
NOTIFY pgrst, 'reload schema';
