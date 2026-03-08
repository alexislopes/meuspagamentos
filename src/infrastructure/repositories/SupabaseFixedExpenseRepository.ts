import type { FixedExpense } from '../../domain/entities/FixedExpense'
import type { IFixedExpenseRepository } from '../../domain/repositories/IFixedExpenseRepository'
import { FixedExpenseMapper } from '../mappers/FixedExpenseMapper'
import type { FixedExpenseJSON } from '../mappers/FixedExpenseMapper'
import { supabase } from '../supabase/client'

interface FixedExpenseRow {
  id: string
  name: string
  amount_cents: number
  due_day: number
  created_at_month: string
  deleted_from_month: string | null
  revisions: RevisionRow[]
}

interface RevisionRow {
  from_month: string
  name: string
  amount_cents: number
  due_day: number
}

export class SupabaseFixedExpenseRepository implements IFixedExpenseRepository {
  private toDomain(row: FixedExpenseRow): FixedExpense {
    const json: FixedExpenseJSON = {
      id: row.id,
      name: row.name,
      amountInCents: row.amount_cents,
      dueDay: row.due_day,
      createdAt: row.created_at_month,
      deletedFromMonth: row.deleted_from_month,
      revisions: (row.revisions ?? []).map((r) => ({
        fromMonth: r.from_month,
        name: r.name,
        amountInCents: r.amount_cents,
        dueDay: r.due_day,
      })),
    }
    return FixedExpenseMapper.toDomain(json)
  }

  private toRow(expense: FixedExpense): FixedExpenseRow {
    const json = FixedExpenseMapper.toJSON(expense)
    return {
      id: json.id,
      name: json.name,
      amount_cents: json.amountInCents,
      due_day: json.dueDay,
      created_at_month: json.createdAt,
      deleted_from_month: json.deletedFromMonth,
      revisions: (json.revisions ?? []).map((r) => ({
        from_month: r.fromMonth,
        name: r.name,
        amount_cents: r.amountInCents,
        due_day: r.dueDay,
      })),
    }
  }

  async getAll(): Promise<FixedExpense[]> {
    const { data, error } = await supabase
      .from('fixed_expenses')
      .select('*')

    if (error) throw new Error(`Failed to fetch expenses: ${error.message}`)
    return (data as FixedExpenseRow[]).map((row) => this.toDomain(row))
  }

  async getById(id: string): Promise<FixedExpense | null> {
    const { data, error } = await supabase
      .from('fixed_expenses')
      .select('*')
      .eq('id', id)
      .maybeSingle()

    if (error) throw new Error(`Failed to fetch expense: ${error.message}`)
    return data ? this.toDomain(data as FixedExpenseRow) : null
  }

  async save(expense: FixedExpense): Promise<void> {
    const row = this.toRow(expense)
    const { error } = await supabase
      .from('fixed_expenses')
      .insert(row)

    if (error) throw new Error(`Failed to save expense: ${error.message}`)
  }

  async update(expense: FixedExpense): Promise<void> {
    const row = this.toRow(expense)
    const { id, ...updateData } = row
    const { error } = await supabase
      .from('fixed_expenses')
      .update(updateData)
      .eq('id', id)

    if (error) throw new Error(`Failed to update expense: ${error.message}`)
  }
}
