import type { IEntryStatusRepository } from '../../domain/repositories/IEntryStatusRepository'
import { EntryStatus } from '../../domain/value-objects/EntryStatus'
import type { YearMonth } from '../../domain/value-objects/YearMonth'
import { supabase } from '../supabase/client'

interface EntryStatusRow {
  month: string
  entry_id: string
  status: string
}

export class SupabaseEntryStatusRepository implements IEntryStatusRepository {
  async getStatusesForMonth(month: YearMonth): Promise<Map<string, EntryStatus>> {
    const { data, error } = await supabase
      .from('entry_statuses')
      .select('entry_id, status')
      .eq('month', month.key)

    if (error) throw new Error(`Failed to fetch statuses: ${error.message}`)

    const map = new Map<string, EntryStatus>()
    for (const row of (data as EntryStatusRow[])) {
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
    for (const row of data as EntryStatusRow[]) {
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

  async setStatus(month: YearMonth, entryId: string, status: EntryStatus): Promise<void> {
    const { error } = await supabase
      .from('entry_statuses')
      .upsert({
        month: month.key,
        entry_id: entryId,
        status,
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
