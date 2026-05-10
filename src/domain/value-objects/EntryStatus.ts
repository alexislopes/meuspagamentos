export enum EntryStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  SKIPPED = 'skipped',
}

export type EntryKind = 'expense' | 'income'
export type Recurrence = 'monthly' | 'once'

export enum EntryValueType {
  FIXED = 'fixed',
  RELATIVE = 'relative',
}

export enum FormulaSetType {
  ALL = 'all',
  EXPLICIT = 'explicit',
}

export enum FormulaTermSign {
  POSITIVE = 1,
  NEGATIVE = -1,
}
