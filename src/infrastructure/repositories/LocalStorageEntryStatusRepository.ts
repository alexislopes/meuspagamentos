import type { IEntryStatusRepository } from '../../domain/repositories/IEntryStatusRepository'
import type { EntryStatus } from '../../domain/value-objects/EntryStatus'
import type { YearMonth } from '../../domain/value-objects/YearMonth'
import { EntryStatusMapper } from '../mappers/EntryStatusMapper'
import type { StatusStoreJSON } from '../mappers/EntryStatusMapper'

const STORAGE_KEY = 'meuspagamentos:entry-statuses'

export class LocalStorageEntryStatusRepository implements IEntryStatusRepository {
  private readStore(): StatusStoreJSON {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    try {
      return JSON.parse(raw) as StatusStoreJSON
    } catch {
      return {}
    }
  }

  private writeStore(store: StatusStoreJSON): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store))
  }

  async getStatusesForMonth(month: YearMonth): Promise<Map<string, EntryStatus>> {
    const store = this.readStore()
    return EntryStatusMapper.monthToMap(store[month.key])
  }

  async getStatusesForMonths(months: YearMonth[]): Promise<Map<string, Map<string, EntryStatus>>> {
    const store = this.readStore()
    const result = new Map<string, Map<string, EntryStatus>>()
    for (const month of months) {
      const monthMap = EntryStatusMapper.monthToMap(store[month.key])
      if (monthMap.size > 0) {
        result.set(month.key, monthMap)
      }
    }
    return result
  }

  async setStatus(month: YearMonth, entryId: string, status: EntryStatus): Promise<void> {
    const store = this.readStore()
    if (!store[month.key]) {
      store[month.key] = {}
    }
    store[month.key][entryId] = status
    this.writeStore(store)
  }

  async removeStatus(month: YearMonth, entryId: string): Promise<void> {
    const store = this.readStore()
    if (store[month.key]) {
      delete store[month.key][entryId]
      if (Object.keys(store[month.key]).length === 0) {
        delete store[month.key]
      }
      this.writeStore(store)
    }
  }
}
