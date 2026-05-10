import type { MonthlyEntryView } from '../entities/MonthlyEntryView'
import type { EntryFormula, FormulaTerm } from '../value-objects/EntryFormula'
import type { ExpenseContext } from '../value-objects/ExpenseContext'
import {
  EntryStatus,
  FormulaSetType,
  type EntryKind,
} from '../value-objects/EntryStatus'
import { Money } from '../value-objects/Money'

export interface FormulaResolutionInput {
  formula: EntryFormula
  ownerContext: ExpenseContext
  fixedViews: MonthlyEntryView[]
}

export class FormulaResolver {
  resolve(input: FormulaResolutionInput): Money {
    const { formula, ownerContext, fixedViews } = input

    if (formula.terms.length === 0) {
      throw new Error('Formula must have at least one term')
    }
    if (formula.percentage <= 0) {
      throw new Error('Formula percentage must be > 0')
    }

    const eligible = fixedViews.filter(
      (v) => v.context === ownerContext && v.status !== EntryStatus.SKIPPED,
    )

    let baseCents = 0
    for (const term of formula.terms) {
      baseCents += term.sign * this.sumTerm(term, eligible)
    }

    const cents = Math.max(0, Math.round((baseCents * formula.percentage) / 100))
    return Money.fromCents(cents)
  }

  private sumTerm(term: FormulaTerm, views: MonthlyEntryView[]): number {
    if (term.set.type === FormulaSetType.ALL) {
      const kind: EntryKind = term.set.kind
      return views
        .filter((v) => v.kind === kind)
        .reduce((acc, v) => acc + v.amount.inCents, 0)
    }
    const ids = new Set(term.set.entryIds)
    return views
      .filter((v) => ids.has(v.entryId))
      .reduce((acc, v) => acc + v.amount.inCents, 0)
  }
}
