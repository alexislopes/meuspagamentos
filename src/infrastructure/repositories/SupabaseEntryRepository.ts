import type { Entry } from '../../domain/entities/Entry'
import type { IEntryRepository } from '../../domain/repositories/IEntryRepository'
import type { ExpenseContext } from '../../domain/value-objects/ExpenseContext'
import {
  EntryValueType,
  type EntryKind,
  type Recurrence,
} from '../../domain/value-objects/EntryStatus'
import type { EntryFormula } from '../../domain/value-objects/EntryFormula'
import {
  EntryMapper,
  type EntryJSON,
  type FixedEntryJSON,
  type FixedEntryRevisionJSON,
  type RelativeEntryJSON,
  type RelativeEntryRevisionJSON,
} from '../mappers/EntryMapper'
import { supabase } from '../supabase/client'

interface RevisionRow {
  value_type: EntryValueType
  from_month: string
  name: string
  amount_cents?: number
  formula?: EntryFormula
  due_day: number
}

interface EntryRow {
  id: string
  name: string
  amount_cents: number | null
  due_day: number
  kind: EntryKind
  recurrence: Recurrence
  created_at_month: string
  deleted_from_month: string | null
  context: ExpenseContext
  value_type: EntryValueType
  formula: EntryFormula | null
  revisions: RevisionRow[]
}

export class SupabaseEntryRepository implements IEntryRepository {
  private toDomain(row: EntryRow): Entry {
    const baseJson = {
      id: row.id,
      name: row.name,
      dueDay: row.due_day,
      kind: row.kind,
      recurrence: row.recurrence,
      createdAt: row.created_at_month,
      deletedFromMonth: row.deleted_from_month,
      context: row.context,
    }

    if (row.value_type === EntryValueType.FIXED) {
      const revisions: FixedEntryRevisionJSON[] | undefined = row.revisions
        ? row.revisions
            .filter((r) => r.value_type === EntryValueType.FIXED)
            .map((r) => ({
              valueType: EntryValueType.FIXED,
              fromMonth: r.from_month,
              name: r.name,
              amountInCents: r.amount_cents as number,
              dueDay: r.due_day,
            }))
        : undefined
      const json: FixedEntryJSON = {
        ...baseJson,
        valueType: EntryValueType.FIXED,
        amountInCents: row.amount_cents as number,
      }
      if (revisions && revisions.length > 0) json.revisions = revisions
      return EntryMapper.toDomain(json)
    }

    const revisions: RelativeEntryRevisionJSON[] | undefined = row.revisions
      ? row.revisions
          .filter((r) => r.value_type === EntryValueType.RELATIVE)
          .map((r) => ({
            valueType: EntryValueType.RELATIVE,
            fromMonth: r.from_month,
            name: r.name,
            formula: r.formula as EntryFormula,
            dueDay: r.due_day,
          }))
      : undefined
    const json: RelativeEntryJSON = {
      ...baseJson,
      valueType: EntryValueType.RELATIVE,
      formula: row.formula as EntryFormula,
    }
    if (revisions && revisions.length > 0) json.revisions = revisions
    return EntryMapper.toDomain(json)
  }

  private toRow(entry: Entry): EntryRow {
    const json: EntryJSON = EntryMapper.toJSON(entry)
    const revisions: RevisionRow[] = (json.revisions ?? []).map((r) =>
      r.valueType === EntryValueType.FIXED
        ? {
            value_type: EntryValueType.FIXED,
            from_month: r.fromMonth,
            name: r.name,
            amount_cents: r.amountInCents,
            due_day: r.dueDay,
          }
        : {
            value_type: EntryValueType.RELATIVE,
            from_month: r.fromMonth,
            name: r.name,
            formula: r.formula,
            due_day: r.dueDay,
          },
    )
    return {
      id: json.id,
      name: json.name,
      amount_cents: json.valueType === EntryValueType.FIXED ? json.amountInCents : null,
      due_day: json.dueDay,
      kind: json.kind,
      recurrence: json.recurrence,
      created_at_month: json.createdAt,
      deleted_from_month: json.deletedFromMonth,
      context: json.context,
      value_type: json.valueType,
      formula: json.valueType === EntryValueType.RELATIVE ? json.formula : null,
      revisions,
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
