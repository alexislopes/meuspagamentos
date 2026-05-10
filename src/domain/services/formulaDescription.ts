import type { EntryFormula } from '../value-objects/EntryFormula'
import { FormulaSetType, FormulaTermSign } from '../value-objects/EntryStatus'

export function describeFormula(formula: EntryFormula): string {
  const termsText = formula.terms
    .map((t, i) => {
      const setText = t.set.type === FormulaSetType.ALL
        ? (t.set.kind === 'income' ? 'receitas' : 'despesas')
        : `${t.set.entryIds.length} item(ns)`
      const sign = i === 0
        ? (t.sign === FormulaTermSign.NEGATIVE ? '−' : '')
        : (t.sign === FormulaTermSign.NEGATIVE ? ' − ' : ' + ')
      return `${sign}${setText}`
    })
    .join('')
  const wrapped = formula.terms.length > 1 ? `(${termsText})` : termsText
  const pct = formula.percentage % 1 === 0
    ? `${formula.percentage}%`
    : `${formula.percentage.toFixed(2).replace('.', ',')}%`
  return `${pct} de ${wrapped}`
}
