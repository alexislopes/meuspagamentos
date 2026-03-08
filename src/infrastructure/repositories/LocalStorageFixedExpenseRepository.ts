import type { FixedExpense } from '../../domain/entities/FixedExpense'
import type { IFixedExpenseRepository } from '../../domain/repositories/IFixedExpenseRepository'
import { FixedExpenseMapper } from '../mappers/FixedExpenseMapper'
import type { FixedExpenseJSON } from '../mappers/FixedExpenseMapper'

const STORAGE_KEY = 'meuspagamentos:expenses'

export class LocalStorageFixedExpenseRepository implements IFixedExpenseRepository {
  private readAll(): FixedExpenseJSON[] {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    try {
      return JSON.parse(raw) as FixedExpenseJSON[]
    } catch {
      return []
    }
  }

  private writeAll(items: FixedExpenseJSON[]): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
  }

  async getAll(): Promise<FixedExpense[]> {
    return this.readAll().map(FixedExpenseMapper.toDomain)
  }

  async getById(id: string): Promise<FixedExpense | null> {
    const items = this.readAll()
    const found = items.find((item) => item.id === id)
    return found ? FixedExpenseMapper.toDomain(found) : null
  }

  async save(expense: FixedExpense): Promise<void> {
    const items = this.readAll()
    items.push(FixedExpenseMapper.toJSON(expense))
    this.writeAll(items)
  }

  async update(expense: FixedExpense): Promise<void> {
    const items = this.readAll()
    const index = items.findIndex((item) => item.id === expense.id)
    if (index === -1) {
      throw new Error(`Expense not found: ${expense.id}`)
    }
    items[index] = FixedExpenseMapper.toJSON(expense)
    this.writeAll(items)
  }
}
