import type { Entry } from '../entities/Entry'
import type { MonthlyEntryView } from '../entities/MonthlyEntryView'
import { EntryStatus } from '../value-objects/EntryStatus'
import type { YearMonth } from '../value-objects/YearMonth'

export interface MonthlySummary {
  totalIncome: number
  totalExpense: number
  confirmedIncome: number
  pendingIncome: number
  confirmedExpense: number
  pendingExpense: number
  balance: number
}

export class MonthlyEntryService {
  buildMonthView(
    allEntries: Entry[],
    month: YearMonth,
    statusOverrides: Map<string, EntryStatus>,
  ): MonthlyEntryView[] {
    return allEntries
      .filter((entry) => entry.isActiveInMonth(month))
      .map((entry) => {
        const values = entry.getValuesForMonth(month)
        return {
          entryId: entry.id,
          name: values.name,
          amount: values.amount,
          dueDay: values.dueDay,
          kind: entry.kind,
          status: statusOverrides.get(entry.id) ?? EntryStatus.PENDING,
        }
      })
      .sort((a, b) => a.dueDay - b.dueDay)
  }

  computeSummary(views: MonthlyEntryView[]): MonthlySummary {
    let totalIncome = 0
    let totalExpense = 0
    let confirmedIncome = 0
    let pendingIncome = 0
    let confirmedExpense = 0
    let pendingExpense = 0

    for (const v of views) {
      if (v.status === EntryStatus.SKIPPED) continue
      const cents = v.amount.inCents

      if (v.kind === 'income') {
        totalIncome += cents
        if (v.status === EntryStatus.CONFIRMED) confirmedIncome += cents
        else if (v.status === EntryStatus.PENDING) pendingIncome += cents
      } else {
        totalExpense += cents
        if (v.status === EntryStatus.CONFIRMED) confirmedExpense += cents
        else if (v.status === EntryStatus.PENDING) pendingExpense += cents
      }
    }

    return {
      totalIncome,
      totalExpense,
      confirmedIncome,
      pendingIncome,
      confirmedExpense,
      pendingExpense,
      balance: totalIncome - totalExpense,
    }
  }
}
