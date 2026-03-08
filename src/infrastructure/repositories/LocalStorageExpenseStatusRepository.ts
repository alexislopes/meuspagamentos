import type { IExpenseStatusRepository } from '../../domain/repositories/IExpenseStatusRepository'
import type { ExpenseStatus } from '../../domain/value-objects/ExpenseStatus'
import type { YearMonth } from '../../domain/value-objects/YearMonth'
import { ExpenseStatusMapper } from '../mappers/ExpenseStatusMapper'
import type { StatusStoreJSON } from '../mappers/ExpenseStatusMapper'

const STORAGE_KEY = 'meuspagamentos:statuses'

export class LocalStorageExpenseStatusRepository implements IExpenseStatusRepository {
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

  async getStatusesForMonth(month: YearMonth): Promise<Map<string, ExpenseStatus>> {
    const store = this.readStore()
    return ExpenseStatusMapper.monthToMap(store[month.key])
  }

  async setStatus(month: YearMonth, expenseId: string, status: ExpenseStatus): Promise<void> {
    const store = this.readStore()
    if (!store[month.key]) {
      store[month.key] = {}
    }
    store[month.key][expenseId] = status
    this.writeStore(store)
  }

  async removeStatus(month: YearMonth, expenseId: string): Promise<void> {
    const store = this.readStore()
    if (store[month.key]) {
      delete store[month.key][expenseId]
      if (Object.keys(store[month.key]).length === 0) {
        delete store[month.key]
      }
      this.writeStore(store)
    }
  }
}
