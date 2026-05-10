import type { EntryKind } from './EntryStatus'
import { FormulaSetType, FormulaTermSign } from './EntryStatus'

export interface FormulaSetAll {
  type: FormulaSetType.ALL
  kind: EntryKind
}

export interface FormulaSetExplicit {
  type: FormulaSetType.EXPLICIT
  entryIds: string[]
}

export type FormulaSet = FormulaSetAll | FormulaSetExplicit

export interface FormulaTerm {
  set: FormulaSet
  sign: FormulaTermSign
}

export interface EntryFormula {
  terms: FormulaTerm[]
  percentage: number
}

export { FormulaSetType, FormulaTermSign }
