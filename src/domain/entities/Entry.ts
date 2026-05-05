import { ExpenseContext } from '../value-objects/ExpenseContext'
import type { EntryKind, Recurrence } from '../value-objects/EntryStatus'
import { Money } from '../value-objects/Money'
import { YearMonth } from '../value-objects/YearMonth'

export interface EntryRevision {
  readonly fromMonth: YearMonth
  readonly name: string
  readonly amount: Money
  readonly dueDay: number
}

export interface EntryProps {
  id: string
  name: string
  amount: Money
  dueDay: number
  kind: EntryKind
  recurrence: Recurrence
  createdAt: YearMonth
  deletedFromMonth: YearMonth | null
  context: ExpenseContext
  revisions?: EntryRevision[]
}

export class Entry {
  readonly id: string
  readonly name: string
  readonly amount: Money
  readonly dueDay: number
  readonly kind: EntryKind
  readonly recurrence: Recurrence
  readonly createdAt: YearMonth
  readonly context: ExpenseContext
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

    this.id = props.id
    this.name = props.name.trim()
    this.amount = props.amount
    this.dueDay = props.dueDay
    this.kind = props.kind
    this.recurrence = props.recurrence
    this.createdAt = props.createdAt
    this.context = props.context
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
    if (!this.createdAt.isBeforeOrEqual(month)) {
      return false
    }
    if (this._deletedFromMonth !== null && this._deletedFromMonth.isBeforeOrEqual(month)) {
      return false
    }
    return true
  }

  getValuesForMonth(month: YearMonth): { name: string; amount: Money; dueDay: number } {
    if (this.recurrence === 'once') {
      return { name: this.name, amount: this.amount, dueDay: this.dueDay }
    }

    const sorted = [...this._revisions].sort((a, b) => {
      if (a.fromMonth.year !== b.fromMonth.year) return b.fromMonth.year - a.fromMonth.year
      return b.fromMonth.month - a.fromMonth.month
    })

    for (const rev of sorted) {
      if (rev.fromMonth.isBeforeOrEqual(month)) {
        return { name: rev.name, amount: rev.amount, dueDay: rev.dueDay }
      }
    }

    return { name: this.name, amount: this.amount, dueDay: this.dueDay }
  }

  addRevision(fromMonth: YearMonth, name: string, amount: Money, dueDay: number): void {
    if (this.recurrence === 'once') {
      throw new Error('Cannot add revisions to one-off entries')
    }
    if (dueDay < 1 || dueDay > 31) {
      throw new Error('Due day must be between 1 and 31')
    }
    if (name.trim().length === 0) {
      throw new Error('Entry name cannot be empty')
    }

    this._revisions = this._revisions.filter((r) => !r.fromMonth.equals(fromMonth))

    this._revisions.push({
      fromMonth,
      name: name.trim(),
      amount,
      dueDay,
    })
  }
}
