import type { SupabaseClient } from '@supabase/supabase-js'

// Supabase/PostgREST returns at most 1,000 rows per request.
// Page through the table so totals and charts use every row.
export async function fetchAll<T = any>(
  client: SupabaseClient,
  table: string,
  columns: string,
  filter?: (q: any) => any,
  pageSize = 1000
): Promise<T[]> {
  const rows: T[] = []
  for (let from = 0; ; from += pageSize) {
    let q: any = client.from(table).select(columns)
    if (filter) q = filter(q)
    const { data, error } = await q.order('id', { ascending: true }).range(from, from + pageSize - 1)
    if (error) throw error
    rows.push(...((data || []) as T[]))
    if (!data || data.length < pageSize) break
  }
  return rows
}
