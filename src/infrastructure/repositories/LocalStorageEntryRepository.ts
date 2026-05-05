import type { Entry } from '../../domain/entities/Entry'
import type { IEntryRepository } from '../../domain/repositories/IEntryRepository'
import { EntryMapper } from '../mappers/EntryMapper'
import type { EntryJSON } from '../mappers/EntryMapper'

const STORAGE_KEY = 'meuspagamentos:entries'

export class LocalStorageEntryRepository implements IEntryRepository {
  private readAll(): EntryJSON[] {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    try {
      return JSON.parse(raw) as EntryJSON[]
    } catch {
      return []
    }
  }

  private writeAll(items: EntryJSON[]): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
  }

  async getAll(): Promise<Entry[]> {
    return this.readAll().map(EntryMapper.toDomain)
  }

  async getById(id: string): Promise<Entry | null> {
    const items = this.readAll()
    const found = items.find((item) => item.id === id)
    return found ? EntryMapper.toDomain(found) : null
  }

  async save(entry: Entry): Promise<void> {
    const items = this.readAll()
    items.push(EntryMapper.toJSON(entry))
    this.writeAll(items)
  }

  async update(entry: Entry): Promise<void> {
    const items = this.readAll()
    const index = items.findIndex((item) => item.id === entry.id)
    if (index === -1) {
      throw new Error(`Entry not found: ${entry.id}`)
    }
    items[index] = EntryMapper.toJSON(entry)
    this.writeAll(items)
  }
}
