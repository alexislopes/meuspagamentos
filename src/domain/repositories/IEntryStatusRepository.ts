import type { EntryStatus } from '../value-objects/EntryStatus'
import type { YearMonth } from '../value-objects/YearMonth'

export interface IEntryStatusRepository {
  getStatusesForMonth(month: YearMonth): Promise<Map<string, EntryStatus>>
  getStatusesForMonths(months: YearMonth[]): Promise<Map<string, Map<string, EntryStatus>>>
  getSnapshotsForMonth(month: YearMonth): Promise<Map<string, number>>
  setStatus(
    month: YearMonth,
    entryId: string,
    status: EntryStatus,
    snapshotAmountCents?: number,
  ): Promise<void>
  removeStatus(month: YearMonth, entryId: string): Promise<void>
}
