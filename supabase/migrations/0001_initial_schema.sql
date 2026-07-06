-- ============================================================
-- Zelaya Finance — Initial Schema
-- Apply via Supabase Dashboard > SQL Editor, or supabase db push
-- ============================================================

-- ── Extensions ──────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ── Enums ───────────────────────────────────────────────────
CREATE TYPE business_type     AS ENUM ('services', 'agriculture');
CREATE TYPE job_status        AS ENUM ('active', 'in_progress', 'completed', 'on_hold');
CREATE TYPE estimate_status   AS ENUM ('draft', 'sent', 'approved', 'rejected', 'expired', 'converted');
CREATE TYPE invoice_type      AS ENUM ('standard', 'deposit', 'final');
CREATE TYPE invoice_status    AS ENUM ('draft', 'sent', 'partially_paid', 'paid', 'overdue', 'cancelled');
CREATE TYPE payment_method    AS ENUM ('cash', 'check', 'ach', 'wire', 'zelle', 'credit_card', 'debit_card', 'other');
CREATE TYPE document_type     AS ENUM ('estimate', 'invoice', 'receipt');
CREATE TYPE audit_action      AS ENUM ('created', 'updated', 'voided', 'deleted');
CREATE TYPE audit_entity_type AS ENUM ('invoice', 'estimate', 'payment', 'expense');

-- ── Utility: auto-update updated_at ─────────────────────────
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- ============================================================
-- CORE TABLES
-- ============================================================

