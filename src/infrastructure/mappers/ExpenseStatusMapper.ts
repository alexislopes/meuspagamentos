import { ExpenseStatus } from '../../domain/value-objects/ExpenseStatus'

export type StatusStoreJSON = Record<string, Record<string, string>>

export class ExpenseStatusMapper {
  static monthToMap(
    monthData: Record<string, string> | undefined,
  ): Map<string, ExpenseStatus> {
    const map = new Map<string, ExpenseStatus>()
    if (!monthData) return map
    for (const [expenseId, status] of Object.entries(monthData)) {
      if (Object.values(ExpenseStatus).includes(status as ExpenseStatus)) {
        map.set(expenseId, status as ExpenseStatus)
      }
    }
    return map
  }
}
