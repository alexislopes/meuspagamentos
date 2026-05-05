import type { Entry } from '../entities/Entry'
import type { ExpenseContext } from '../value-objects/ExpenseContext'

export interface IEntryRepository {
  getAll(context: ExpenseContext): Promise<Entry[]>
  getById(id: string): Promise<Entry | null>
  save(entry: Entry): Promise<void>
  update(entry: Entry): Promise<void>
}
