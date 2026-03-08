import { FixedExpense } from '../../domain/entities/FixedExpense'
import { Money } from '../../domain/value-objects/Money'
import { YearMonth } from '../../domain/value-objects/YearMonth'

export interface ExpenseRevisionJSON {
  fromMonth: string
  name: string
  amountInCents: number
  dueDay: number
}

export interface FixedExpenseJSON {
  id: string
  name: string
  amountInCents: number
  dueDay: number
  createdAt: string
  deletedFromMonth: string | null
  revisions?: ExpenseRevisionJSON[]
}

export class FixedExpenseMapper {
  static toDomain(json: FixedExpenseJSON): FixedExpense {
    const revisions = (json.revisions ?? []).map((r) => ({
      fromMonth: YearMonth.fromKey(r.fromMonth),
      name: r.name,
      amount: Money.fromCents(r.amountInCents),
      dueDay: r.dueDay,
    }))

    return new FixedExpense({
      id: json.id,
      name: json.name,
      amount: Money.fromCents(json.amountInCents),
      dueDay: json.dueDay,
      createdAt: YearMonth.fromKey(json.createdAt),
      deletedFromMonth: json.deletedFromMonth
        ? YearMonth.fromKey(json.deletedFromMonth)
        : null,
      revisions,
    })
  }

  static toJSON(entity: FixedExpense): FixedExpenseJSON {
    return {
      id: entity.id,
      name: entity.name,
      amountInCents: entity.amount.inCents,
      dueDay: entity.dueDay,
      createdAt: entity.createdAt.key,
      deletedFromMonth: entity.deletedFromMonth?.key ?? null,
      revisions: entity.revisions.map((r) => ({
        fromMonth: r.fromMonth.key,
        name: r.name,
        amountInCents: r.amount.inCents,
        dueDay: r.dueDay,
      })),
    }
  }
}
