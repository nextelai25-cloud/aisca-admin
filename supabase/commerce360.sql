-- ============================================================
-- COMMERCE 360 project workspace (admin.aisca.lk/dashboard/commerce360)
-- Run this ONCE in the Supabase SQL editor. Safe to re-run: tables are
-- created only if missing, and the starting data from the master tracker
-- (COMMERCE_360_Task_Tracker.xlsx) is loaded only into empty tables.
--
-- All reads and writes go through /api/c360 with the service role key and
-- a role check against admin_users, so RLS stays fully closed here.
-- ============================================================

CREATE TABLE IF NOT EXISTS c360_tasks (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code          TEXT NOT NULL UNIQUE,                 -- FIN-01, VEN-04 ...
  priority      TEXT NOT NULL DEFAULT 'P2' CHECK (priority IN ('P1','P2','P3')),
  workstream    TEXT,
  team          TEXT,
  title         TEXT NOT NULL,
  why           TEXT,                                 -- why it matters / what it blocks
  start_date    DATE,
  deadline      DATE,
  status        TEXT NOT NULL DEFAULT 'Not Started' CHECK (status IN ('Not Started','In Progress','Blocked','Done')),
  pct           INTEGER NOT NULL DEFAULT 0 CHECK (pct BETWEEN 0 AND 100),
  owner         TEXT,                                 -- person responsible
  notes         TEXT,                                 -- notes / blocker
  blocked_since TIMESTAMPTZ,
  completed_at  TIMESTAMPTZ,
  sort          INTEGER NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by    TEXT
);
CREATE INDEX IF NOT EXISTS c360_tasks_deadline ON c360_tasks (deadline);
CREATE INDEX IF NOT EXISTS c360_tasks_status   ON c360_tasks (status);

