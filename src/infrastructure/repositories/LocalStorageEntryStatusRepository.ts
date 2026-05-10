import type { IEntryStatusRepository } from '../../domain/repositories/IEntryStatusRepository'
import type { EntryStatus } from '../../domain/value-objects/EntryStatus'
import type { YearMonth } from '../../domain/value-objects/YearMonth'
import { EntryStatusMapper } from '../mappers/EntryStatusMapper'
import type { StatusStoreJSON } from '../mappers/EntryStatusMapper'

const STORAGE_KEY = 'meuspagamentos:entry-statuses'
const SNAPSHOT_KEY = 'meuspagamentos:entry-status-snapshots'

type SnapshotStoreJSON = Record<string, Record<string, number>>

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

  private readSnapshots(): SnapshotStoreJSON {
    const raw = localStorage.getItem(SNAPSHOT_KEY)
    if (!raw) return {}
    try {
      return JSON.parse(raw) as SnapshotStoreJSON
    } catch {
      return {}
    }
  }

  private writeSnapshots(store: SnapshotStoreJSON): void {
    localStorage.setItem(SNAPSHOT_KEY, JSON.stringify(store))
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

  async getSnapshotsForMonth(month: YearMonth): Promise<Map<string, number>> {
    const store = this.readSnapshots()
    const monthData = store[month.key] ?? {}
    const map = new Map<string, number>()
    for (const [entryId, cents] of Object.entries(monthData)) {
      map.set(entryId, cents)
    }
    return map
  }

  async setStatus(
    month: YearMonth,
    entryId: string,
    status: EntryStatus,
    snapshotAmountCents?: number,
  ): Promise<void> {
    const store = this.readStore()
    if (!store[month.key]) store[month.key] = {}
    store[month.key][entryId] = status
    this.writeStore(store)

    const snapshots = this.readSnapshots()
    if (snapshotAmountCents !== undefined) {
      if (!snapshots[month.key]) snapshots[month.key] = {}
      snapshots[month.key][entryId] = snapshotAmountCents
    } else if (snapshots[month.key]) {
      delete snapshots[month.key][entryId]
      if (Object.keys(snapshots[month.key]).length === 0) delete snapshots[month.key]
    }
    this.writeSnapshots(snapshots)
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
    const snapshots = this.readSnapshots()
    if (snapshots[month.key]) {
      delete snapshots[month.key][entryId]
      if (Object.keys(snapshots[month.key]).length === 0) delete snapshots[month.key]
      this.writeSnapshots(snapshots)
    }
  }
}
