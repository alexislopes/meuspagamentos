export enum EntryStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  SKIPPED = 'skipped',
}

export type EntryKind = 'expense' | 'income'
export type Recurrence = 'monthly' | 'once'
