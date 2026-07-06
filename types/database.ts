// Hand-written to match 0001_initial_schema.sql.
// Replace with `supabase gen types typescript --project-id <ref>` once the
// project is linked — the generated output will be a drop-in replacement.
//
// NOTE: All entity types use `type` (not `interface`) so they pass TypeScript's
// conditional-type check `Database['public'] extends GenericSchema` inside
// SupabaseClient. Interfaces don't distributively satisfy index-signature types
// in conditional type positions; type aliases do.

export type Json = string | number | boolean | null | { [key: string]: Json } | Json[]

// ── Enums ────────────────────────────────────────────────────────────────────

export type BusinessType    = 'services' | 'agriculture'
export type JobStatus       = 'active' | 'in_progress' | 'completed' | 'on_hold'
export type EstimateStatus  = 'draft' | 'sent' | 'approved' | 'rejected' | 'expired' | 'converted'
export type InvoiceType     = 'standard' | 'deposit' | 'final'
export type InvoiceStatus   = 'draft' | 'sent' | 'partially_paid' | 'paid' | 'overdue' | 'cancelled'
export type PaymentMethod   = 'cash' | 'check' | 'ach' | 'wire' | 'zelle' | 'credit_card' | 'debit_card' | 'other'
export type DocumentType    = 'estimate' | 'invoice' | 'receipt'
export type AuditAction     = 'created' | 'updated' | 'voided' | 'deleted'
export type AuditEntityType = 'invoice' | 'estimate' | 'payment' | 'expense'

// ── Row types ────────────────────────────────────────────────────────────────

export type Company = {
  id: string
  legal_name: string
  dba_name: string | null
  logo_url: string | null
  business_type: BusinessType
  address: string | null
  phone: string | null
  email: string | null
  ein: string | null
  default_payment_terms: string | null
  default_payment_instructions: string | null
  default_invoice_notes: string | null
  default_estimate_notes: string | null
  sales_tax_rate: number
  next_invoice_number: number
  next_estimate_number: number
  next_receipt_number: number
  created_at: string
  updated_at: string
}

