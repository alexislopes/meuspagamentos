import type { Entry } from '../../domain/entities/Entry'
import type { IEntryRepository } from '../../domain/repositories/IEntryRepository'
import type { ExpenseContext } from '../../domain/value-objects/ExpenseContext'
import type { EntryKind, Recurrence } from '../../domain/value-objects/EntryStatus'
import { EntryMapper } from '../mappers/EntryMapper'
import type { EntryJSON } from '../mappers/EntryMapper'
import { supabase } from '../supabase/client'

interface EntryRow {
  id: string
  name: string
  amount_cents: number
  due_day: number
  kind: EntryKind
  recurrence: Recurrence
  created_at_month: string
  deleted_from_month: string | null
  context: ExpenseContext
  revisions: RevisionRow[]
}

interface RevisionRow {
  from_month: string
  name: string
  amount_cents: number
  due_day: number
}

export class SupabaseEntryRepository implements IEntryRepository {
  private toDomain(row: EntryRow): Entry {
    const json: EntryJSON = {
      id: row.id,
      name: row.name,
      amountInCents: row.amount_cents,
      dueDay: row.due_day,
      kind: row.kind,
      recurrence: row.recurrence,
      createdAt: row.created_at_month,
      deletedFromMonth: row.deleted_from_month,
      context: row.context,
      revisions: (row.revisions ?? []).map((r) => ({
        fromMonth: r.from_month,
        name: r.name,
        amountInCents: r.amount_cents,
        dueDay: r.due_day,
      })),
    }
    return EntryMapper.toDomain(json)
  }

  private toRow(entry: Entry): EntryRow {
    const json = EntryMapper.toJSON(entry)
    return {
      id: json.id,
      name: json.name,
      amount_cents: json.amountInCents,
      due_day: json.dueDay,
      kind: json.kind,
      recurrence: json.recurrence,
      created_at_month: json.createdAt,
      deleted_from_month: json.deletedFromMonth,
      context: json.context,
      revisions: (json.revisions ?? []).map((r) => ({
        from_month: r.fromMonth,
        name: r.name,
        amount_cents: r.amountInCents,
        due_day: r.dueDay,
      })),
    }
  }

  async getAll(context: ExpenseContext): Promise<Entry[]> {
    const { data, error } = await supabase
      .from('entries')
      .select('*')
      .eq('context', context)

    if (error) throw new Error(`Failed to fetch entries: ${error.message}`)
    return (data as EntryRow[]).map((row) => this.toDomain(row))
  }

  async getById(id: string): Promise<Entry | null> {
    const { data, error } = await supabase
      .from('entries')
      .select('*')
      .eq('id', id)
      .maybeSingle()

    if (error) throw new Error(`Failed to fetch entry: ${error.message}`)
    return data ? this.toDomain(data as EntryRow) : null
  }

  async save(entry: Entry): Promise<void> {
    const row = this.toRow(entry)
    const { error } = await supabase
      .from('entries')
      .insert(row)

    if (error) throw new Error(`Failed to save entry: ${error.message}`)
  }

  async update(entry: Entry): Promise<void> {
    const row = this.toRow(entry)
    const { id, ...updateData } = row
    const { error } = await supabase
      .from('entries')
      .update(updateData)
      .eq('id', id)

    if (error) throw new Error(`Failed to update entry: ${error.message}`)
  }
}
