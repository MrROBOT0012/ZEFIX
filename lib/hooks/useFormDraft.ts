'use client'

import { useEffect, useRef } from 'react'

interface Options {
  // Extra, React-controlled state (e.g. a line-items array) that doesn't live
  // in a plain form field. Called on every autosave; merged into the snapshot
  // under its own keys.
  getExtra?: () => Record<string, unknown>
  // Called once, on mount, if a saved draft was found — including any keys
  // from getExtra — so the caller can push those back into its own state.
  onRestore?: (draft: Record<string, unknown>) => void
  // Off for edit forms — a stale draft must never clobber a real DB record.
  enabled?: boolean
}

// Autosaves an uncontrolled form's field values to localStorage as the user
// types, and restores them on next mount of the same key. This is a "don't
// lose my typing if the tab closes" safety net for new-record forms only —
// not a data layer, not offline queuing. Cleared on submit (see clearDraft).
export function useFormDraft(
  key: string,
  formRef: React.RefObject<HTMLFormElement | null>,
  { getExtra, onRestore, enabled = true }: Options = {}
) {
  const storageKey = `draft:${key}`
  const restoredRef = useRef(false)
  const optionsRef = useRef({ getExtra, onRestore })
  optionsRef.current = { getExtra, onRestore }

  useEffect(() => {
    if (!enabled) return
    const form = formRef.current
    if (!form) return

    if (!restoredRef.current) {
      restoredRef.current = true
      let raw: string | null = null
      try {
        raw = window.localStorage.getItem(storageKey)
      } catch {
        // localStorage unavailable (private browsing, etc.) - draft feature is best-effort
      }
      if (raw) {
        try {
          const draft = JSON.parse(raw) as Record<string, unknown>
          for (const [name, value] of Object.entries(draft)) {
            const field = form.elements.namedItem(name)
            if (!field || field instanceof RadioNodeList) continue
            if (field instanceof HTMLInputElement && (field.type === 'hidden' || field.type === 'file')) continue
            if (field instanceof HTMLInputElement && field.type === 'checkbox') {
              field.checked = Boolean(value)
            } else if (
              field instanceof HTMLInputElement ||
              field instanceof HTMLTextAreaElement ||
              field instanceof HTMLSelectElement
            ) {
              field.value = String(value ?? '')
            }
          }
          optionsRef.current.onRestore?.(draft)
        } catch {
          // corrupted draft - ignore and start fresh
        }
      }
    }

    let timeout: ReturnType<typeof setTimeout>
    const save = () => {
      const fd = new FormData(form)
      const snapshot: Record<string, unknown> = {}
      for (const [name, value] of fd.entries()) {
        if (name.startsWith('$ACTION') || name === 'line_items' || value instanceof File) continue
        snapshot[name] = value
      }
      Object.assign(snapshot, optionsRef.current.getExtra?.())
      try {
        window.localStorage.setItem(storageKey, JSON.stringify(snapshot))
      } catch {
        // storage full/unavailable - best-effort only
      }
    }
    const debouncedSave = () => {
      clearTimeout(timeout)
      timeout = setTimeout(save, 400)
    }

    form.addEventListener('input', debouncedSave)
    form.addEventListener('change', debouncedSave)
    return () => {
      clearTimeout(timeout)
      form.removeEventListener('input', debouncedSave)
      form.removeEventListener('change', debouncedSave)
    }
  }, [enabled, storageKey, formRef])

  const clearDraft = () => {
    try {
      window.localStorage.removeItem(storageKey)
    } catch {
      // best-effort
    }
  }

  return { clearDraft }
}
