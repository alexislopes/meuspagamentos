import { EntryStatus } from '../../domain/value-objects/EntryStatus'

export type StatusStoreJSON = Record<string, Record<string, string>>

export class EntryStatusMapper {
  static monthToMap(
    monthData: Record<string, string> | undefined,
  ): Map<string, EntryStatus> {
    const map = new Map<string, EntryStatus>()
    if (!monthData) return map
    for (const [entryId, status] of Object.entries(monthData)) {
      if (Object.values(EntryStatus).includes(status as EntryStatus)) {
        map.set(entryId, status as EntryStatus)
      }
    }
    return map
  }
}
