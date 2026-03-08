import { Money } from '../value-objects/Money'
import { YearMonth } from '../value-objects/YearMonth'

export interface ExpenseRevision {
  readonly fromMonth: YearMonth
  readonly name: string
  readonly amount: Money
  readonly dueDay: number
}

export interface FixedExpenseProps {
  id: string
  name: string
  amount: Money
  dueDay: number
  createdAt: YearMonth
  deletedFromMonth: YearMonth | null
  revisions?: ExpenseRevision[]
}

export class FixedExpense {
  readonly id: string
  readonly name: string
  readonly amount: Money
  readonly dueDay: number
  readonly createdAt: YearMonth
  private _deletedFromMonth: YearMonth | null
  private _revisions: ExpenseRevision[]

  constructor(props: FixedExpenseProps) {
    if (props.dueDay < 1 || props.dueDay > 31) {
      throw new Error('Due day must be between 1 and 31')
    }
    if (props.name.trim().length === 0) {
      throw new Error('Expense name cannot be empty')
    }

    this.id = props.id
    this.name = props.name.trim()
    this.amount = props.amount
    this.dueDay = props.dueDay
    this.createdAt = props.createdAt
    this._deletedFromMonth = props.deletedFromMonth
    this._revisions = props.revisions ?? []
  }

  get deletedFromMonth(): YearMonth | null {
    return this._deletedFromMonth
  }

  get isDeleted(): boolean {
    return this._deletedFromMonth !== null
  }

  get revisions(): readonly ExpenseRevision[] {
    return this._revisions
  }

  markDeletedFrom(month: YearMonth): void {
    this._deletedFromMonth = month
  }

  isActiveInMonth(month: YearMonth): boolean {
    if (!this.createdAt.isBeforeOrEqual(month)) {
      return false
    }
    if (this._deletedFromMonth !== null && this._deletedFromMonth.isBeforeOrEqual(month)) {
      return false
    }
    return true
  }

  getValuesForMonth(month: YearMonth): { name: string; amount: Money; dueDay: number } {
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
    if (dueDay < 1 || dueDay > 31) {
      throw new Error('Due day must be between 1 and 31')
    }
    if (name.trim().length === 0) {
      throw new Error('Expense name cannot be empty')
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
