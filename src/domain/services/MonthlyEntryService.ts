import type { Entry } from '../entities/Entry'
import type { MonthlyEntryView } from '../entities/MonthlyEntryView'
import { EntryStatus, EntryValueType } from '../value-objects/EntryStatus'
import type { YearMonth } from '../value-objects/YearMonth'
import { FormulaResolver } from './FormulaResolver'
import { Money } from '../value-objects/Money'
import { describeFormula } from './formulaDescription'

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
  private readonly resolver = new FormulaResolver()

  buildMonthView(
    allEntries: Entry[],
    month: YearMonth,
    statusOverrides: Map<string, EntryStatus>,
    snapshotsCents: Map<string, number>,
  ): MonthlyEntryView[] {
    const active = allEntries.filter((e) => e.isActiveInMonth(month))

    const fixedViews: MonthlyEntryView[] = active
      .filter((e) => e.valueType === EntryValueType.FIXED)
      .map((entry) => {
        const v = entry.getValuesForMonth(month)
        if (v.valueType !== EntryValueType.FIXED) {
          throw new Error('expected FIXED values')
        }
        return {
          entryId: entry.id,
          name: v.name,
          amount: v.amount,
          dueDay: v.dueDay,
          kind: entry.kind,
          status: statusOverrides.get(entry.id) ?? EntryStatus.PENDING,
          context: entry.context,
          valueType: EntryValueType.FIXED,
        }
      })

    const relativeViews: MonthlyEntryView[] = active
      .filter((e) => e.valueType === EntryValueType.RELATIVE)
      .map((entry) => {
        const v = entry.getValuesForMonth(month)
        if (v.valueType !== EntryValueType.RELATIVE) {
          throw new Error('expected RELATIVE values')
        }
        const status = statusOverrides.get(entry.id) ?? EntryStatus.PENDING
        const snapshot = snapshotsCents.get(entry.id)
        const amount = (status === EntryStatus.CONFIRMED && snapshot !== undefined)
          ? Money.fromCents(snapshot)
          : this.resolver.resolve({
              formula: v.formula,
              ownerContext: entry.context,
              fixedViews,
            })
        return {
          entryId: entry.id,
          name: v.name,
          amount,
          dueDay: v.dueDay,
          kind: entry.kind,
          status,
          context: entry.context,
          valueType: EntryValueType.RELATIVE,
          formulaDescription: describeFormula(v.formula),
        }
      })

    return [...fixedViews, ...relativeViews].sort((a, b) => a.dueDay - b.dueDay)
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
