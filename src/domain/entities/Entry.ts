import { ExpenseContext } from '../value-objects/ExpenseContext'
import {
  EntryValueType,
  type EntryKind,
  type Recurrence,
} from '../value-objects/EntryStatus'
import type { EntryFormula } from '../value-objects/EntryFormula'
import { Money } from '../value-objects/Money'
import { YearMonth } from '../value-objects/YearMonth'

export interface FixedEntryRevision {
  valueType: EntryValueType.FIXED
  fromMonth: YearMonth
  name: string
  amount: Money
  dueDay: number
}

export interface RelativeEntryRevision {
  valueType: EntryValueType.RELATIVE
  fromMonth: YearMonth
  name: string
  formula: EntryFormula
  dueDay: number
}

export type EntryRevision = FixedEntryRevision | RelativeEntryRevision

export interface FixedMonthlyValues {
  valueType: EntryValueType.FIXED
  name: string
  amount: Money
  dueDay: number
}

export interface RelativeMonthlyValues {
  valueType: EntryValueType.RELATIVE
  name: string
  formula: EntryFormula
  dueDay: number
}

export type MonthlyValues = FixedMonthlyValues | RelativeMonthlyValues

export interface EntryProps {
  id: string
  name: string
  dueDay: number
  kind: EntryKind
  recurrence: Recurrence
  createdAt: YearMonth
  deletedFromMonth: YearMonth | null
  context: ExpenseContext
  valueType: EntryValueType
  amount?: Money
  formula?: EntryFormula
  revisions?: EntryRevision[]
}

export class Entry {
  readonly id: string
  readonly name: string
  readonly dueDay: number
  readonly kind: EntryKind
  readonly recurrence: Recurrence
  readonly createdAt: YearMonth
  readonly context: ExpenseContext
  readonly valueType: EntryValueType
  readonly amount?: Money
  readonly formula?: EntryFormula
  private _deletedFromMonth: YearMonth | null
  private _revisions: EntryRevision[]

  constructor(props: EntryProps) {
    if (props.dueDay < 1 || props.dueDay > 31) {
      throw new Error('Due day must be between 1 and 31')
    }
    if (props.name.trim().length === 0) {
      throw new Error('Entry name cannot be empty')
    }
    if (props.recurrence === 'once' && props.revisions && props.revisions.length > 0) {
      throw new Error('One-off entries cannot have revisions')
    }

    if (props.valueType === EntryValueType.FIXED) {
      if (!props.amount) throw new Error('Fixed entry requires amount')
      if (props.formula) throw new Error('Fixed entry must not have formula')
    } else {
      if (!props.formula) throw new Error('Relative entry requires formula')
      if (props.amount) throw new Error('Relative entry must not have amount')
      if (props.recurrence === 'once') {
        throw new Error('Relative entries must be monthly (once not supported in v1)')
      }
    }

    for (const rev of props.revisions ?? []) {
      if (rev.valueType !== props.valueType) {
        throw new Error('Revision valueType must match entry valueType')
      }
    }

    this.id = props.id
    this.name = props.name.trim()
    this.dueDay = props.dueDay
    this.kind = props.kind
    this.recurrence = props.recurrence
    this.createdAt = props.createdAt
    this.context = props.context
    this.valueType = props.valueType
    this.amount = props.amount
    this.formula = props.formula
    this._deletedFromMonth = props.deletedFromMonth
    this._revisions = props.revisions ?? []
  }

  get deletedFromMonth(): YearMonth | null {
    return this._deletedFromMonth
  }

  get isDeleted(): boolean {
    return this._deletedFromMonth !== null
  }

  get revisions(): readonly EntryRevision[] {
    return this._revisions
  }

  markDeletedFrom(month: YearMonth): void {
    this._deletedFromMonth = month
  }

  isActiveInMonth(month: YearMonth): boolean {
    if (this.recurrence === 'once') {
      return this.createdAt.equals(month)
    }
    if (!this.createdAt.isBeforeOrEqual(month)) return false
    if (this._deletedFromMonth !== null && this._deletedFromMonth.isBeforeOrEqual(month)) return false
    return true
  }

  getValuesForMonth(month: YearMonth): MonthlyValues {
    const sorted = [...this._revisions].sort((a, b) => {
      if (a.fromMonth.year !== b.fromMonth.year) return b.fromMonth.year - a.fromMonth.year
      return b.fromMonth.month - a.fromMonth.month
    })

    const applicable = this.recurrence === 'once'
      ? undefined
      : sorted.find((r) => r.fromMonth.isBeforeOrEqual(month))

    if (this.valueType === EntryValueType.FIXED) {
      if (applicable && applicable.valueType === EntryValueType.FIXED) {
        return {
          valueType: EntryValueType.FIXED,
          name: applicable.name,
          amount: applicable.amount,
          dueDay: applicable.dueDay,
        }
      }
      return {
        valueType: EntryValueType.FIXED,
        name: this.name,
        amount: this.amount as Money,
        dueDay: this.dueDay,
      }
    }

    if (applicable && applicable.valueType === EntryValueType.RELATIVE) {
      return {
        valueType: EntryValueType.RELATIVE,
        name: applicable.name,
        formula: applicable.formula,
        dueDay: applicable.dueDay,
      }
    }
    return {
      valueType: EntryValueType.RELATIVE,
      name: this.name,
      formula: this.formula as EntryFormula,
      dueDay: this.dueDay,
    }
  }

  addRevision(revision: EntryRevision): void {
    if (this.recurrence === 'once') {
      throw new Error('Cannot add revisions to one-off entries')
    }
    if (revision.valueType !== this.valueType) {
      throw new Error('Revision valueType must match entry valueType')
    }
    if (revision.dueDay < 1 || revision.dueDay > 31) {
      throw new Error('Due day must be between 1 and 31')
    }
    if (revision.name.trim().length === 0) {
      throw new Error('Entry name cannot be empty')
    }

    const trimmed: EntryRevision = { ...revision, name: revision.name.trim() }

    this._revisions = this._revisions.filter((r) => !r.fromMonth.equals(revision.fromMonth))
    this._revisions.push(trimmed)
  }
}
