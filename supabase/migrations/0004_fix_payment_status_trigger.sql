-- ============================================================
-- Fix sync_invoice_on_payment() — the CASE expression's branches
-- are untyped string literals, so Postgres infers the whole CASE
-- as `text` instead of `invoice_status`, and the UPDATE fails with:
--   column "status" is of type invoice_status but expression is of type text
-- This means EVERY payment insert has been failing silently (the
-- app's actions.ts don't check this trigger-level error). Explicit
-- cast fixes it. Apply via Supabase Dashboard > SQL Editor.
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
         status = (CASE
           -- Never touch cancelled invoices
           WHEN status = 'cancelled' THEN 'cancelled'
           -- Keep draft if no payment has been recorded yet
           WHEN status = 'draft' AND v_paid = 0 THEN 'draft'
           WHEN v_paid >= v_total THEN 'paid'
           WHEN v_paid > 0       THEN 'partially_paid'
           ELSE                       'sent'
         END)::invoice_status
   WHERE id = v_invoice_id;

  RETURN NEW;
END;
$$;
