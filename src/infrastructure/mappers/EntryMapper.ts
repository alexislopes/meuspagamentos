import { Entry, type EntryRevision } from '../../domain/entities/Entry'
import { ExpenseContext } from '../../domain/value-objects/ExpenseContext'
import {
  EntryValueType,
  type EntryKind,
  type Recurrence,
} from '../../domain/value-objects/EntryStatus'
import type { EntryFormula } from '../../domain/value-objects/EntryFormula'
import { Money } from '../../domain/value-objects/Money'
import { YearMonth } from '../../domain/value-objects/YearMonth'

export interface FixedEntryRevisionJSON {
  valueType: EntryValueType.FIXED
  fromMonth: string
  name: string
  amountInCents: number
  dueDay: number
}

export interface RelativeEntryRevisionJSON {
  valueType: EntryValueType.RELATIVE
  fromMonth: string
  name: string
  formula: EntryFormula
  dueDay: number
}

export type EntryRevisionJSON = FixedEntryRevisionJSON | RelativeEntryRevisionJSON

interface BaseEntryJSON {
  id: string
  name: string
  dueDay: number
  kind: EntryKind
  recurrence: Recurrence
  createdAt: string
  deletedFromMonth: string | null
  context: ExpenseContext
}

export interface FixedEntryJSON extends BaseEntryJSON {
  valueType: EntryValueType.FIXED
  amountInCents: number
  revisions?: FixedEntryRevisionJSON[]
}

export interface RelativeEntryJSON extends BaseEntryJSON {
  valueType: EntryValueType.RELATIVE
  formula: EntryFormula
  revisions?: RelativeEntryRevisionJSON[]
}

export type EntryJSON = FixedEntryJSON | RelativeEntryJSON

export class EntryMapper {
  static toDomain(json: EntryJSON): Entry {
    const common = {
      id: json.id,
      name: json.name,
      dueDay: json.dueDay,
      kind: json.kind,
      recurrence: json.recurrence,
      createdAt: YearMonth.fromKey(json.createdAt),
      deletedFromMonth: json.deletedFromMonth ? YearMonth.fromKey(json.deletedFromMonth) : null,
      context: json.context,
    }
    if (json.valueType === EntryValueType.FIXED) {
      const revisions: EntryRevision[] = (json.revisions ?? []).map((r) => ({
        valueType: EntryValueType.FIXED,
        fromMonth: YearMonth.fromKey(r.fromMonth),
        name: r.name,
        amount: Money.fromCents(r.amountInCents),
        dueDay: r.dueDay,
      }))
      return new Entry({
        ...common,
        valueType: EntryValueType.FIXED,
        amount: Money.fromCents(json.amountInCents),
        revisions,
      })
    }
    const revisions: EntryRevision[] = (json.revisions ?? []).map((r) => ({
      valueType: EntryValueType.RELATIVE,
      fromMonth: YearMonth.fromKey(r.fromMonth),
      name: r.name,
      formula: r.formula,
      dueDay: r.dueDay,
    }))
    return new Entry({
      ...common,
      valueType: EntryValueType.RELATIVE,
      formula: json.formula,
      revisions,
    })
  }

  static toJSON(entity: Entry): EntryJSON {
    const base: BaseEntryJSON = {
      id: entity.id,
      name: entity.name,
      dueDay: entity.dueDay,
      kind: entity.kind,
      recurrence: entity.recurrence,
      createdAt: entity.createdAt.key,
      deletedFromMonth: entity.deletedFromMonth?.key ?? null,
      context: entity.context,
    }
    if (entity.valueType === EntryValueType.FIXED) {
      const revs: FixedEntryRevisionJSON[] = []
      for (const r of entity.revisions) {
        if (r.valueType === EntryValueType.FIXED) {
          revs.push({
            valueType: EntryValueType.FIXED,
            fromMonth: r.fromMonth.key,
            name: r.name,
            amountInCents: r.amount.inCents,
            dueDay: r.dueDay,
          })
        }
      }
      const out: FixedEntryJSON = {
        ...base,
        valueType: EntryValueType.FIXED,
        amountInCents: (entity.amount as Money).inCents,
      }
      if (revs.length > 0) out.revisions = revs
      return out
    }
    const revs: RelativeEntryRevisionJSON[] = []
    for (const r of entity.revisions) {
      if (r.valueType === EntryValueType.RELATIVE) {
        revs.push({
          valueType: EntryValueType.RELATIVE,
          fromMonth: r.fromMonth.key,
          name: r.name,
          formula: r.formula,
          dueDay: r.dueDay,
        })
      }
    }
    const out: RelativeEntryJSON = {
      ...base,
      valueType: EntryValueType.RELATIVE,
      formula: entity.formula as EntryFormula,
    }
    if (revs.length > 0) out.revisions = revs
    return out
  }
}
