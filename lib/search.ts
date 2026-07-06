// Case-insensitive "does any of these fields contain the query" check, used
// by list-view search boxes. Matching happens in JS after a company-scoped
// fetch rather than via DB ilike/or-across-tables — this app's data volume
// (a single small business) makes that simpler and safer than hand-built
// PostgREST filter strings, with no real cost.
export function matchesSearch(haystacks: (string | number | null | undefined)[], query: string): boolean {
  const q = query.trim().toLowerCase()
  if (!q) return true
  return haystacks.some((h) => h != null && String(h).toLowerCase().includes(q))
}
