import type { IEntryStatusRepository } from '../../domain/repositories/IEntryStatusRepository'
import { EntryStatus } from '../../domain/value-objects/EntryStatus'
import type { YearMonth } from '../../domain/value-objects/YearMonth'
import { supabase } from '../supabase/client'

interface EntryStatusRow {
  month: string
  entry_id: string
  status: string
  snapshot_amount_cents: number | null
}

export class SupabaseEntryStatusRepository implements IEntryStatusRepository {
  async getStatusesForMonth(month: YearMonth): Promise<Map<string, EntryStatus>> {
    const { data, error } = await supabase
      .from('entry_statuses')
      .select('entry_id, status')
      .eq('month', month.key)

    if (error) throw new Error(`Failed to fetch statuses: ${error.message}`)

    const map = new Map<string, EntryStatus>()
    for (const row of (data as Pick<EntryStatusRow, 'entry_id' | 'status'>[])) {
      if (Object.values(EntryStatus).includes(row.status as EntryStatus)) {
        map.set(row.entry_id, row.status as EntryStatus)
      }
    }
    return map
  }

  async getStatusesForMonths(months: YearMonth[]): Promise<Map<string, Map<string, EntryStatus>>> {
    const monthKeys = months.map((m) => m.key)

    const { data, error } = await supabase
      .from('entry_statuses')
      .select('month, entry_id, status')
      .in('month', monthKeys)

    if (error) throw new Error(`Failed to fetch statuses: ${error.message}`)

    const result = new Map<string, Map<string, EntryStatus>>()
    for (const row of data as Pick<EntryStatusRow, 'month' | 'entry_id' | 'status'>[]) {
      if (!Object.values(EntryStatus).includes(row.status as EntryStatus)) continue
      let monthMap = result.get(row.month)
      if (!monthMap) {
        monthMap = new Map<string, EntryStatus>()
        result.set(row.month, monthMap)
      }
      monthMap.set(row.entry_id, row.status as EntryStatus)
    }
    return result
  }

  async getSnapshotsForMonth(month: YearMonth): Promise<Map<string, number>> {
    const { data, error } = await supabase
      .from('entry_statuses')
      .select('entry_id, snapshot_amount_cents')
      .eq('month', month.key)

    if (error) throw new Error(`Failed to fetch snapshots: ${error.message}`)

    const map = new Map<string, number>()
    for (const row of data as Pick<EntryStatusRow, 'entry_id' | 'snapshot_amount_cents'>[]) {
      if (row.snapshot_amount_cents !== null) {
        map.set(row.entry_id, row.snapshot_amount_cents)
      }
    }
    return map
  }

  async setStatus(
    month: YearMonth,
    entryId: string,
    status: EntryStatus,
    snapshotAmountCents?: number,
  ): Promise<void> {
    const { error } = await supabase
      .from('entry_statuses')
      .upsert({
        month: month.key,
        entry_id: entryId,
        status,
        snapshot_amount_cents: snapshotAmountCents ?? null,
      })

    if (error) throw new Error(`Failed to set status: ${error.message}`)
  }

  async removeStatus(month: YearMonth, entryId: string): Promise<void> {
    const { error } = await supabase
      .from('entry_statuses')
      .delete()
      .eq('month', month.key)
      .eq('entry_id', entryId)

    if (error) throw new Error(`Failed to remove status: ${error.message}`)
  }
}
