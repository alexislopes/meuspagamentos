import { Entry } from '../../domain/entities/Entry'
import { ExpenseContext } from '../../domain/value-objects/ExpenseContext'
import type { EntryKind, Recurrence } from '../../domain/value-objects/EntryStatus'
import { Money } from '../../domain/value-objects/Money'
import { YearMonth } from '../../domain/value-objects/YearMonth'

export interface EntryRevisionJSON {
  fromMonth: string
  name: string
  amountInCents: number
  dueDay: number
}

export interface EntryJSON {
  id: string
  name: string
  amountInCents: number
  dueDay: number
  kind: EntryKind
  recurrence: Recurrence
  createdAt: string
  deletedFromMonth: string | null
  context: ExpenseContext
  revisions?: EntryRevisionJSON[]
}

export class EntryMapper {
  static toDomain(json: EntryJSON): Entry {
    const revisions = (json.revisions ?? []).map((r) => ({
      fromMonth: YearMonth.fromKey(r.fromMonth),
      name: r.name,
      amount: Money.fromCents(r.amountInCents),
      dueDay: r.dueDay,
    }))

    return new Entry({
      id: json.id,
      name: json.name,
      amount: Money.fromCents(json.amountInCents),
      dueDay: json.dueDay,
      kind: json.kind,
      recurrence: json.recurrence,
      createdAt: YearMonth.fromKey(json.createdAt),
      deletedFromMonth: json.deletedFromMonth
        ? YearMonth.fromKey(json.deletedFromMonth)
        : null,
      context: json.context,
      revisions,
    })
  }

  static toJSON(entity: Entry): EntryJSON {
    return {
      id: entity.id,
      name: entity.name,
      amountInCents: entity.amount.inCents,
      dueDay: entity.dueDay,
      kind: entity.kind,
      recurrence: entity.recurrence,
      createdAt: entity.createdAt.key,
      deletedFromMonth: entity.deletedFromMonth?.key ?? null,
      context: entity.context,
      revisions: entity.revisions.map((r) => ({
        fromMonth: r.fromMonth.key,
        name: r.name,
        amountInCents: r.amount.inCents,
        dueDay: r.dueDay,
      })),
    }
  }
}
