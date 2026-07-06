'use client'

import { useActionState } from 'react'
import { updateSettings, type SettingsState } from './actions'
import { FormField, inputCls } from '@/components/ui/FormField'
import type { Company } from '@/types/database'

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100">
        <h2 className="text-sm font-semibold text-gray-700">{title}</h2>
      </div>
      <div className="px-6 py-5 grid grid-cols-1 sm:grid-cols-2 gap-4">{children}</div>
    </div>
  )
}

function FullRow({ children }: { children: React.ReactNode }) {
  return <div className="sm:col-span-2">{children}</div>
}

export default function SettingsForm({ company }: { company: Company }) {
  const [state, formAction, isPending] = useActionState<SettingsState, FormData>(
    updateSettings,
    null
  )

  const taxPct = company.sales_tax_rate
    ? (company.sales_tax_rate * 100).toFixed(4).replace(/\.?0+$/, '')
    : ''

  return (
    <form action={formAction} className="space-y-6">
      {/* ── Company Info ─────────────────────────────────────────── */}
      <Section title="Company Info">
        <FormField label="Legal Name" required>
          <input
            name="legal_name"
            type="text"
            required
            defaultValue={company.legal_name}
            className={inputCls}
          />
        </FormField>

        <FormField label="DBA / Trade Name">
          <input
            name="dba_name"
            type="text"
            defaultValue={company.dba_name ?? ''}
            placeholder="If different from legal name"
            className={inputCls}
          />
        </FormField>

        <FormField label="EIN" hint="XX-XXXXXXX">
          <input
            name="ein"
            type="text"
            defaultValue={company.ein ?? ''}
            placeholder="12-3456789"
            className={inputCls}
          />
        </FormField>

        <FormField label="Email">
          <input
            name="email"
            type="email"
            defaultValue={company.email ?? ''}
            className={inputCls}
          />
        </FormField>

        <FormField label="Phone">
          <input
            name="phone"
            type="tel"
            defaultValue={company.phone ?? ''}
            className={inputCls}
          />
        </FormField>

        <FullRow>
          <FormField label="Address">
            <textarea
              name="address"
              rows={3}
              defaultValue={company.address ?? ''}
              className={inputCls}
            />
          </FormField>
        </FullRow>
      </Section>

      {/* ── Branding ─────────────────────────────────────────────── */}
      <Section title="Branding">
        <FullRow>
          <FormField label="Logo URL" hint="Paste the Supabase Storage URL after uploading your logo. Logo upload UI coming in Phase 3.">
            <input
              name="logo_url"
              type="url"
              defaultValue={company.logo_url ?? ''}
              placeholder="https://…"
              className={inputCls}
            />
          </FormField>
        </FullRow>
      </Section>

      {/* ── Document Defaults ─────────────────────────────────────── */}
      <Section title="Document Defaults">
        <FormField label="Default Sales Tax Rate (%)" hint="Applied to new estimates and invoices. Can be overridden per document.">
          <input
            name="sales_tax_rate"
            type="number"
            step="0.01"
            min="0"
            max="100"
            defaultValue={taxPct}
            placeholder="0"
            className={inputCls}
          />
        </FormField>

        <FormField label="Default Payment Terms">
          <input
            name="default_payment_terms"
            type="text"
            defaultValue={company.default_payment_terms ?? ''}
            placeholder="e.g. Net 30, Due on receipt"
            className={inputCls}
          />
        </FormField>

        <FullRow>
          <FormField label="Default Payment Instructions">
            <textarea
              name="default_payment_instructions"
              rows={3}
              defaultValue={company.default_payment_instructions ?? ''}
              placeholder="e.g. Make checks payable to Zelaya & Co. LLC — Zelle: …"
              className={inputCls}
            />
          </FormField>
        </FullRow>

        <FullRow>
          <FormField label="Default Invoice Notes">
            <textarea
              name="default_invoice_notes"
              rows={3}
              defaultValue={company.default_invoice_notes ?? ''}
              className={inputCls}
            />
          </FormField>
        </FullRow>

        <FullRow>
          <FormField label="Default Estimate Notes">
            <textarea
              name="default_estimate_notes"
              rows={3}
              defaultValue={company.default_estimate_notes ?? ''}
              className={inputCls}
            />
          </FormField>
        </FullRow>
      </Section>

      {/* ── Numbering ─────────────────────────────────────────────── */}
      <Section title="Document Numbering">
        <FormField
          label="Next Invoice #"
          hint="The number assigned to the next new invoice."
        >
          <input
            name="next_invoice_number"
            type="number"
            min="1"
            step="1"
            required
            defaultValue={company.next_invoice_number}
            className={inputCls}
          />
        </FormField>

        <FormField label="Next Estimate #">
          <input
            name="next_estimate_number"
            type="number"
            min="1"
            step="1"
            required
            defaultValue={company.next_estimate_number}
            className={inputCls}
          />
        </FormField>

        <FormField label="Next Receipt #">
          <input
            name="next_receipt_number"
            type="number"
            min="1"
            step="1"
            required
            defaultValue={company.next_receipt_number}
            className={inputCls}
          />
        </FormField>

        <FullRow>
          <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
            Changing these counters can create gaps in your numbering sequence. Only adjust if
            you are migrating from another system or correcting an error.
          </p>
        </FullRow>
      </Section>

      {/* ── Footer ───────────────────────────────────────────────── */}
      <div className="flex items-center gap-4">
        <button
          type="submit"
          disabled={isPending}
          className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {isPending ? 'Saving…' : 'Save settings'}
        </button>

        {state?.success && (
          <span className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
            Saved successfully.
          </span>
        )}
        {state?.error && (
          <span className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            {state.error}
          </span>
        )}
      </div>
    </form>
  )
}
