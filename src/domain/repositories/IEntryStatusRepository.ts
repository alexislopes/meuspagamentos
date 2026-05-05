import type { EntryStatus } from '../value-objects/EntryStatus'
import type { YearMonth } from '../value-objects/YearMonth'

export interface IEntryStatusRepository {
  getStatusesForMonth(month: YearMonth): Promise<Map<string, EntryStatus>>
  getStatusesForMonths(months: YearMonth[]): Promise<Map<string, Map<string, EntryStatus>>>
  setStatus(month: YearMonth, entryId: string, status: EntryStatus): Promise<void>
  removeStatus(month: YearMonth, entryId: string): Promise<void>
}
