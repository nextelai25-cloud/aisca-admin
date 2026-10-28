-- RANGEELA '26 paper tickets
-- Physical tickets carry only a number (001 to 200). Each number can be
-- entered at the gate once: the primary key makes a second entry fail,
-- even if two phones type the same number at the same moment.
-- Run once in the Supabase SQL editor.

CREATE TABLE IF NOT EXISTS rangeela_paper_entries (
  number      int PRIMARY KEY CHECK (number BETWEEN 1 AND 999),
  entered_at  timestamptz NOT NULL DEFAULT now(),
  entered_by  text
);

-- Only the server (service role) reads or writes this table.
ALTER TABLE rangeela_paper_entries ENABLE ROW LEVEL SECURITY;