-- ── companies ───────────────────────────────────────────────
CREATE TABLE companies (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  legal_name                TEXT NOT NULL,
  dba_name                  TEXT,
  logo_url                  TEXT,
  business_type             business_type NOT NULL DEFAULT 'services',
  address                   TEXT,
  phone                     TEXT,
  email                     TEXT,
  ein                       TEXT,
  default_payment_terms     TEXT,
  default_payment_instructions TEXT,
  default_invoice_notes     TEXT,
  default_estimate_notes    TEXT,
  sales_tax_rate            NUMERIC(6, 4) NOT NULL DEFAULT 0,
  next_invoice_number       INTEGER NOT NULL DEFAULT 1001,
  next_estimate_number      INTEGER NOT NULL DEFAULT 1001,
  next_receipt_number       INTEGER NOT NULL DEFAULT 1001,
  created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_companies_updated_at
  BEFORE UPDATE ON companies
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── customers ───────────────────────────────────────────────
CREATE TABLE customers (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id      UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  company_name    TEXT,
  contact_person  TEXT,
  billing_address TEXT,
  job_location    TEXT,
  phone           TEXT,
  email           TEXT,
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_customers_updated_at
  BEFORE UPDATE ON customers
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX idx_customers_company_id ON customers(company_id);

-- ── jobs ────────────────────────────────────────────────────
-- Lightweight project grouping. Profit figures are computed in
-- the jobs_summary view — not stored — to avoid the sync drift
-- the old Excel Jobs sheet had to manage manually.
CREATE TABLE jobs (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id     UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  customer_id    UUID REFERENCES customers(id) ON DELETE SET NULL,
  job_name       TEXT NOT NULL,
  location       TEXT,
  start_date     DATE,
  status         job_status NOT NULL DEFAULT 'active',
  quoted_amount  NUMERIC(12, 2),
  notes          TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_jobs_updated_at
  BEFORE UPDATE ON jobs
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX idx_jobs_company_id  ON jobs(company_id);
CREATE INDEX idx_jobs_customer_id ON jobs(customer_id);
CREATE INDEX idx_jobs_status      ON jobs(status);

-- ── estimates ───────────────────────────────────────────────
CREATE TABLE estimates (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id           UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  customer_id          UUID REFERENCES customers(id) ON DELETE SET NULL,
  job_id               UUID REFERENCES jobs(id) ON DELETE SET NULL,
  estimate_number      INTEGER NOT NULL,
  revision_number      INTEGER NOT NULL DEFAULT 1,
  parent_estimate_id   UUID REFERENCES estimates(id) ON DELETE SET NULL,
  estimate_date        DATE NOT NULL DEFAULT CURRENT_DATE,
  expiration_date      DATE,
  job_location         TEXT,
  job_name             TEXT,
  equipment_info       TEXT,
  description_of_work  TEXT,
  subtotal             NUMERIC(12, 2) NOT NULL DEFAULT 0,
  discount             NUMERIC(12, 2) NOT NULL DEFAULT 0,
  tax_rate             NUMERIC(6, 4)  NOT NULL DEFAULT 0,
  tax_amount           NUMERIC(12, 2) NOT NULL DEFAULT 0,
  total                NUMERIC(12, 2) NOT NULL DEFAULT 0,
  notes                TEXT,
  terms                TEXT,
  status               estimate_status NOT NULL DEFAULT 'draft',
  converted_invoice_id UUID,           -- FK added below after invoices table
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (company_id, estimate_number)
);

CREATE TRIGGER trg_estimates_updated_at
  BEFORE UPDATE ON estimates
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX idx_estimates_company_id  ON estimates(company_id);
CREATE INDEX idx_estimates_customer_id ON estimates(customer_id);
CREATE INDEX idx_estimates_job_id      ON estimates(job_id);
CREATE INDEX idx_estimates_status      ON estimates(status);

-- ── estimate_line_items ─────────────────────────────────────
CREATE TABLE estimate_line_items (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  estimate_id UUID NOT NULL REFERENCES estimates(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  quantity    NUMERIC(10, 3) NOT NULL DEFAULT 1,
  unit_price  NUMERIC(12, 2) NOT NULL DEFAULT 0,
  line_total  NUMERIC(12, 2) NOT NULL DEFAULT 0,
  sort_order  INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX idx_estimate_line_items_estimate_id ON estimate_line_items(estimate_id);

-- ── invoices ────────────────────────────────────────────────
CREATE TABLE invoices (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id              UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  customer_id             UUID REFERENCES customers(id) ON DELETE SET NULL,
  job_id                  UUID REFERENCES jobs(id) ON DELETE SET NULL,
  invoice_number          INTEGER NOT NULL,
  invoice_type            invoice_type NOT NULL DEFAULT 'standard',
  linked_final_invoice_id UUID REFERENCES invoices(id) ON DELETE SET NULL,
  invoice_date            DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date                DATE,
  billing_address         TEXT,
  job_location            TEXT,
  job_name                TEXT,
  equipment_info          TEXT,
  po_number               TEXT,
  description_of_work     TEXT,
  subtotal                NUMERIC(12, 2) NOT NULL DEFAULT 0,
  discount                NUMERIC(12, 2) NOT NULL DEFAULT 0,
  tax_rate                NUMERIC(6, 4)  NOT NULL DEFAULT 0,
  tax_amount              NUMERIC(12, 2) NOT NULL DEFAULT 0,
  total                   NUMERIC(12, 2) NOT NULL DEFAULT 0,
  amount_paid             NUMERIC(12, 2) NOT NULL DEFAULT 0,
  balance_due             NUMERIC(12, 2) GENERATED ALWAYS AS (total - amount_paid) STORED,
  payment_terms           TEXT,
  payment_instructions    TEXT,
  notes                   TEXT,
  status                  invoice_status NOT NULL DEFAULT 'draft',
  source_estimate_id      UUID REFERENCES estimates(id) ON DELETE SET NULL,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (company_id, invoice_number)
);

CREATE TRIGGER trg_invoices_updated_at
  BEFORE UPDATE ON invoices
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX idx_invoices_company_id  ON invoices(company_id);
CREATE INDEX idx_invoices_customer_id ON invoices(customer_id);
CREATE INDEX idx_invoices_job_id      ON invoices(job_id);
CREATE INDEX idx_invoices_status      ON invoices(status);
CREATE INDEX idx_invoices_due_date    ON invoices(due_date);

-- Back-fill the FK from estimates → invoices now that invoices exists
ALTER TABLE estimates
  ADD CONSTRAINT estimates_converted_invoice_id_fkey
  FOREIGN KEY (converted_invoice_id) REFERENCES invoices(id) ON DELETE SET NULL;

-- ── invoice_line_items ──────────────────────────────────────
CREATE TABLE invoice_line_items (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id  UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  quantity    NUMERIC(10, 3) NOT NULL DEFAULT 1,
  unit_price  NUMERIC(12, 2) NOT NULL DEFAULT 0,
  line_total  NUMERIC(12, 2) NOT NULL DEFAULT 0,
  sort_order  INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX idx_invoice_line_items_invoice_id ON invoice_line_items(invoice_id);

-- ── payments ────────────────────────────────────────────────
CREATE TABLE payments (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id       UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  payment_date     DATE NOT NULL DEFAULT CURRENT_DATE,
  amount           NUMERIC(12, 2) NOT NULL,
  payment_method   payment_method NOT NULL DEFAULT 'other',
  reference_number TEXT,
  notes            TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_payments_invoice_id   ON payments(invoice_id);
CREATE INDEX idx_payments_payment_date ON payments(payment_date);

-- ── receipts ────────────────────────────────────────────────
CREATE TABLE receipts (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id        UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  payment_id        UUID NOT NULL REFERENCES payments(id) ON DELETE CASCADE,
  invoice_id        UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  customer_id       UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  receipt_number    INTEGER NOT NULL,
  payment_date      DATE NOT NULL,
  payment_amount    NUMERIC(12, 2) NOT NULL,
  payment_method    payment_method NOT NULL,
  reference_number  TEXT,
  remaining_balance NUMERIC(12, 2) NOT NULL DEFAULT 0,
  notes             TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (company_id, receipt_number)
);

CREATE INDEX idx_receipts_company_id  ON receipts(company_id);
CREATE INDEX idx_receipts_invoice_id  ON receipts(invoice_id);
CREATE INDEX idx_receipts_payment_id  ON receipts(payment_id);
CREATE INDEX idx_receipts_customer_id ON receipts(customer_id);

-- ── expense_categories ──────────────────────────────────────
CREATE TABLE expense_categories (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  is_default BOOLEAN NOT NULL DEFAULT FALSE,
  UNIQUE (company_id, name)
);

CREATE INDEX idx_expense_categories_company_id ON expense_categories(company_id);

-- ── expenses ────────────────────────────────────────────────
-- is_owner_funded: Joel personally paid; business owes/recognizes it
-- as a contribution. Replaces the old "Owner Contribution" transaction type —
-- same expense, flagged so bookkeeping can track what's owed back to Joel.
CREATE TABLE expenses (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id            UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  job_id                UUID REFERENCES jobs(id) ON DELETE SET NULL,
  expense_date          DATE NOT NULL,
  vendor                TEXT,
  amount                NUMERIC(12, 2) NOT NULL,
  description           TEXT,
  category_id           UUID REFERENCES expense_categories(id) ON DELETE SET NULL,
  payment_method        payment_method,
  is_owner_funded       BOOLEAN NOT NULL DEFAULT FALSE,
  related_customer_id   UUID REFERENCES customers(id) ON DELETE SET NULL,
  related_invoice_id    UUID REFERENCES invoices(id) ON DELETE SET NULL,
  receipt_available     BOOLEAN NOT NULL DEFAULT FALSE,
  receipt_attachment_url TEXT,
  notes                 TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_expenses_updated_at
  BEFORE UPDATE ON expenses
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX idx_expenses_company_id   ON expenses(company_id);
CREATE INDEX idx_expenses_job_id       ON expenses(job_id);
CREATE INDEX idx_expenses_expense_date ON expenses(expense_date);
CREATE INDEX idx_expenses_is_owner_funded ON expenses(is_owner_funded) WHERE is_owner_funded = TRUE;

-- ── documents_index ─────────────────────────────────────────
CREATE TABLE documents_index (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_type document_type NOT NULL,
  record_id     UUID NOT NULL,
  file_url      TEXT NOT NULL,
  generated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_documents_index_record_id ON documents_index(record_id);

-- ── audit_log ───────────────────────────────────────────────
CREATE TABLE audit_log (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type    audit_entity_type NOT NULL,
  entity_id      UUID NOT NULL,
  action         audit_action NOT NULL,
  changed_fields JSONB,
  changed_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  changed_by     UUID   -- nullable: v1 is single-admin; ready for multi-user later
);

CREATE INDEX idx_audit_log_entity ON audit_log(entity_type, entity_id);
CREATE INDEX idx_audit_log_changed_at ON audit_log(changed_at);

-- ============================================================
-- SEQUENTIAL NUMBER ASSIGNMENT
-- Reads the current counter, assigns it, and increments atomically
-- so numbers are never skipped or reused even with concurrent sessions.
-- Triggers fire only when *_number IS NULL so the import script
-- (which omits the number) gets auto-assigned values, while any
-- direct insert with an explicit number (e.g. tests) bypasses the trigger.
-- ============================================================

CREATE OR REPLACE FUNCTION assign_estimate_number()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE v_num INTEGER;
BEGIN
  UPDATE companies
     SET next_estimate_number = next_estimate_number + 1
   WHERE id = NEW.company_id
   RETURNING next_estimate_number - 1 INTO v_num;
  NEW.estimate_number := v_num;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_assign_estimate_number
  BEFORE INSERT ON estimates
  FOR EACH ROW
  WHEN (NEW.estimate_number IS NULL)
  EXECUTE FUNCTION assign_estimate_number();

-- Make estimate_number deferrable-nullable for the trigger (NOT NULL enforced post-trigger)
ALTER TABLE estimates ALTER COLUMN estimate_number DROP NOT NULL;
ALTER TABLE estimates ADD CONSTRAINT estimates_estimate_number_not_null
  CHECK (estimate_number IS NOT NULL);

CREATE OR REPLACE FUNCTION assign_invoice_number()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE v_num INTEGER;
BEGIN
  UPDATE companies
     SET next_invoice_number = next_invoice_number + 1
   WHERE id = NEW.company_id
   RETURNING next_invoice_number - 1 INTO v_num;
  NEW.invoice_number := v_num;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_assign_invoice_number
  BEFORE INSERT ON invoices
  FOR EACH ROW
  WHEN (NEW.invoice_number IS NULL)
  EXECUTE FUNCTION assign_invoice_number();

ALTER TABLE invoices ALTER COLUMN invoice_number DROP NOT NULL;
ALTER TABLE invoices ADD CONSTRAINT invoices_invoice_number_not_null
  CHECK (invoice_number IS NOT NULL);

CREATE OR REPLACE FUNCTION assign_receipt_number()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE v_num INTEGER;
BEGIN
  UPDATE companies
     SET next_receipt_number = next_receipt_number + 1
   WHERE id = NEW.company_id
   RETURNING next_receipt_number - 1 INTO v_num;
  NEW.receipt_number := v_num;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_assign_receipt_number
  BEFORE INSERT ON receipts
  FOR EACH ROW
  WHEN (NEW.receipt_number IS NULL)
  EXECUTE FUNCTION assign_receipt_number();

ALTER TABLE receipts ALTER COLUMN receipt_number DROP NOT NULL;
ALTER TABLE receipts ADD CONSTRAINT receipts_receipt_number_not_null
  CHECK (receipt_number IS NOT NULL);

-- ============================================================
-- PAYMENT TRIGGER — keeps invoices.amount_paid in sync and
-- auto-transitions invoice status on payment changes.
-- ============================================================

CREATE OR REPLACE FUNCTION sync_invoice_on_payment()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  v_invoice_id UUID;
  v_total      NUMERIC;
  v_paid       NUMERIC;
BEGIN
  v_invoice_id := COALESCE(NEW.invoice_id, OLD.invoice_id);

  SELECT total INTO v_total FROM invoices WHERE id = v_invoice_id;

  SELECT COALESCE(SUM(amount), 0) INTO v_paid
    FROM payments WHERE invoice_id = v_invoice_id;

  UPDATE invoices
     SET amount_paid = v_paid,
         status = CASE
           -- Never touch cancelled invoices
           WHEN status = 'cancelled' THEN 'cancelled'
           -- Keep draft if no payment has been recorded yet
           WHEN status = 'draft' AND v_paid = 0 THEN 'draft'
           WHEN v_paid >= v_total THEN 'paid'
           WHEN v_paid > 0       THEN 'partially_paid'
           ELSE                       'sent'
         END
   WHERE id = v_invoice_id;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_sync_invoice_on_payment
  AFTER INSERT OR UPDATE OR DELETE ON payments
  FOR EACH ROW EXECUTE FUNCTION sync_invoice_on_payment();

-- ============================================================
-- JOBS SUMMARY VIEW
-- Computes invoiced_amount, payments received, job expenses, and
-- estimated/actual profit without storing them (avoids sync drift).
-- ============================================================

CREATE VIEW jobs_summary AS
SELECT
  j.*,
  COALESCE(inv.invoiced_amount,   0) AS invoiced_amount,
  COALESCE(inv.customer_payments, 0) AS customer_payments,
  COALESCE(exp.job_expenses,      0) AS job_expenses,
  -- estimated profit: what was quoted/invoiced vs what was spent
  COALESCE(inv.invoiced_amount,   0) - COALESCE(exp.job_expenses, 0) AS estimated_profit,
  -- actual profit: cash actually collected vs what was spent
  COALESCE(inv.customer_payments, 0) - COALESCE(exp.job_expenses, 0) AS actual_profit
FROM jobs j
LEFT JOIN (
  SELECT job_id,
         SUM(total)       AS invoiced_amount,
         SUM(amount_paid) AS customer_payments
    FROM invoices
   WHERE job_id IS NOT NULL
     AND status <> 'cancelled'
   GROUP BY job_id
) inv ON inv.job_id = j.id
LEFT JOIN (
  SELECT job_id,
         SUM(amount) AS job_expenses
    FROM expenses
   WHERE job_id IS NOT NULL
   GROUP BY job_id
) exp ON exp.job_id = j.id;

-- ============================================================
-- ROW LEVEL SECURITY
-- Single-user v1: authenticated users can access all rows.
-- Schema is ready for per-company scoping when multi-user arrives.
-- ============================================================

ALTER TABLE companies          ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers          ENABLE ROW LEVEL SECURITY;
ALTER TABLE jobs               ENABLE ROW LEVEL SECURITY;
ALTER TABLE estimates          ENABLE ROW LEVEL SECURITY;
ALTER TABLE estimate_line_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices           ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_line_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments           ENABLE ROW LEVEL SECURITY;
ALTER TABLE receipts           ENABLE ROW LEVEL SECURITY;
ALTER TABLE expense_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses           ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents_index    ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log          ENABLE ROW LEVEL SECURITY;

-- Authenticated users get full access (single-admin v1)
DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'companies','customers','jobs','estimates','estimate_line_items',
    'invoices','invoice_line_items','payments','receipts',
    'expense_categories','expenses','documents_index','audit_log'
  ] LOOP
    EXECUTE format(
      'CREATE POLICY authenticated_full_access ON %I FOR ALL TO authenticated USING (true) WITH CHECK (true)',
      tbl
    );
  END LOOP;
END;
$$;

-- ============================================================
-- SEED DATA — expense_categories
-- Seeded for Zelaya & Co. LLC once the company row is inserted.
-- The INSERT below is a no-op until a companies row exists;
-- run it after seeding the company row, or handle in the app's
-- onboarding flow.
-- ============================================================

-- Default categories (is_default = true means shown by default, not deletable in UI)
-- Actual insert happens relative to the company row — see application seed or §9 import script.
-- Keeping this as a comment so the migration is self-contained and idempotent.

-- INSERT INTO expense_categories (company_id, name, is_default) VALUES
--   (<company_id>, 'Materials & Supplies',      true),
--   (<company_id>, 'Equipment & Tools',         true),
--   (<company_id>, 'Subcontractors',            true),
--   (<company_id>, 'Transportation & Vehicle',  true),
--   (<company_id>, 'Insurance',                 true),
--   (<company_id>, 'Licenses & Permits',        true),
--   (<company_id>, 'Marketing & Advertising',   true),
--   (<company_id>, 'Office & Administrative',   true),
--   (<company_id>, 'Utilities',                 true),
--   (<company_id>, 'Meals & Entertainment',     true),
--   (<company_id>, 'Professional Services',     true),
--   (<company_id>, 'Other',                     true);