-- Every change to a task: who, when, old → new.
CREATE TABLE IF NOT EXISTS c360_task_log (
  id         BIGSERIAL PRIMARY KEY,
  task_id    UUID REFERENCES c360_tasks(id) ON DELETE SET NULL,
  task_code  TEXT,
  action     TEXT NOT NULL,                           -- created | updated | imported | deleted
  changes    JSONB,
  by_email   TEXT,
  by_name    TEXT,
  at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS c360_task_log_task ON c360_task_log (task_id, at DESC);
CREATE INDEX IF NOT EXISTS c360_task_log_at   ON c360_task_log (at DESC);

-- The gates on the critical path.
CREATE TABLE IF NOT EXISTS c360_gates (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  n          INTEGER NOT NULL DEFAULT 0,
  title      TEXT NOT NULL,
  date       DATE,
  unlocks    TEXT,
  slip       TEXT,                                    -- what happens if it slips
  status     TEXT NOT NULL DEFAULT 'Not Started' CHECK (status IN ('Not Started','In Progress','Blocked','Done')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by TEXT
);

CREATE TABLE IF NOT EXISTS c360_teams (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT NOT NULL UNIQUE,                    -- matches c360_tasks.team
  scope      TEXT,
  head       TEXT,
  deputy     TEXT,
  members    TEXT,
  sort       INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by TEXT
);

-- People roster (feeds the "person responsible" suggestions).
CREATE TABLE IF NOT EXISTS c360_people (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT NOT NULL UNIQUE,
  role       TEXT,
  phone      TEXT,
  active     BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by TEXT
);

CREATE TABLE IF NOT EXISTS c360_sponsors (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  n             INTEGER NOT NULL DEFAULT 0,
  company       TEXT NOT NULL,
  category      TEXT,
  tier          TEXT,
  ask           NUMERIC,
  contact       TEXT,
  designation   TEXT,
  phone         TEXT,
  email         TEXT,
  intro         TEXT,                                 -- warm intro via
  first_contact DATE,
  last_followup DATE,
  next_action   DATE,
  status        TEXT,
  confirmed     NUMERIC,
  received      NUMERIC,
  owner         TEXT,
  notes         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by    TEXT
);

CREATE TABLE IF NOT EXISTS c360_weeks (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  week       TEXT NOT NULL,
  dates      TEXT,
  start_date DATE,
  end_date   DATE,
  focus      TEXT,                                    -- the one thing that must happen
  also       TEXT,
  gate       TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by TEXT
);

CREATE TABLE IF NOT EXISTS c360_risks (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  n          INTEGER NOT NULL DEFAULT 0,
  risk       TEXT NOT NULL,
  likelihood TEXT,
  impact     TEXT,
  warning    TEXT,                                    -- early warning sign
  response   TEXT,                                    -- pre-agreed response
  owner      TEXT,
  decide_by  DATE,
  status     TEXT NOT NULL DEFAULT 'Open',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by TEXT
);

CREATE TABLE IF NOT EXISTS c360_settings (
  id            SMALLINT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  event_name    TEXT NOT NULL DEFAULT 'COMMERCE 360',
  event_date    DATE NOT NULL DEFAULT '2026-12-02',
  venue         TEXT,
  budget_target NUMERIC NOT NULL DEFAULT 0,
  review_rhythm TEXT,
  playbook      TEXT,
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by    TEXT
);

ALTER TABLE c360_tasks    ENABLE ROW LEVEL SECURITY;
ALTER TABLE c360_task_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE c360_gates    ENABLE ROW LEVEL SECURITY;
ALTER TABLE c360_teams    ENABLE ROW LEVEL SECURITY;
ALTER TABLE c360_people   ENABLE ROW LEVEL SECURITY;
ALTER TABLE c360_sponsors ENABLE ROW LEVEL SECURITY;
ALTER TABLE c360_weeks    ENABLE ROW LEVEL SECURITY;
ALTER TABLE c360_risks    ENABLE ROW LEVEL SECURITY;
ALTER TABLE c360_settings ENABLE ROW LEVEL SECURITY;

-- ── Starting data from the master tracker (loaded only into empty tables) ──

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM c360_tasks) THEN
    INSERT INTO c360_tasks (code, priority, workstream, team, title, why, start_date, deadline, status, pct, owner, notes, sort) VALUES
    ('PM-01', 'P1', 'Programme', 'Chairman', 'Appoint 10 team heads and 10 deputies, publish the structure', 'Nothing below can be delegated until heads exist. A deputy per team means one absent student does not stall a workstream.', '2026-09-06', '2026-09-08', 'Done', 100, 'Isira Chirayu', NULL, 1),
    ('FIN-01', 'P1', 'Finance', 'T1 Sponsorship', 'Finalise the line-item event budget (Rs 5.002M) with a cost owner per line', 'Blocks the proposal, the sponsorship tiers, and every vendor negotiation. This is the single most blocking task on the list.', '2026-09-06', '2026-09-08', 'Done', 100, NULL, NULL, 2),
    ('PM-02', 'P1', 'Programme', 'Chairman', 'Hold kickoff meeting: present this tracker, assign teams, fix Sunday 8pm weekly review', 'Every head must know their tasks and their deadline on day one.', '2026-09-08', '2026-09-09', 'Done', 100, 'Isira Chirayu', 'Already Assigned', 3),
    ('GOV-01', 'P1', 'Approvals', 'T3 Government', 'Identify the correct MOE division and officer', 'MOE approval is the longest lead item and cannot be rushed at the end. Start on day one.', '2026-09-06', '2026-09-09', 'Done', 100, NULL, NULL, 4),
    ('PM-03', 'P1', 'Programme', 'Chairman', 'Set up shared drive, one WhatsApp group per team, shared copy of this tracker', 'Single source of truth. Heads update their own rows before each Sunday review.', '2026-09-08', '2026-09-09', 'Done', 100, NULL, 'Tracker moved from Excel to Google Sheets', 5),
    ('FIN-03', 'P1', 'Finance', 'T1 Sponsorship', 'Complete the full project proposal document', 'Sponsors, MOE and the venue all ask for it. Everything downstream is waiting on this.', '2026-09-06', '2026-09-10', 'Done', 80, NULL, NULL, 6),
    ('FIN-04', 'P1', 'Finance', 'T1 Sponsorship', 'Finalise sponsorship tiers (Title, Platinum, Gold, Silver, Bronze) and the 30 Official Partner categories', 'Depends on FIN-01. Tier pricing must be derived from the budget, not guessed.', '2026-09-08', '2026-09-10', 'Done', 100, NULL, NULL, 7),
    ('VEN-01', 'P1', 'Venue', 'T2 Venue', 'Write to Temple Trees requesting a written hold on 2 Dec 2026', 'A verbal ''we can host 1500'' is not a booking. Get the date blocked in writing.', '2026-09-06', '2026-09-10', 'Done', 100, 'Thulina Biman', NULL, 8),
    ('FIN-05', 'P1', 'Finance', 'T1 Sponsorship', 'Cost every sponsor benefit so each tier is actually profitable', 'A logo on a backdrop, 20 delegate passes and a stall all have real cost. Price the tier above the cost of delivering it.', '2026-09-09', '2026-09-11', 'Done', 100, NULL, NULL, 9),
    ('FIN-06', 'P1', 'Finance', 'T1 Sponsorship', 'Build the target company list: 120+ companies mapped to the 30 partner categories, with named contact, email, phone, warm intro', 'With 6 weeks of selling time you need volume at the top of the funnel. Assume a 10-15% conversion.', '2026-09-08', '2026-09-12', 'Done', 100, 'Isira Chirayu', NULL, 10),
    ('GOV-02', 'P1', 'Approvals', 'T3 Government', 'Meeting with Mr. Sampath to get guidance and support with the approval process.', 'Getting approval directly from the MOE is harder than going through an existing contact.', '2026-09-09', '2026-09-12', 'Done', 50, 'Isira Chirayu and Vishmi', NULL, 11),
    ('VIP-02', 'P1', 'VIP', 'T4 Protocol', 'Send chief guest request letters to all three priority names in parallel', 'Do not wait for a no before approaching the next. Parallel requests, sequential acceptance.', '2026-09-09', '2026-09-12', 'In Progress', 60, 'Vishmi Wijayamanne', NULL, 12),
    ('FIN-07', 'P2', 'Finance', 'T1 Sponsorship', 'Write the outreach email template, WhatsApp pitch script and 60 second phone pitch', 'Ten different board members pitching ten different ways loses deals.', '2026-09-10', '2026-09-12', 'Done', 0, 'Isira Chirayu', NULL, 13),
    ('GOV-03', 'P1', 'Approvals', 'T3 Government', 'Draft the MOE approval request letter plus annexures (proposal, date, venue, school list, safety plan)', 'Submitting an incomplete file is how these applications sit for six weeks.', '2026-09-08', '2026-09-13', 'Done', 100, 'Isira , Janiru, Sehandu, Risindi, Ravinu', NULL, 14),
    ('FIN-08', 'P1', 'Finance', 'T1 Sponsorship', 'Design the sponsorship proposal deck as a sponsor-facing PDF', 'This is the actual selling document. Different from the board proposal.', '2026-09-10', '2026-09-14', 'Done', 100, NULL, NULL, 15),
    ('MKT-01', 'P2', 'Design', 'T7 Design', 'Lock the Commerce 360 brand kit: logo lockup, orange/black palette, fonts, poster and story templates', 'Every team produces artwork from here on. Fix it once.', '2026-09-08', '2026-09-14', 'Done', 100, NULL, NULL, 16),
    ('OPS-01', 'P2', 'Operations', 'T10 Operations', 'Check the A/L and O/L exam calendar against every date in this plan', 'Your whole workforce and your whole audience are students. One clash and attendance collapses.', '2026-09-08', '2026-09-15', 'Done', 100, 'Isira Chirayu', 'Supported by Okitha Wijesiri, Sachindra + Imesh', 17),
    ('FIN-10', 'P1', 'Finance', 'T1 Sponsorship', 'Confirm event bank account, treasurer, two signatories, receipt book and a simple cash ledger', 'No sponsor pays into a personal account. This blocks the first payment.', '2026-09-08', '2026-09-15', 'Done', 0, NULL, NULL, 18),
    ('CMP-01', 'P2', 'Competitions', 'T5 Competitions', 'Finalise the competition list, categories, eligibility, team sizes and prize structure', 'Schools need this in the invitation pack. Locking it late forces a reprint.', '2026-09-08', '2026-09-15', 'Done', 100, NULL, NULL, 19),
    ('GOV-04', 'P1', 'Approvals', 'T3 Government', 'Submit the MOE application in person and get an acknowledgement/reference number', 'In person, with a reference number, so you have something to follow up against.', '2026-09-11', '2026-09-15', 'Done', 0, NULL, NULL, 20),
    ('VIP-01', 'P1', 'VIP', 'T4 Protocol', 'Find a personal introducer to Dhammika Perera''s office and to the PM/President secretariat', 'Cold letters to that level rarely land. A warm channel is what actually gets the diary opened.', '2026-09-14', '2026-09-20', 'In Progress', 50, NULL, 'CCC, Bandula Egodage', 21),
    ('FIN-11', 'P1', 'Finance', 'T1 Sponsorship', 'Start outreach: first 40 companies contacted with proposal sent', 'Selling window opens. Track every contact in the Sponsor Pipeline sheet.', '2026-09-15', '2026-09-20', 'Done', 90, NULL, NULL, 22),
    ('VEN-03', 'P2', 'Venue', 'T2 Venue', 'Ask the venue for a discount, waiver or in-kind support, in writing', 'Venue is Rs 550K of the budget. A waiver is the single fastest way to cut the sponsorship target.', '2026-09-18', '2026-09-25', 'Not Started', 0, NULL, NULL, 23),
    ('VIP-03', 'P1', 'VIP', 'T4 Protocol', 'First follow-up on all chief guest requests', 'These offices respond to persistence, not to the first letter.', '2026-09-22', '2026-09-26', 'Not Started', 0, NULL, NULL, 24),
    ('SCH-01', 'P1', 'Schools', 'T6 Schools', 'Build the master school database: 200+ schools with principal name, commerce teacher-in-charge, phone, email, postal address', 'The invitation on 25 Oct is only as good as this list. Building it in October is too late.', '2026-09-15', '2026-09-30', 'Done', 100, NULL, NULL, 25),
    ('VEN-04', 'P1', 'Venue', 'T2 Venue', 'Identify and soft-hold a backup venue (BMICH, Nelum Pokuna, Sugathadasa, large school auditorium)', 'Temple Trees is the PM''s official residence. Clearance can fail for reasons that have nothing to do with you. Have a fallback before you print anything.', '2026-09-18', '2026-09-30', 'Done', 0, NULL, 'UCFM Tower, EP, AC, NC', 26),
    ('FIN-02', 'P1', 'Finance', 'T1 Sponsorship', 'Build a Plan B scaled budget (approx Rs 2.5-3.0M) with the cuts pre-decided', 'So the 20 Oct go/no-go is a 10 minute decision, not a two week panic.', '2026-09-08', '2026-10-02', 'Not Started', 0, 'Isira Chirayu', NULL, 27),
    ('GOV-05', 'P1', 'Approvals', 'T3 Government', 'Get a meeting appointment with the identified MOE officer', 'A face to face meeting with the officer holding the file moves it faster than an application sitting in a queue. Ask directly what is missing.', '2026-09-14', '2026-10-02', 'Done', 0, NULL, NULL, 28),
    ('GOV-06', 'P1', 'Approvals', 'T3 Government', 'First MOE follow-up visit in person', 'Weekly physical follow-up until the letter is in hand.', '2026-09-22', '2026-10-02', 'Done', 0, NULL, NULL, 29),
    ('FIN-12', 'P2', 'Finance', 'T1 Sponsorship', 'Weekly sponsor pipeline review every Sunday (recurring to 28 Nov)', 'Recurring. Pipeline reviewed weekly or it stops moving.', '2026-09-20', '2026-10-04', 'Not Started', 0, NULL, NULL, 30),
    ('FIN-09', 'P2', 'Finance', 'T1 Sponsorship', 'Prepare the sponsorship agreement/letter template and the invoice template', 'The moment someone says yes you need paper within 24 hours or the momentum dies.', '2026-09-10', '2026-10-04', 'Done', 60, NULL, NULL, 31),
    ('FIN-13', 'P1', 'Finance', 'T1 Sponsorship', 'All 120 target companies contacted at least once', 'Top of funnel closed out. Anything not contacted by now will not convert in time.', '2026-09-20', '2026-10-05', 'In Progress', 50, NULL, NULL, 32),
    ('CMP-02', 'P1', 'Competitions', 'T5 Competitions', 'Write the full competition rulebook: rules, submission format, marking rubric, deadlines, disqualification and appeals', 'Ambiguous rules become disputes on results day. Write the rubric before anyone submits.', '2026-09-15', '2026-10-11', 'In Progress', 0, NULL, NULL, 33),
    ('CMP-03', 'P2', 'Competitions', 'T5 Competitions', 'Build and test the online submission system with a dummy entry', 'Test it before 1000 students hit it, not after.', '2026-09-22', '2026-10-09', 'Not Started', 0, NULL, NULL, 34),
    ('CMP-04', 'P2', 'Competitions', 'T5 Competitions', 'Identify 12-15 judges and draft their invitation letters', 'Judges with corporate titles also become sponsor introductions. Choose accordingly.', '2026-09-20', '2026-10-09', 'Not Started', 0, NULL, NULL, 35),
    ('VEN-02', 'P1', 'Venue', 'T2 Venue', 'Site visit with the production lead: capacity, stage position, power, parking, washrooms, load-in access', 'Do not design a stage for a space nobody has measured.', '2026-09-15', '2026-10-10', 'In Progress', 0, NULL, NULL, 36),
    ('MKT-02', 'P2', 'Marketing', 'T8 Media', 'Build the Sep-Dec social content calendar and the teaser plan', '7,000 followers is your cheapest school outreach channel. Use it early.', '2026-09-18', '2026-10-10', 'In Progress', 80, NULL, NULL, 37),
    ('CMP-05', 'P2', 'Competitions', 'T5 Competitions', 'Finalise prizes: cash, scholarships, internships, trophies, and who funds each', 'Prize value drives registration numbers. Scholarship prizes can be sponsored in kind.', '2026-09-28', '2026-10-10', 'Not Started', 0, NULL, NULL, 38),
    ('FIN-14', 'P1', 'Finance', 'T1 Sponsorship', 'First sponsor confirmed in writing and first payment received', 'Proves the pitch works. If nothing has converted by now, the pitch or the price is wrong.', '2026-09-25', '2026-10-10', 'Not Started', 0, NULL, NULL, 39),
    ('GOV-07', 'P1', 'Approvals', 'T3 Government', 'MOE approval letter in hand', 'Hard prerequisite for the 25 Oct school invitations. If not in hand by 15 Oct, escalate.', '2026-09-15', '2026-10-10', 'Not Started', 0, NULL, NULL, 40),
    ('SCH-02', 'P1', 'Schools', 'T6 Schools', 'Draft the full school invitation pack: School Invitation letter, competition brief, registration link, poster', 'Everything a school needs in one envelope. Nothing to be sent later as a correction.', '2026-10-01', '2026-10-11', 'Not Started', 0, NULL, NULL, 41),
    ('VEN-05', 'P1', 'Venue', 'T2 Venue', 'Venue booking confirmed in writing with terms, timings and payment schedule', 'Needed before invitations. You cannot un-invite 400 schools.', '2026-09-25', '2026-10-12', 'Not Started', 0, NULL, NULL, 42),
    ('CMP-06', 'P2', 'Competitions', 'T5 Competitions', 'All judges confirmed in writing and briefed on the rubric', 'Judge names go into the invitation pack as credibility.', '2026-09-30', '2026-10-15', 'Not Started', 0, NULL, NULL, 43),
    ('APT-01', 'P3', 'After Party', 'T10 Operations', 'Decide after-party format, venue, date, guest list and its own budget line', 'It has a cost and it is not in the main sponsorship pitch. Decide how it is funded now.', '2026-10-01', '2026-10-15', 'Not Started', 0, NULL, NULL, 44),
    ('FIN-15', 'P1', 'Finance', 'T1 Sponsorship', 'Physical meetings held with the top 15 prospects', 'Big tiers close in a room, not over email.', '2026-09-25', '2026-10-15', 'Not Started', 0, NULL, NULL, 45),
    ('PRD-02', 'P2', 'Production', 'T9 Production', 'Shortlist vendors, negotiate final rates, hold the date without paying', 'Hold now, pay when sponsor money lands.', '2026-09-30', '2026-10-15', 'Not Started', 0, NULL, NULL, 46),
    ('BRD-01', 'P2', 'Board', 'Board Committee', 'Publish board nomination criteria, application form and the transition timeline', 'The installation is half the event. Treat its timeline as seriously as the competition timeline.', '2026-09-20', '2026-10-18', 'Not Started', 0, NULL, NULL, 47),
    ('PRD-01', 'P1', 'Production', 'T9 Production', 'Collect three quotes each for stage/AV, food, printing and decor', 'Rs 2.4M of the budget sits in these four lines. Three quotes is how you fund the shortfall.', '2026-09-18', '2026-10-20', 'Not Started', 0, NULL, NULL, 48),
    ('MKT-04', 'P2', 'Marketing', 'T8 Media', 'Go live with the announcement campaign: date reveal, venue teaser, competition teaser', 'Public commitment also pressures sponsors and schools to respond.', '2026-10-05', '2026-10-20', 'Not Started', 0, NULL, NULL, 49),
    ('MKT-05', 'P2', 'Marketing', 'T8 Media', 'Competition promo creatives ready: posters, reels, story sets, WhatsApp forwards', 'Schools share on WhatsApp, not Instagram. Design for both.', '2026-10-10', '2026-10-20', 'Not Started', 0, NULL, NULL, 50),
    ('VIP-04', 'P1', 'VIP', 'T4 Protocol', 'Chief guest confirmed and the name locked', 'The name goes on the printed invitations that leave on 25 Oct. Hard cutoff.', '2026-09-12', '2026-10-20', 'Not Started', 0, NULL, NULL, 51),
    ('BRD-02', 'P2', 'Board', 'Board Committee', 'Close nominations, screen applicants, schedule interviews', 'Interviews take longer than anyone expects. Start early.', '2026-09-30', '2026-10-20', 'Not Started', 0, NULL, NULL, 52),
    ('FIN-16', 'P1', 'Finance', 'T1 Sponsorship', 'GATE: 60% of budget confirmed in writing', 'The gate you set. Confirmed means signed letter or payment, not a verbal maybe.', '2026-09-15', '2026-10-20', 'Not Started', 0, NULL, NULL, 53),
    ('PM-04', 'P1', 'Programme', 'Chairman', 'GO / NO-GO decision meeting: proceed at full scale, switch to Plan B budget, or postpone', 'Take this decision on the date, not two weeks later when the money still has not arrived.', '2026-10-20', '2026-10-21', 'Not Started', 0, NULL, NULL, 54),
    ('SCH-03', 'P1', 'Schools', 'T6 Schools', 'Print and pack the invitation packs', 'Depends on the chief guest name, MOE approval and the venue all being locked.', '2026-10-16', '2026-10-23', 'Not Started', 0, NULL, NULL, 55),
    ('SCH-04', 'P1', 'Schools', 'T6 Schools', 'HARD DEADLINE: school invitations dispatched', 'Your stated point of no return. After this the date, venue and format are frozen.', '2026-10-23', '2026-10-25', 'Not Started', 0, NULL, NULL, 56),
    ('CMP-07', 'P1', 'Competitions', 'T5 Competitions', 'Competition registration and submissions open', 'Portal must be live and tested on the morning it opens.', '2026-10-25', '2026-10-31', 'Not Started', 0, NULL, NULL, 57),
    ('SCH-05', 'P1', 'Schools', 'T6 Schools', 'Phone follow-up wave 1: call every invited school to confirm receipt', 'Posted letters get lost on a principal''s desk. The phone call is what produces registrations.', '2026-10-26', '2026-10-31', 'Not Started', 0, NULL, NULL, 58),
    ('MKT-06', 'P2', 'Marketing', 'T8 Media', 'Confirm media partners (TV, radio, print, digital) as in-kind sponsors', 'Media coverage is a sponsor deliverable you have already promised. Secure it before you have to buy it.', '2026-10-10', '2026-11-01', 'Not Started', 0, NULL, NULL, 59),
    ('GOV-08', 'P2', 'Approvals', 'T3 Government', 'Notify provincial and zonal education offices, and police/traffic if required for the venue', 'Separate from MOE. Often forgotten until the week of the event.', '2026-10-15', '2026-11-01', 'Not Started', 0, NULL, NULL, 60),
    ('MKT-03', 'P2', 'Marketing', 'T8 Media', 'Appoint the photography and videography partner, ideally as an in-kind sponsor', 'Booked late means booked expensive.', '2026-10-15', '2026-11-02', 'Not Started', 0, NULL, NULL, 61),
    ('CMP-08', 'P2', 'Competitions', 'T5 Competitions', 'Run an online briefing session for registered schools', 'Cuts your inbox questions by 80% and lifts submission quality.', '2026-10-31', '2026-11-02', 'Not Started', 0, NULL, NULL, 62),
    ('FIN-17', 'P1', 'Finance', 'T1 Sponsorship', '80% of budget confirmed in writing', 'Remaining 20% is chased through November.', '2026-10-21', '2026-11-05', 'Not Started', 0, NULL, NULL, 63),
    ('SCH-06', 'P1', 'Schools', 'T6 Schools', 'Phone follow-up wave 2 and registration count checkpoint', 'If registrations are below target here, you still have 10 days to fix it.', '2026-11-01', '2026-11-05', 'Not Started', 0, NULL, NULL, 64),
    ('VIP-05', 'P2', 'VIP', 'T4 Protocol', 'Send formal printed invitations to chief guest, VIPs, principals, past officials and partners', 'Protocol matters at this level. A printed invitation, hand delivered where possible.', '2026-10-26', '2026-11-05', 'Not Started', 0, NULL, NULL, 65),
    ('FIN-18', 'P1', 'Finance', 'T1 Sponsorship', '50% of confirmed sponsorship physically received in the bank', 'Vendors need advances. A confirmed sponsor who has not paid cannot book a stage.', '2026-10-10', '2026-11-10', 'Not Started', 0, NULL, NULL, 66),
    ('APT-02', 'P3', 'After Party', 'T10 Operations', 'Book the after-party venue and pay the advance', 'Same night as the event means the venue must be held early.', '2026-10-15', '2026-11-10', 'Not Started', 0, NULL, NULL, 67),
    ('OPS-02', 'P2', 'Operations', 'T10 Operations', 'Recruit volunteers and assign roles: registration, ushering, stage, media, hospitality, runners', '1500 attendees needs roughly 80-100 volunteers. Recruit in November, not in December.', '2026-10-25', '2026-11-10', 'Not Started', 0, NULL, NULL, 68),
    ('PRD-03', 'P1', 'Production', 'T9 Production', 'Sign vendor contracts and pay advances for stage/AV, catering, printing, decor', 'Depends entirely on FIN-18. This is where a cash flow gap becomes visible.', '2026-11-05', '2026-11-10', 'Not Started', 0, NULL, NULL, 69),
    ('BRD-04', 'P2', 'Board', 'Board Committee', 'Current board photoshoot and video, studio plus outdoor, same day', 'Needed for the felicitation AV on event day. Editing takes two weeks.', '2026-11-10', '2026-11-15', 'Not Started', 0, NULL, NULL, 70),
    ('CMP-09', 'P1', 'Competitions', 'T5 Competitions', 'HARD DEADLINE: competition submissions close', 'No extensions. An extension compresses judging into nothing.', '2026-10-31', '2026-11-15', 'Not Started', 0, NULL, NULL, 71),
    ('BRD-03', 'P1', 'Board', 'Board Committee', 'Incoming board decided and informed informally and confidentially', 'Your stated plan: inform privately, read the reactions, announce publicly on event day.', '2026-10-20', '2026-11-15', 'Not Started', 0, NULL, NULL, 72),
    ('PRD-04', 'P1', 'Production', 'T9 Production', 'Order trophies, medals, certificates and plaques', 'Engraving and printing lead time is 10-14 days. Order category names now, add winner names at the end.', '2026-11-15', '2026-11-18', 'Not Started', 0, NULL, NULL, 73),
    ('PRD-05', 'P1', 'Production', 'T9 Production', 'Final artwork to printers: backdrop, banners, standees, sponsor board, ID tags, signage', 'Once printed nothing can change. Get every sponsor logo signed off first.', '2026-11-15', '2026-11-20', 'Not Started', 0, NULL, NULL, 74),
    ('OPS-03', 'P1', 'Operations', 'T10 Operations', 'Submit security clearance name lists to the venue', 'A high security venue will need full attendee lists well in advance. Ask them the exact deadline at the site visit.', '2026-11-10', '2026-11-20', 'Not Started', 0, NULL, NULL, 75),
    ('FIN-19', 'P1', 'Finance', 'T1 Sponsorship', 'Audit every sponsor deliverable against every printed and digital item', 'This is what determines whether sponsors come back next year. Check the logos yourself.', '2026-11-15', '2026-11-22', 'Not Started', 0, NULL, NULL, 76),
    ('CMP-10', 'P1', 'Competitions', 'T5 Competitions', 'Preliminary judging round completed', 'Nine days from close to finalist announcement. Judges must have the rubric already.', '2026-11-16', '2026-11-22', 'Not Started', 0, NULL, NULL, 77),
    ('OPS-04', 'P1', 'Operations', 'T10 Operations', 'Write the run of show: minute by minute agenda from gates open to close', 'Without this, event day is improvised in front of 1500 people and a chief guest.', '2026-11-15', '2026-11-22', 'Not Started', 0, NULL, NULL, 78),
    ('CMP-11', 'P1', 'Competitions', 'T5 Competitions', 'Finalists announced and informed', 'Gives finalists eight days to prepare their stage pitch.', '2026-11-22', '2026-11-24', 'Not Started', 0, NULL, NULL, 79),
    ('OPS-06', 'P1', 'Operations', 'T10 Operations', 'First aid, ambulance standby, insurance cover and written emergency plan', 'Non-negotiable with school children. MOE may also ask for it.', '2026-11-15', '2026-11-24', 'Not Started', 0, NULL, NULL, 80),
    ('OPS-05', 'P2', 'Operations', 'T10 Operations', 'Seating plan, ushering map, registration desk layout and crowd flow', '1500 students arriving in a two hour window is the hardest operational moment of the day.', '2026-11-18', '2026-11-24', 'Not Started', 0, NULL, NULL, 81),
    ('PRD-06', 'P1', 'Production', 'T9 Production', 'Final headcount confirmed to the caterer', 'Food is Rs 1.55M, the largest line. Over-ordering by 200 is a six figure loss.', '2026-11-20', '2026-11-25', 'Not Started', 0, NULL, NULL, 82),
    ('MKT-07', 'P2', 'Marketing', 'T8 Media', 'Press release drafted and media invitations sent', 'Media need three to five days notice, not one.', '2026-11-20', '2026-11-25', 'Not Started', 0, NULL, NULL, 83),
    ('OPS-07', 'P2', 'Operations', 'T10 Operations', 'Transport plan, parking passes, drop-off zones and school bus coordination', '400 schools arriving by bus needs a traffic plan agreed with the venue and police.', '2026-11-18', '2026-11-25', 'Not Started', 0, NULL, NULL, 84),
    ('VIP-06', 'P1', 'VIP', 'T4 Protocol', 'Chief guest protocol brief: arrival time, route, security, seating, speech slot, memento', 'Send the brief to their secretariat and get it acknowledged.', '2026-11-20', '2026-11-26', 'Not Started', 0, NULL, NULL, 85),
    ('CMP-12', 'P2', 'Competitions', 'T5 Competitions', 'Finalist briefing: stage format, pitch time, AV requirements, arrival time', 'Finalists who do not know the format underperform and it shows on stage.', '2026-11-24', '2026-11-26', 'Not Started', 0, NULL, NULL, 86),
    ('BRD-05', 'P1', 'Board', 'Board Committee', 'Installation ceremony script, oath text, certificates and felicitation AV ready', 'The emotional centre of the event. Rehearse it like a performance.', '2026-11-15', '2026-11-26', 'Not Started', 0, NULL, NULL, 87),
    ('FIN-20', 'P1', 'Finance', 'T1 Sponsorship', '100% of committed sponsorship collected', 'Collecting after the event is very hard. Collect before you deliver the last benefit.', '2026-11-10', '2026-11-28', 'Not Started', 0, NULL, NULL, 88),
    ('OPS-08', 'P1', 'Operations', 'T10 Operations', 'Volunteer briefing, role allocation and t-shirt/ID distribution', 'Every volunteer must know their post and their team lead before event day.', '2026-11-26', '2026-11-29', 'Not Started', 0, NULL, NULL, 89),
    ('OPS-10', 'P1', 'Operations', 'T10 Operations', 'Distribute final checklist, run of show and emergency contact sheet to all heads', 'One page, printed, in every head''s pocket.', '2026-12-01', '2026-12-01', 'Not Started', 0, NULL, NULL, 90),
    ('OPS-09', 'P1', 'Operations', 'T10 Operations', 'Full technical rehearsal: sound, lights, AV, cues, oath, awards sequence', 'Rehearse the awards and installation sequences twice.', '2026-12-01', '2026-12-01', 'Not Started', 0, NULL, NULL, 91),
    ('PRD-07', 'P1', 'Production', 'T9 Production', 'Load-in, stage build, decor and AV setup at the venue', 'Full setup the day before. Never on the morning.', '2026-12-01', '2026-12-01', 'Not Started', 0, NULL, NULL, 92),
    ('APT-03', 'P3', 'After Party', 'T10 Operations', 'After party', 'Evening of event day. Separate crew so the day team can rest.', '2026-12-02', '2026-12-02', 'Not Started', 0, NULL, NULL, 93),
    ('EVT-01', 'P1', 'Event Day', 'All Teams', 'COMMERCE 360 EVENT DAY (Wednesday)', '8:00 AM to 2:30 PM. Competitions final, exhibition, keynote, felicitation, board installation announcement.', '2026-12-02', '2026-12-02', 'Not Started', 0, NULL, NULL, 94),
    ('PST-01', 'P1', 'Post Event', 'T1 Sponsorship', 'Send sponsor thank-you letters with a photo and coverage report pack', 'Sent within a week or next year''s sponsorship starts from zero again.', '2026-12-03', '2026-12-09', 'Not Started', 0, NULL, NULL, 95),
    ('PST-02', 'P2', 'Post Event', 'T5 Competitions', 'Disburse prize money, scholarships and certificates to winners', 'Delayed prize money is the fastest way to damage AISCA''s reputation with schools.', '2026-12-03', '2026-12-10', 'Not Started', 0, NULL, NULL, 96),
    ('PST-03', 'P2', 'Post Event', 'T8 Media', 'Release aftermovie, photo gallery and results announcement', 'Also the opening asset for next year''s sponsor deck.', '2026-12-03', '2026-12-12', 'Not Started', 0, NULL, NULL, 97),
    ('PST-04', 'P1', 'Post Event', 'T1 Sponsorship', 'Close final accounts: all receipts, vendor settlements, surplus or deficit statement', 'Every rupee accounted for, signed off by the treasurer and chairman.', '2026-12-03', '2026-12-15', 'Not Started', 0, NULL, NULL, 98),
    ('PST-05', 'P2', 'Post Event', 'Board Committee', 'Formal handover to the new board plus a written debrief of what worked and what did not', 'This document is what makes Commerce 360 2027 easier than 2026.', '2026-12-10', '2026-12-20', 'Not Started', 0, NULL, NULL, 99),
    ('DSN-01', 'P1', 'Design', 'T7 Design', 'Design the sponsorship proposal deck as a sponsor-facing PDF', 'Handover for FIN-08 (T1 Sponsorship). T1 cannot send proposals without the deck.', '2026-09-10', '2026-09-14', 'Done', 100, NULL, 'Feeds FIN-08. Done in tracker.', 100),
    ('DSN-02', 'P2', 'Design', 'T7 Design', 'Produce the announcement campaign creatives: date reveal, venue teaser, competition teaser', 'Handover for MKT-04 (T8 Media). T8''s go-live deadline is T7''s deadline.', '2026-10-05', '2026-10-20', 'Not Started', 0, NULL, 'Feeds MKT-04', 101),
    ('DSN-03', 'P1', 'Design', 'T7 Design', 'Design the school invitation pack, poster and registration forms', 'Handover for SCH-02 (T6 Schools). The invitation pack cannot go out without the artwork.', '2026-10-01', '2026-10-11', 'Not Started', 0, NULL, 'Feeds SCH-02', 102),
    ('DSN-04', 'P2', 'Design', 'T7 Design', 'Produce competition promo posters, reels and story sets', 'Handover for MKT-05 (T8 Media).', '2026-10-10', '2026-10-20', 'Not Started', 0, NULL, 'Feeds MKT-05', 103),
    ('DSN-05', 'P1', 'Design', 'T7 Design', 'Supply print-ready invitation pack files to T6', 'Handover for SCH-03 (T6 Schools). Files must reach T6 before printing starts.', '2026-10-16', '2026-10-23', 'Not Started', 0, NULL, 'Feeds SCH-03', 104),
    ('DSN-06', 'P1', 'Design', 'T7 Design', 'Supply trophy, medal and certificate artwork', 'Handover for PRD-04 (T9 Production). Trophies and certificates cannot be ordered without artwork.', '2026-11-15', '2026-11-18', 'Not Started', 0, NULL, 'Feeds PRD-04', 105),
    ('DSN-07', 'P1', 'Design', 'T7 Design', 'Supply backdrop, banner, standee and sponsor board print files', 'Handover for PRD-05 (T9 Production). Final artwork must reach the printers on time.', '2026-11-15', '2026-11-20', 'Not Started', 0, NULL, 'Feeds PRD-05', 106),
    ('DSN-08', 'P1', 'Design', 'T7 Design', 'Design the installation certificates and felicitation AV', 'Handover for BRD-05 (Board Committee).', '2026-11-15', '2026-11-26', 'Not Started', 0, NULL, 'Feeds BRD-05', 107);
  END IF;
END $$;

UPDATE c360_tasks SET completed_at = updated_at WHERE status = 'Done' AND completed_at IS NULL;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM c360_gates) THEN
    INSERT INTO c360_gates (n, title, date, unlocks, slip, status) VALUES
    (1, 'Budget and project proposal finalised', '2026-09-10', 'Sponsorship tiers, MOE file, venue negotiation, vendor quotes', 'No proposal means no sponsor conversation. Every day lost here is a day lost from a 6 week selling window.', 'Done'),
    (2, 'MOE application submitted', '2026-09-15', 'Legal permission for a school-day event', 'Approval typically takes 4-6 weeks. Submitting late pushes approval past the 25 Oct invitation date.', 'In Progress'),
    (3, 'Sponsorship proposal deck ready and outreach started', '2026-09-14', 'All sponsorship revenue', 'Every week of delay cuts roughly 15% off the achievable sponsorship total.', 'Done'),
    (4, 'Backup venue identified and soft-held', '2026-09-30', 'Insurance against a Temple Trees clearance failure', 'If Temple Trees falls through after 25 Oct you have no venue and no way to tell 400 schools.', 'Not Started'),
    (5, 'MOE approval letter in hand', '2026-10-15', 'School invitations, principal buy-in, teacher release', 'Without it, schools cannot officially release students on a Wednesday. Attendance collapses.', 'Not Started'),
    (6, 'Chief guest confirmed', '2026-10-20', 'Printed invitations, media pitch, sponsor upsell', 'The name is printed on 400 invitations. After 25 Oct it cannot change.', 'Not Started'),
    (7, '60% of budget confirmed in writing', '2026-10-20', 'Authority to commit to vendors', 'Trigger for the go/no-go. Below 60%, switch to the Plan B budget the same week.', 'Not Started'),
    (8, 'School invitations dispatched', '2026-10-25', 'Registrations, competition entries, attendance', 'Your stated point of no return. Date, venue, format and chief guest are frozen from here.', 'Not Started'),
    (9, '50% of sponsorship cash received', '2026-11-10', 'Vendor advances for stage, food and printing', 'Vendors will not hold dates without advances. Miss this and you lose your production slots in the December peak season.', 'Not Started'),
    (10, 'Competition submissions close', '2026-11-15', 'Judging, finalist selection, trophy engraving', 'Only 9 days exist between close and finalist announcement. An extension eats the judging window.', 'Not Started'),
    (11, 'Incoming board decided', '2026-11-15', 'Installation ceremony, photoshoot, handover', 'The installation is half the event. A late decision means a rushed, flat ceremony.', 'Not Started');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM c360_teams) THEN
    INSERT INTO c360_teams (name, scope, head, deputy, members, sort) VALUES
    ('Chairman', 'Overall command, top-tier sponsor closing, go/no-go decisions, escalations', 'Isira Chirayu', 'Sathis Gangaboda', '8 suggested', 1),
    ('T1 Sponsorship', 'All revenue: proposal, tiers, outreach, closing, agreements, collections, final accounts', 'Isira Chirayu', 'Okitha Wijesiri', '10 suggested', 2),
    ('T2 Venue', 'Temple Trees, backup venue, site visits, booking terms, venue-side permissions', 'Sathis Gangaboda', 'Janiru Wijekoon', '4 suggested', 3),
    ('T3 Government', 'MOE approval, provincial and zonal offices, police and traffic clearance', 'Janiru Wijekoon', 'Vishmi Wijayamanne', '3 suggested', 4),
    ('T4 Protocol', 'Chief guest, VIPs, past officials, invitations, protocol on the day', 'Vishmi Wijayamanne', NULL, '4 suggested', 5),
    ('T5 Competitions', 'Rules, rubric, submission portal, judges, judging, finalists, prizes', 'Marisha', 'Okitha Wijesiri', '8 suggested', 6),
    ('T6 Schools', 'School database, invitation packs, dispatch, phone follow-up, registration desk', 'Lehara Rajapakse', 'Sachindra Ratnayake', '10 suggested', 7),
    ('T7 Design', 'Brand kit, all artwork, posters, backdrop, certificates, print-ready files', 'Nipun Baranage', 'Kaviesha Navinan', '5 suggested', 8),
    ('T8 Media', 'Social media, content calendar, media partners, press, photo and video', 'Kaviesha Navinan', 'Isira Chirayu', '6 suggested', 9),
    ('T9 Production', 'Stage, AV, catering, printing, decor, trophies, vendor contracts', 'Janiru Wijekoon', 'Okitha Wijesiri', '6 suggested', 10),
    ('T10 Operations', 'Volunteers, run of show, seating, transport, safety, first aid, after party', 'Sachindra Ratnayake', 'Dileepa Sandaras', '10 suggested', 11),
    ('Board Committee', 'Confidential board transition, nominations, interviews, installation ceremony', 'Isira Chirayu', NULL, '3 suggested', 12);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM c360_people) THEN
    INSERT INTO c360_people (name, active) VALUES
    ('Isira Chirayu', true),
    ('Sathis Gangaboda', true),
    ('Okitha Wijesiri', true),
    ('Janiru Wijekoon', true),
    ('Vishmi Wijayamanne', true),
    ('Risindi Gunasekara', true),
    ('Marisha', true),
    ('Lehara Rajapakse', true),
    ('Sachindra Ratnayake', true),
    ('Nipun Baranage', true),
    ('Kaviesha Navinan', true),
    ('Dileepa Sandaras', true),
    ('Thulina Biman', true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM c360_sponsors) THEN
    INSERT INTO c360_sponsors (n, company, category, tier, ask, contact, designation, phone, email, intro, first_contact, last_followup, next_action, status, confirmed, received, owner, notes) VALUES
    (1, 'APIIT Sri Lanka', NULL, 'Platinum', NULL, 'Chethima Dias', 'Senior Business Development Executive', '0768601332', 'Chethima@apiit.lk', 'Direct', '2026-09-22', '2026-09-29', '2026-10-02', 'Proposal Sent', NULL, NULL, 'ISIRA', NULL),
    (2, 'AICPA & CIMA', NULL, 'Gold', NULL, 'Vithushan Sivasubramaniam', 'Manager - Markets & Relationship', '0777673358', 'vithuroyal@gmail.com', 'Lakshitha sir', '2026-09-23', '2026-09-23', '2026-10-01', 'Proposal Sent', NULL, NULL, 'ISIRA', NULL),
    (3, 'CA Sri Lanka', NULL, 'Platinum', NULL, 'Udara Rohan Jayasingha', 'Head of Brand and Corporate Communication', '0710235243', 'udaranbc@gmail.com', 'Lakshitha sir', '2026-09-03', '2026-09-22', '2026-10-01', 'Proposal Sent', NULL, NULL, 'ISIRA', NULL),
    (4, 'ANC campus- Kandy', NULL, NULL, NULL, 'Maxlin', 'Branch Manager- Kandy', '0765577743', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
    (5, 'ACBT campus', NULL, NULL, NULL, 'Ayani', 'Branch Manager- Kandy', '0761856691', 'ayani.kurukuththala@acbt.lk', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
    (6, 'IIT', NULL, NULL, NULL, 'Bhathiya', NULL, '0774810637', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
    (7, 'First Friends Campus', NULL, NULL, NULL, NULL, NULL, '0777230033', 'info@firstfriends.lk', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
    (8, 'AIBT', NULL, NULL, NULL, 'Randima Dayananda', NULL, '0770349696', 'randima.d@aibt.education', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
    (9, 'BCAS Campus', NULL, NULL, NULL, NULL, NULL, '0778444555', 'marketing@bcas.lk', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
    (10, 'Ada Derana Digital', NULL, NULL, NULL, 'Samith De Zoysa', 'Account Manager', '0719770007', 'samith.d@derana.lk', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
    (11, 'AAT SriLanka', NULL, NULL, NULL, 'Tishanga Kumarasinghe', 'Chief Executive Officer', '0777752753', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
    (12, 'NIBM', NULL, NULL, NULL, 'Shenali', 'Asst. Director- Marketing', '0774717130', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
    (13, 'NIBM', NULL, NULL, NULL, 'Supun', 'Marketing officer', '0778695921', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
    (14, 'DFCC', NULL, NULL, NULL, 'Amila', 'Marketing Manager', '0778657788', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
    (15, 'NSBM', NULL, NULL, NULL, 'Chathura', NULL, '0705445001', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
    (16, 'Esoft', NULL, NULL, NULL, 'Induka Perera', NULL, NULL, 'induka.perera@esoft.lk', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
    (17, 'CIPM', NULL, NULL, NULL, NULL, 'Asst. Manager- Business Development & Student Management', '0701788068', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
    (18, 'SLIM', NULL, NULL, NULL, 'Oshan Munasinghe', 'Executive- Business Development', '0711495116', 'oshan.m@slim.lk', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
    (19, 'Sampath Bank', NULL, NULL, NULL, NULL, NULL, NULL, 'info@sampath.lk', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
    (20, 'Hayleys Fentons', NULL, NULL, NULL, 'Ms.Naduni', 'Head of Marketing', '077 844 3453', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
    (21, 'Nanaska', NULL, NULL, NULL, 'Channa Gunawardana', 'Founder and Leading Lecturer', '0777398996', 'channa.gunawardana@dankotuwa.com', NULL, '2026-09-26', '2026-09-29', '2026-10-04', 'Proposal Sent', NULL, NULL, 'ISIRA', 'Channa replied 29 Sep (via Dankotuwa email): Nanaska / CIMA keen to sponsor. MEETING Sun 4 Oct, 6.30 PM, Nanaska office, Colombo 3. Bring tier options.'),
    (22, 'Akthari Traders', NULL, NULL, NULL, 'Thusitha Jayawardane', NULL, '0778249618', NULL, NULL, NULL, NULL, NULL, 'Proposal Sent', NULL, NULL, NULL, NULL),
    (23, 'Nawaloka', NULL, NULL, NULL, 'Theja', NULL, '0769769265', NULL, NULL, NULL, NULL, NULL, 'Not Contacted', NULL, NULL, NULL, NULL),
    (24, 'Goodrich Lanka', NULL, NULL, NULL, 'Nilindra Fernando', NULL, '0771981475', NULL, NULL, '2026-10-02', NULL, NULL, 'Proposal Sent', NULL, NULL, NULL, NULL),
    (25, 'Celcius', NULL, NULL, NULL, 'Kumaran Sanjeev', NULL, '0772672526', NULL, NULL, '2026-10-02', NULL, NULL, 'Not Contacted', NULL, NULL, NULL, NULL),
    (26, 'Shan Tea', NULL, NULL, NULL, 'Ranjeewa Senevirathne', NULL, '0740811827', NULL, NULL, '2026-10-02', NULL, NULL, 'Proposal Sent', NULL, NULL, NULL, NULL),
    (27, 'Whiteline Industries Colombo', 'Cleaning and hygiene (in kind)', 'In-Kind', NULL, 'Mr. Rishad Ismail', 'Founder and Managing Director', NULL, 'rishad@whiteline.lk', 'Direct (cold email)', '2026-09-28', '2026-09-28', '2026-10-02', 'Proposal Sent', NULL, NULL, 'ISIRA', 'AGREED by email 28 Sep to be Cleaning Partner (in kind). Coordinate with corporate manager Mr. Taariq (taariq.n@feather.lk). Confirm deliverables and logo in writing.'),
    (28, 'Outerspace Digital', 'Digital media and content (in kind)', 'In-Kind', NULL, 'Mr. Aqeel Hameed', 'CEO', NULL, 'aqeel@outerspacedigital.com', 'Direct (cold email)', '2026-09-28', '2026-09-28', '2026-10-02', 'Proposal Sent', NULL, NULL, 'ISIRA', 'Replied 28 Sep: keen to explore supporting with reels, social media and content. Book a call and agree scope.'),
    (29, 'Barista', NULL, NULL, NULL, 'Theekshana', 'Brand head', NULL, 'theekshana@barista.lk', NULL, NULL, NULL, NULL, 'Proposal Sent', NULL, NULL, NULL, 'proposal sent to Mr. Fahad'),
    (30, 'Imperial College Colombo', NULL, NULL, NULL, 'Mr. Ovin Bimsara', 'Head of Marketing', '0779336868', NULL, NULL, NULL, NULL, NULL, 'Proposal Sent', NULL, NULL, NULL, NULL),
    (31, 'CMA SriLanka', NULL, NULL, NULL, 'Mr. Indika Ratnayake', 'Manager Marketing and promotion', '0112506391', NULL, NULL, NULL, NULL, NULL, 'Not Contacted', NULL, NULL, NULL, NULL),
    (32, 'Imperial College Kandy', NULL, NULL, NULL, NULL, NULL, '0773919777', NULL, NULL, NULL, NULL, NULL, 'Proposal Sent', NULL, NULL, NULL, NULL),
    (33, 'KIU', NULL, NULL, NULL, NULL, NULL, '0112741878', 'info@kiu.ac.lk', 'Direct (cold email)', NULL, NULL, NULL, 'Proposal Sent', NULL, NULL, NULL, NULL),
    (34, 'IDM Nations Campus', NULL, NULL, NULL, 'Mr. Sanjaya Vishwanath', 'Marketing Manager', '0772432268', NULL, NULL, NULL, NULL, NULL, 'Proposal Sent', NULL, NULL, NULL, NULL),
    (35, 'Tingo Education Australia', NULL, NULL, NULL, NULL, NULL, '0741335939', NULL, NULL, NULL, NULL, NULL, 'Not Contacted', NULL, NULL, NULL, NULL),
    (36, 'Certix Matara', NULL, NULL, NULL, NULL, NULL, '0412200270', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'the number provided is invalid brow'),
    (37, 'REC Campus', NULL, NULL, NULL, NULL, NULL, '0711101010', NULL, NULL, NULL, NULL, NULL, 'Not Contacted', NULL, NULL, NULL, 'couldn''t contact the marketing department'),
    (38, 'CPM SriLanka', NULL, NULL, NULL, NULL, NULL, '0706590999', NULL, NULL, NULL, NULL, NULL, 'Not Contacted', NULL, NULL, NULL, NULL),
    (39, 'BMS Campus', NULL, NULL, NULL, 'Mr. Suraj Egodagamage', 'Marketing Manager', '0704011670', NULL, NULL, NULL, NULL, NULL, 'Proposal Sent', NULL, NULL, NULL, NULL),
    (40, 'CIM SriLanka', NULL, NULL, NULL, 'Mr. G.S Sylvester', 'SLIM- Academic Council Head', '0777368648', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
    (41, 'Royal Institute of Colombo', NULL, NULL, NULL, NULL, NULL, '0777683100 / 0112832900', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
    (42, 'IDP Education', NULL, NULL, NULL, NULL, NULL, '0117711888', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
    (43, 'AECC Global- Colombo', NULL, NULL, NULL, NULL, NULL, '0706125475', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
    (44, 'AECC Global- Kandy', NULL, NULL, NULL, NULL, NULL, '0711255660', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
    (45, 'BCI Campus- Negombo', NULL, NULL, NULL, NULL, NULL, '0706035100/ 0766989797', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
    (46, 'SIBA Campus -Kandy', NULL, NULL, NULL, NULL, NULL, '0812421693', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
    (47, 'NIIBS', NULL, NULL, NULL, NULL, NULL, '0112904666', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
    (48, 'CILT SriLanka', NULL, NULL, NULL, NULL, NULL, '0112082808', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
    (49, 'Thurya Residencies', NULL, NULL, NULL, 'Rukshan Thurya', NULL, '0707190000', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
    (50, 'ECU', NULL, NULL, NULL, 'Naveen Harsha', NULL, '0761111328', NULL, NULL, NULL, NULL, NULL, 'Proposal Sent', NULL, NULL, NULL, NULL);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM c360_weeks) THEN
    INSERT INTO c360_weeks (week, dates, start_date, end_date, focus, also, gate) VALUES
    ('W1', '6-13 Sep', '2026-09-06', '2026-09-13', 'Budget locked, proposal finished, teams appointed, MOE file drafted', 'Chief guest letters out, venue hold requested, brand kit', 'Gate 1: budget and proposal'),
    ('W2', '14-20 Sep', '2026-09-14', '2026-09-20', 'MOE application submitted and sponsorship outreach begins', 'Site visit, competition rulebook drafting, bank account', 'Gates 2 and 3'),
    ('W3', '21-27 Sep', '2026-09-21', '2026-09-27', '40 companies contacted, first meetings booked', 'Judges identified, school database build, vendor quotes', '-'),
    ('W4', '28 Sep-4 Oct', '2026-09-28', '2026-10-04', 'Backup venue held, submission portal built and tested', 'Content calendar live, board nominations open', 'Gate 4: backup venue'),
    ('W5', '5-11 Oct', '2026-10-05', '2026-10-11', 'All 120 companies contacted, first sponsor confirmed', 'Announcement campaign live, prizes finalised', '-'),
    ('W6', '12-18 Oct', '2026-10-12', '2026-10-18', 'MOE approval in hand, venue confirmed in writing', 'Top 15 meetings, invitation pack drafted, judges confirmed', 'Gate 5: MOE approval'),
    ('W7', '19-25 Oct', '2026-10-19', '2026-10-25', 'INVITATIONS DISPATCHED. Chief guest locked. Go/no-go taken', '60% funding gate, packs printed, promo creatives out', 'Gates 6, 7 and 8'),
    ('W8', '26 Oct-1 Nov', '2026-10-26', '2026-11-01', 'Registration opens, phone follow-up wave 1 to every school', 'Media partners, zonal notifications, formal VIP invites', '-'),
    ('W9', '2-8 Nov', '2026-11-02', '2026-11-08', 'Registration numbers checked against target, wave 2 calls', '80% funding, school briefing webinar', '-'),
    ('W10', '9-15 Nov', '2026-11-09', '2026-11-15', 'Submissions close, incoming board decided, vendor advances paid', 'Board photoshoot, volunteer recruitment, after-party booked', 'Gates 9, 10 and 11'),
    ('W11', '16-22 Nov', '2026-11-16', '2026-11-22', 'Judging completed, all printing sent, run of show written', 'Trophies ordered, security lists, sponsor deliverable audit', '-'),
    ('W12', '23-29 Nov', '2026-11-23', '2026-11-29', 'Finalists announced, headcount to caterer, all logistics locked', 'Press release, seating plan, transport plan, 100% collections', '-'),
    ('W13', '30 Nov-2 Dec', '2026-11-30', '2026-12-02', 'Setup, rehearsal, EVENT DAY', 'Volunteer briefing, final checklist, after party', 'EVENT');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM c360_risks) THEN
    INSERT INTO c360_risks (n, risk, likelihood, impact, warning, response, owner, decide_by, status) VALUES
    (1, 'Sponsorship falls short of Rs 5M', 'High', 'Critical', 'Under 30% confirmed by 5 October', 'Switch to the Plan B budget already written under FIN-02. Cut food tier, reduce stage scale, move to a sponsored venue. Decide on 20 Oct, not later.', 'Chairman', '2026-10-20', 'Open'),
    (2, 'Temple Trees clearance not granted', 'Medium', 'Critical', 'No written confirmation by 12 October', 'Move to the backup venue held under VEN-04. This is exactly why the backup exists. Announce before invitations print.', 'T2 Venue', '2026-10-12', 'Open'),
    (3, 'MOE approval delayed past 15 October', 'High', 'Critical', 'No reference progress after two follow-up visits', 'Escalate through a patron, an MP or a principal on the AISCA advisory side. Have a named escalation contact ready before you need one.', 'T3 Government', '2026-10-15', 'Open'),
    (4, 'All three chief guest options decline', 'Medium', 'High', 'No response from any office by 10 October', 'Move to a fourth and fifth tier of names: a leading CEO, a Central Bank official, an entrepreneur alumnus. Keep two in reserve from day one.', 'T4 Protocol', '2026-10-15', 'Open'),
    (5, 'Low school registration after invitations', 'Medium', 'High', 'Under 40% of target registrations by 5 November', 'Direct phone campaign, teacher-in-charge WhatsApp group, extend registration by one week but never extend the submission deadline.', 'T6 Schools', '2026-11-05', 'Open'),
    (6, 'Sponsors confirm but do not pay in time', 'High', 'High', 'Confirmed total far above received total on 10 November', 'Require 50% on signing as a standard term in the agreement template. Chase weekly by phone, not email.', 'T1 Sponsorship', '2026-11-10', 'Open'),
    (7, 'Board members burn out or go quiet during exams', 'High', 'Medium', 'Team heads missing two consecutive Sunday reviews', 'Deputy takes over immediately, no discussion. Check the exam calendar under OPS-01 and reallocate before the term starts.', 'Chairman', '2026-09-15', 'Open'),
    (8, 'Attendance shortfall on a Wednesday school day', 'Medium', 'High', 'Principals hesitating on the phone follow-up', 'Get the MOE letter to circulate through zonal offices, not just directly to schools. An official circular moves principals more than an invitation does.', 'T3 Government', '2026-11-01', 'Open'),
    (9, 'Vendor unavailable in the December peak season', 'Medium', 'High', 'Vendors declining to hold dates without an advance', 'Book and pay advances by 10 November. December is wedding and corporate season in Colombo.', 'T9 Production', '2026-11-10', 'Open'),
    (10, 'Competition entries are too few or too low in quality', 'Medium', 'Medium', 'Under 30 entries by 8 November', 'Run a second briefing webinar, extend outreach to A/L commerce tuition networks, and reduce the number of categories rather than run empty ones.', 'T5 Competitions', '2026-11-08', 'Open'),
    (11, 'Board transition creates internal conflict', 'Medium', 'Medium', 'Strong reactions when the incoming board is informed informally', 'This is exactly why you inform privately first. Hold one-to-one conversations with anyone who was not selected, before 15 November, and offer a defined role.', 'Board Committee', '2026-11-15', 'Open'),
    (12, 'Cash flow gap between vendor advances and sponsor payments', 'High', 'High', 'Received under Rs 1.5M by 10 November', 'Negotiate deferred payment terms with the two largest vendors upfront, or secure one sponsor willing to pay in full early in exchange for Title recognition.', 'T1 Sponsorship', '2026-11-10', 'Open');
  END IF;
END $$;

INSERT INTO c360_settings (id, event_name, event_date, venue, budget_target, review_rhythm, playbook)
VALUES (1, 'COMMERCE 360', '2026-12-02', 'Temple Trees', 5002000, 'Sunday 8pm, 30 minutes, all heads', 'Do not use randomly mixed teams. Match people to the work: sponsorship needs confident speakers who can meet corporates, T3 needs someone who can physically visit Colombo offices on weekdays, T6 needs patient callers.
Every team gets a head AND a deputy. Students disappear during exams and family events. A deputy is what keeps a workstream alive.
A head shown in red is heading two of the ten workstream teams. Reassign one of them, because a clash there means two workstreams stall at the same time.
T1 Sponsorship and T6 Schools are the two biggest workloads. Staff them heaviest.
Fixed weekly rhythm: Sunday 8pm, 30 minutes, all heads. Each head reports exactly three things: what closed, what is stuck, what they need from another team.
The chairman personally handles Title and Platinum tier conversations. Do not delegate the biggest cheques.
Anything marked Blocked for more than 7 days gets escalated to the chairman automatically. No exceptions.
Give each head a written one page scope on the day you appoint them. Verbal scopes get forgotten.')
ON CONFLICT (id) DO NOTHING;