export type Customer = {
  id: string
  company_id: string
  name: string
  company_name: string | null
  contact_person: string | null
  billing_address: string | null
  job_location: string | null
  phone: string | null
  email: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export type Job = {
  id: string
  company_id: string
  customer_id: string | null
  job_name: string
  location: string | null
  start_date: string | null
  status: JobStatus
  quoted_amount: number | null
  notes: string | null
  created_at: string
  updated_at: string
}

export type JobSummary = Job & {
  invoiced_amount: number
  customer_payments: number
  job_expenses: number
  estimated_profit: number
  actual_profit: number
}

export type Estimate = {
  id: string
  company_id: string
  customer_id: string | null
  job_id: string | null
  estimate_number: number
  revision_number: number
  parent_estimate_id: string | null
  estimate_date: string
  expiration_date: string | null
  job_location: string | null
  job_name: string | null
  equipment_info: string | null
  description_of_work: string | null
  subtotal: number
  discount: number
  tax_rate: number
  tax_amount: number
  total: number
  notes: string | null
  terms: string | null
  status: EstimateStatus
  converted_invoice_id: string | null
  created_at: string
  updated_at: string
}

export type EstimateLineItem = {
  id: string
  estimate_id: string
  description: string
  quantity: number
  unit_price: number
  line_total: number
  sort_order: number
}

export type Invoice = {
  id: string
  company_id: string
  customer_id: string | null
  job_id: string | null
  invoice_number: number
  invoice_type: InvoiceType
  linked_final_invoice_id: string | null
  invoice_date: string
  due_date: string | null
  billing_address: string | null
  job_location: string | null
  job_name: string | null
  equipment_info: string | null
  po_number: string | null
  description_of_work: string | null
  subtotal: number
  discount: number
  tax_rate: number
  tax_amount: number
  total: number
  amount_paid: number
  balance_due: number       // generated: total - amount_paid
  payment_terms: string | null
  payment_instructions: string | null
  notes: string | null
  status: InvoiceStatus
  source_estimate_id: string | null
  created_at: string
  updated_at: string
}

export type InvoiceLineItem = {
  id: string
  invoice_id: string
  description: string
  quantity: number
  unit_price: number
  line_total: number
  sort_order: number
}

export type Payment = {
  id: string
  invoice_id: string
  payment_date: string
  amount: number
  payment_method: PaymentMethod
  reference_number: string | null
  notes: string | null
  created_at: string
}

export type Receipt = {
  id: string
  company_id: string
  payment_id: string
  invoice_id: string
  customer_id: string
  receipt_number: number
  payment_date: string
  payment_amount: number
  payment_method: PaymentMethod
  reference_number: string | null
  remaining_balance: number
  notes: string | null
  created_at: string
}

export type ExpenseCategory = {
  id: string
  company_id: string
  name: string
  is_default: boolean
}

export type Expense = {
  id: string
  company_id: string
  job_id: string | null
  expense_date: string
  vendor: string | null
  amount: number
  description: string | null
  category_id: string | null
  payment_method: PaymentMethod | null
  is_owner_funded: boolean
  related_customer_id: string | null
  related_invoice_id: string | null
  receipt_available: boolean
  receipt_attachment_url: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export type DocumentIndex = {
  id: string
  document_type: DocumentType
  record_id: string
  file_url: string
  generated_at: string
}

export type AuditLog = {
  id: string
  entity_type: AuditEntityType
  entity_id: string
  action: AuditAction
  changed_fields: Json | null
  changed_at: string
  changed_by: string | null
}

// ── Insert types (omit generated/defaulted fields) ───────────────────────────

export type CompanyInsert          = Omit<Company, 'id' | 'created_at' | 'updated_at'>
export type CustomerInsert         = Omit<Customer, 'id' | 'created_at' | 'updated_at'>
export type JobInsert              = Omit<Job, 'id' | 'created_at' | 'updated_at'>
export type EstimateInsert         = Omit<Estimate, 'id' | 'estimate_number' | 'created_at' | 'updated_at'>
export type EstimateLineItemInsert = Omit<EstimateLineItem, 'id'>
export type InvoiceInsert          = Omit<Invoice, 'id' | 'invoice_number' | 'balance_due' | 'amount_paid' | 'created_at' | 'updated_at'>
export type InvoiceLineItemInsert  = Omit<InvoiceLineItem, 'id'>
export type PaymentInsert          = Omit<Payment, 'id' | 'created_at'>
export type ReceiptInsert          = Omit<Receipt, 'id' | 'receipt_number' | 'created_at'>
export type ExpenseCategoryInsert  = Omit<ExpenseCategory, 'id'>
export type ExpenseInsert          = Omit<Expense, 'id' | 'created_at' | 'updated_at'>
export type DocumentIndexInsert    = Omit<DocumentIndex, 'id' | 'generated_at'>
export type AuditLogInsert         = Omit<AuditLog, 'id' | 'changed_at'>

// ── Update types ─────────────────────────────────────────────────────────────

export type CompanyUpdate          = Partial<CompanyInsert>
export type CustomerUpdate         = Partial<CustomerInsert>
export type JobUpdate              = Partial<JobInsert>
export type EstimateUpdate         = Partial<EstimateInsert>
export type EstimateLineItemUpdate = Partial<EstimateLineItemInsert>
export type InvoiceUpdate          = Partial<InvoiceInsert>
export type InvoiceLineItemUpdate  = Partial<InvoiceLineItemInsert>
export type PaymentUpdate          = Partial<PaymentInsert>
export type ExpenseCategoryUpdate  = Partial<ExpenseCategoryInsert>
export type ExpenseUpdate          = Partial<ExpenseInsert>

// ── Relationship helper ───────────────────────────────────────────────────────
// GenericRelationship[] is required by @supabase/supabase-js on every Table and View.

type Rels = {
  foreignKeyName: string
  columns: string[]
  isOneToOne?: boolean
  referencedRelation: string
  referencedColumns: string[]
}[]

// ── Database shape ────────────────────────────────────────────────────────────
// Satisfies the GenericSchema constraint from @supabase/supabase-js so that
// SupabaseClient<Database> resolves query return types correctly.

export type Database = {
  public: {
    Tables: {
      companies:           { Row: Company;           Insert: CompanyInsert           & { id?: string; created_at?: string; updated_at?: string };                                                  Update: CompanyUpdate;          Relationships: Rels }
      customers:           { Row: Customer;           Insert: CustomerInsert           & { id?: string; created_at?: string; updated_at?: string };                                                  Update: CustomerUpdate;          Relationships: Rels }
      jobs:                { Row: Job;                Insert: JobInsert                & { id?: string; created_at?: string; updated_at?: string };                                                  Update: JobUpdate;               Relationships: Rels }
      estimates:           { Row: Estimate;           Insert: EstimateInsert           & { id?: string; estimate_number?: number; created_at?: string; updated_at?: string };                        Update: EstimateUpdate;          Relationships: Rels }
      estimate_line_items: { Row: EstimateLineItem;   Insert: EstimateLineItemInsert   & { id?: string };                                                                                            Update: EstimateLineItemUpdate;  Relationships: Rels }
      invoices:            { Row: Invoice;            Insert: InvoiceInsert            & { id?: string; invoice_number?: number; amount_paid?: number; created_at?: string; updated_at?: string };  Update: InvoiceUpdate;           Relationships: Rels }
      invoice_line_items:  { Row: InvoiceLineItem;    Insert: InvoiceLineItemInsert    & { id?: string };                                                                                            Update: InvoiceLineItemUpdate;   Relationships: Rels }
      payments:            { Row: Payment;            Insert: PaymentInsert            & { id?: string; created_at?: string };                                                                       Update: PaymentUpdate;           Relationships: Rels }
      receipts:            { Row: Receipt;            Insert: ReceiptInsert            & { id?: string; receipt_number?: number; created_at?: string };                                              Update: Partial<ReceiptInsert>;  Relationships: Rels }
      expense_categories:  { Row: ExpenseCategory;    Insert: ExpenseCategoryInsert    & { id?: string };                                                                                            Update: ExpenseCategoryUpdate;   Relationships: Rels }
      expenses:            { Row: Expense;            Insert: ExpenseInsert            & { id?: string; created_at?: string; updated_at?: string };                                                  Update: ExpenseUpdate;           Relationships: Rels }
      documents_index:     { Row: DocumentIndex;      Insert: DocumentIndexInsert      & { id?: string; generated_at?: string };                                                                     Update: Partial<DocumentIndexInsert>; Relationships: Rels }
      audit_log:           { Row: AuditLog;           Insert: AuditLogInsert           & { id?: string; changed_at?: string };                                                                       Update: Partial<AuditLogInsert>; Relationships: Rels }
    }
    Views: {
      jobs_summary: { Row: JobSummary; Relationships: Rels }
    }
    Functions: { [_ in never]: never }
    Enums: {
      business_type:     BusinessType
      job_status:        JobStatus
      estimate_status:   EstimateStatus
      invoice_type:      InvoiceType
      invoice_status:    InvoiceStatus
      payment_method:    PaymentMethod
      document_type:     DocumentType
      audit_action:      AuditAction
      audit_entity_type: AuditEntityType
    }
    CompositeTypes: { [_ in never]: never }
  }
}
