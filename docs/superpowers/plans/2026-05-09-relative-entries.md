# Relative Entries Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Introduce a new `RELATIVE` entry value type whose monthly amount is derived from a formula `(Σ signed sets × percentage)` over other `FIXED` entries, with snapshot-on-confirm and formula revisions.

**Architecture:** Discriminator field `valueType` on `Entry` switches between `FIXED` (existing `amount`) and `RELATIVE` (new `formula`). `MonthlyEntryService` runs two passes — fixed entries first, then relatives resolved by a new `FormulaResolver`. Confirming a relative persists `snapshot_amount_cents` in `entry_statuses` so the paid value freezes regardless of later edits to base entries.

**Tech Stack:** Vue 3 + TypeScript + Pinia, Supabase (Postgres + RLS) for persistence, Vitest for tests, Storybook for component fixtures, Nuxt UI components in templates.

**Reference spec:** [`docs/superpowers/specs/2026-05-09-relative-entries-design.md`](../specs/2026-05-09-relative-entries-design.md)

**Style rules (from project memory):**
- Always declare named types/enums; no inline unions or inline object types.
- Prefer `undefined` (and optional `?:` props) over `null` in new code. Existing `null` (e.g. `Entry.deletedFromMonth`, repo rows) stays as-is.
- No `Co-Authored-By` / "Generated with" trailers in commits.

**Run tests with:** `npm run test -- <file>` (Vitest). Build with `npm run build`. Lint with `npm run lint` if available.

---

## File Map

**New files:**
- `src/domain/value-objects/EntryFormula.ts` — formula types
- `src/domain/services/FormulaResolver.ts` + `.test.ts` — pure resolver
- `src/application/dto/CreateEntryDTO.ts` *(rewrite as discriminated union)*
- `src/application/dto/UpdateEntryDTO.ts` *(rewrite as discriminated union)*
- `supabase/migrations/20260509000000_relative_entries.sql`

**Modified files:**
- `src/domain/value-objects/EntryStatus.ts` — add `EntryValueType`, `FormulaSetType`, `FormulaTermSign` enums
- `src/domain/entities/Entry.ts` — `valueType`, optional `amount`/`formula`, discriminated revisions
- `src/domain/entities/MonthlyEntryView.ts` — add `context`, `valueType`, `formulaDescription`
- `src/domain/services/MonthlyEntryService.ts` — two-pass build
- `src/domain/repositories/IEntryStatusRepository.ts` — snapshot in setStatus
- `src/application/use-cases/CreateEntry.ts` — discriminated handling + validations
- `src/application/use-cases/UpdateEntry.ts` — discriminated handling + block valueType change
- `src/application/use-cases/ConfirmEntry.ts` — resolve and persist snapshot for relatives
- `src/application/use-cases/RevertEntryStatus.ts` — clear snapshot
- `src/application/dto/MonthlyEntryDTO.ts` — add `valueType` + `formulaDescription`
- `src/application/use-cases/GetMonthlyEntries.ts` — propagate new fields
- `src/infrastructure/mappers/EntryMapper.ts` — discriminated JSON
- `src/infrastructure/repositories/SupabaseEntryRepository.ts` — `value_type`, nullable `amount_cents`, `formula`
- `src/infrastructure/repositories/SupabaseEntryStatusRepository.ts` — read/write `snapshot_amount_cents`
- `src/infrastructure/repositories/LocalStorageEntryRepository.ts` — mirror discriminated JSON
- `src/infrastructure/repositories/LocalStorageEntryStatusRepository.ts` — snapshot field
- `src/presentation/stores/useEntryStore.ts` — discriminated DTOs in `addEntry`/`editEntry`
- `src/presentation/components/entry/EntryForm.vue` — value-type toggle + formula builder + preview
- `src/presentation/components/entry/EntryCard.vue` — `[calculado]` badge and formula subtitle
- `src/presentation/components/entry/EntryCard.stories.ts` — relative fixtures
- `src/presentation/components/entry/EntryList.stories.ts` — relative fixtures
- All test files that construct `new Entry({...})` (5 files: `Entry.test.ts`, `EntryMapper.test.ts`, `MonthlyEntryService.test.ts`, `GetMonthlySummary.test.ts`, `GetAverageMonthlyIncome.test.ts`)

**Order:** Domain → application → persistence → UI. Each task ends with green tests + commit.

---

## Task 1: Add value-type and formula enums

**Files:**
- Modify: `src/domain/value-objects/EntryStatus.ts`

- [ ] **Step 1: Append enums to EntryStatus.ts**

```ts
// Append at the bottom of src/domain/value-objects/EntryStatus.ts

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
```

- [ ] **Step 2: Type-check**

Run: `npx vue-tsc --noEmit`
Expected: PASS (no usages yet).

- [ ] **Step 3: Commit**

```bash
git add src/domain/value-objects/EntryStatus.ts
git commit -m "feat(domain): add EntryValueType, FormulaSetType, FormulaTermSign enums"
```

---

## Task 2: Add EntryFormula value object

**Files:**
- Create: `src/domain/value-objects/EntryFormula.ts`

- [ ] **Step 1: Create the file**

```ts
// src/domain/value-objects/EntryFormula.ts
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
```

- [ ] **Step 2: Type-check**

Run: `npx vue-tsc --noEmit`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/domain/value-objects/EntryFormula.ts
git commit -m "feat(domain): add EntryFormula value object"
```

---

## Task 3: Refactor Entry — discriminated value type

This is the largest domain change. We make `valueType` required, `amount` optional, add `formula`, and discriminate revisions. All existing `new Entry({...})` callers must add `valueType: EntryValueType.FIXED`.

**Files:**
- Modify: `src/domain/entities/Entry.ts`
- Modify: `src/domain/entities/Entry.test.ts`
- Modify: `src/infrastructure/mappers/EntryMapper.ts` (call site only, full rewrite in Task 12)
- Modify: `src/application/use-cases/CreateEntry.ts` (call site only, full rewrite in Task 6/7)
- Modify: `src/domain/services/MonthlyEntryService.test.ts` (call site only)
- Modify: `src/application/use-cases/GetMonthlySummary.test.ts` (call site only)
- Modify: `src/application/use-cases/GetAverageMonthlyIncome.test.ts` (call site only)

- [ ] **Step 1: Write failing tests for new Entry invariants**

Append to `src/domain/entities/Entry.test.ts`:

```ts
import { EntryValueType, FormulaSetType, FormulaTermSign } from '../value-objects/EntryStatus'
import type { EntryFormula } from '../value-objects/EntryFormula'

const sampleFormula: EntryFormula = {
  terms: [
    {
      set: { type: FormulaSetType.ALL, kind: 'income' },
      sign: FormulaTermSign.POSITIVE,
    },
  ],
  percentage: 10,
}

const fixedProps = {
  ...baseProps,
  valueType: EntryValueType.FIXED,
}

const relativeProps = {
  id: 'r1',
  name: 'Imposto',
  dueDay: 20,
  kind: 'expense' as const,
  recurrence: 'monthly' as const,
  createdAt: YearMonth.of(2026, 1),
  deletedFromMonth: null,
  context: ExpenseContext.PJ,
  valueType: EntryValueType.RELATIVE,
  formula: sampleFormula,
}

describe('Entry constructor (discriminated)', () => {
  it('rejects fixed without amount', () => {
    expect(() => new Entry({ ...fixedProps, amount: undefined as never })).toThrow(/amount/i)
  })

  it('rejects fixed with formula', () => {
    expect(() => new Entry({ ...fixedProps, formula: sampleFormula })).toThrow(/fixed.*formula|formula.*fixed/i)
  })

  it('rejects relative without formula', () => {
    expect(() => new Entry({ ...relativeProps, formula: undefined as never })).toThrow(/formula/i)
  })

  it('rejects relative with amount', () => {
    expect(() => new Entry({ ...relativeProps, amount: Money.fromCents(100) })).toThrow(/relative.*amount|amount.*relative/i)
  })

  it('rejects relative with once recurrence', () => {
    expect(() => new Entry({ ...relativeProps, recurrence: 'once' })).toThrow(/once|monthly/i)
  })

  it('accepts a valid relative entry', () => {
    const e = new Entry(relativeProps)
    expect(e.valueType).toBe(EntryValueType.RELATIVE)
    expect(e.formula).toEqual(sampleFormula)
    expect(e.amount).toBeUndefined()
  })
})

describe('Entry.getValuesForMonth (relative)', () => {
  it('returns name/formula/dueDay for relative without revisions', () => {
    const e = new Entry(relativeProps)
    const v = e.getValuesForMonth(YearMonth.of(2026, 6))
    expect(v.valueType).toBe(EntryValueType.RELATIVE)
    if (v.valueType === EntryValueType.RELATIVE) {
      expect(v.formula).toEqual(sampleFormula)
      expect(v.dueDay).toBe(20)
    }
  })

  it('returns latest applicable formula revision', () => {
    const e = new Entry(relativeProps)
    const newFormula: EntryFormula = { ...sampleFormula, percentage: 20 }
    e.addRevision({
      valueType: EntryValueType.RELATIVE,
      fromMonth: YearMonth.of(2026, 4),
      name: 'Imposto novo',
      formula: newFormula,
      dueDay: 25,
    })
    const v3 = e.getValuesForMonth(YearMonth.of(2026, 3))
    if (v3.valueType === EntryValueType.RELATIVE) expect(v3.formula.percentage).toBe(10)
    const v5 = e.getValuesForMonth(YearMonth.of(2026, 5))
    if (v5.valueType === EntryValueType.RELATIVE) expect(v5.formula.percentage).toBe(20)
  })
})

describe('Entry.addRevision (discriminated)', () => {
  it('rejects fixed-shaped revision on a relative entry', () => {
    const e = new Entry(relativeProps)
    expect(() =>
      e.addRevision({
        valueType: EntryValueType.FIXED,
        fromMonth: YearMonth.of(2026, 2),
        name: 'x',
        amount: Money.fromCents(100),
        dueDay: 1,
      } as never),
    ).toThrow(/value type|valueType/i)
  })
})
```

Also update the existing `baseProps` block — change to:

```ts
const baseProps = {
  id: 'e1',
  name: 'Aluguel',
  amount: Money.fromCents(150000),
  dueDay: 5,
  kind: 'expense' as const,
  recurrence: 'monthly' as const,
  createdAt: YearMonth.of(2026, 1),
  deletedFromMonth: null,
  context: ExpenseContext.PF,
  valueType: EntryValueType.FIXED,
}
```

And the existing `addRevision` test that passes positional args needs to become object-shaped (we're changing the signature):

```ts
// In existing tests, replace e.addRevision(YearMonth.of(2026, 4), 'v1', Money.fromCents(100), 10)
// with:
e.addRevision({
  valueType: EntryValueType.FIXED,
  fromMonth: YearMonth.of(2026, 4),
  name: 'v1',
  amount: Money.fromCents(100),
  dueDay: 10,
})
```

Apply the same transformation to every `addRevision(...)` and `e.getValuesForMonth(...)` assertion that reads `.amount.inCents` directly. Add a `valueType === FIXED` narrow:

```ts
const v = e.getValuesForMonth(YearMonth.of(2026, 6))
if (v.valueType !== EntryValueType.FIXED) throw new Error('expected FIXED')
expect(v.amount.inCents).toBe(150000)
```

- [ ] **Step 2: Run tests to verify failures**

Run: `npm run test -- src/domain/entities/Entry.test.ts`
Expected: FAIL — most tests fail (Entity API not yet updated).

- [ ] **Step 3: Refactor Entry**

Replace the contents of `src/domain/entities/Entry.ts`:

```ts
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

    const trimmed: EntryRevision = revision.valueType === EntryValueType.FIXED
      ? { ...revision, name: revision.name.trim() }
      : { ...revision, name: revision.name.trim() }

    this._revisions = this._revisions.filter((r) => !r.fromMonth.equals(revision.fromMonth))
    this._revisions.push(trimmed)
  }
}
```

- [ ] **Step 4: Update existing call sites**

These all currently call `new Entry({...})` or `addRevision(...)` with the old API. Add `valueType: EntryValueType.FIXED` to each `new Entry({...})`. Convert `addRevision(month, name, amount, dueDay)` → `addRevision({ valueType: EntryValueType.FIXED, fromMonth: month, name, amount, dueDay })`.

Files to touch (search-and-update each):
- `src/infrastructure/mappers/EntryMapper.ts` — in `toDomain` and `toJSON` add `valueType: EntryValueType.FIXED`. (Will be fully rewritten in Task 12; this is just to keep compile green.)
- `src/application/use-cases/CreateEntry.ts` — add `valueType: EntryValueType.FIXED` (will be rewritten in Task 6/7).
- `src/application/use-cases/UpdateEntry.ts` — change the `addRevision(...)` call to the object form.
- `src/domain/services/MonthlyEntryService.test.ts` — add `valueType: EntryValueType.FIXED` to constructions; narrow `getValuesForMonth` returns.
- `src/application/use-cases/GetMonthlySummary.test.ts` — same.
- `src/application/use-cases/GetAverageMonthlyIncome.test.ts` — same.

- [ ] **Step 5: Run all tests**

Run: `npm run test`
Expected: PASS (all suites green; the new relative-entry tests pass too).

- [ ] **Step 6: Commit**

```bash
git add src/domain src/application src/infrastructure
git commit -m "feat(domain): introduce Entry valueType discriminator (fixed/relative)"
```

---

## Task 4: FormulaResolver service

**Files:**
- Create: `src/domain/services/FormulaResolver.ts`
- Create: `src/domain/services/FormulaResolver.test.ts`

- [ ] **Step 1: Write failing tests**

```ts
// src/domain/services/FormulaResolver.test.ts
import { describe, it, expect } from 'vitest'
import { FormulaResolver } from './FormulaResolver'
import {
  EntryStatus,
  EntryValueType,
  FormulaSetType,
  FormulaTermSign,
} from '../value-objects/EntryStatus'
import { ExpenseContext } from '../value-objects/ExpenseContext'
import { Money } from '../value-objects/Money'
import type { EntryFormula } from '../value-objects/EntryFormula'
import type { MonthlyEntryView } from '../entities/MonthlyEntryView'

const view = (overrides: Partial<MonthlyEntryView>): MonthlyEntryView => ({
  entryId: overrides.entryId ?? 'x',
  name: overrides.name ?? 'x',
  amount: overrides.amount ?? Money.fromCents(0),
  dueDay: overrides.dueDay ?? 1,
  kind: overrides.kind ?? 'income',
  status: overrides.status ?? EntryStatus.PENDING,
  context: overrides.context ?? ExpenseContext.PJ,
  valueType: EntryValueType.FIXED,
  formulaDescription: undefined,
})

describe('FormulaResolver', () => {
  const resolver = new FormulaResolver()

  it('sums all incomes and applies percentage', () => {
    const formula: EntryFormula = {
      terms: [{ set: { type: FormulaSetType.ALL, kind: 'income' }, sign: FormulaTermSign.POSITIVE }],
      percentage: 10,
    }
    const result = resolver.resolve({
      formula,
      ownerContext: ExpenseContext.PJ,
      fixedViews: [
        view({ entryId: 'a', kind: 'income', amount: Money.fromCents(50000) }),
        view({ entryId: 'b', kind: 'income', amount: Money.fromCents(30000) }),
        view({ entryId: 'c', kind: 'expense', amount: Money.fromCents(10000) }),
      ],
    })
    expect(result.inCents).toBe(8000) // (50000 + 30000) * 0.10
  })

  it('filters by ownerContext', () => {
    const formula: EntryFormula = {
      terms: [{ set: { type: FormulaSetType.ALL, kind: 'income' }, sign: FormulaTermSign.POSITIVE }],
      percentage: 10,
    }
    const result = resolver.resolve({
      formula,
      ownerContext: ExpenseContext.PJ,
      fixedViews: [
        view({ entryId: 'a', kind: 'income', amount: Money.fromCents(100000), context: ExpenseContext.PF }),
        view({ entryId: 'b', kind: 'income', amount: Money.fromCents(50000), context: ExpenseContext.PJ }),
      ],
    })
    expect(result.inCents).toBe(5000)
  })

  it('combines positive and negative terms', () => {
    const formula: EntryFormula = {
      terms: [
        { set: { type: FormulaSetType.ALL, kind: 'income' }, sign: FormulaTermSign.POSITIVE },
        { set: { type: FormulaSetType.EXPLICIT, entryIds: ['ret1'] }, sign: FormulaTermSign.NEGATIVE },
      ],
      percentage: 6,
    }
    const result = resolver.resolve({
      formula,
      ownerContext: ExpenseContext.PJ,
      fixedViews: [
        view({ entryId: 'inc1', kind: 'income', amount: Money.fromCents(100000) }),
        view({ entryId: 'ret1', kind: 'expense', amount: Money.fromCents(20000) }),
      ],
    })
    expect(result.inCents).toBe(4800) // (100000 - 20000) * 0.06
  })

  it('excludes SKIPPED views', () => {
    const formula: EntryFormula = {
      terms: [{ set: { type: FormulaSetType.ALL, kind: 'income' }, sign: FormulaTermSign.POSITIVE }],
      percentage: 10,
    }
    const result = resolver.resolve({
      formula,
      ownerContext: ExpenseContext.PJ,
      fixedViews: [
        view({ entryId: 'a', kind: 'income', amount: Money.fromCents(50000), status: EntryStatus.PENDING }),
        view({ entryId: 'b', kind: 'income', amount: Money.fromCents(50000), status: EntryStatus.SKIPPED }),
      ],
    })
    expect(result.inCents).toBe(5000)
  })

  it('clamps negative results to zero', () => {
    const formula: EntryFormula = {
      terms: [
        { set: { type: FormulaSetType.EXPLICIT, entryIds: ['a'] }, sign: FormulaTermSign.NEGATIVE },
      ],
      percentage: 100,
    }
    const result = resolver.resolve({
      formula,
      ownerContext: ExpenseContext.PJ,
      fixedViews: [view({ entryId: 'a', kind: 'income', amount: Money.fromCents(50000) })],
    })
    expect(result.inCents).toBe(0)
  })

  it('rounds half-up to nearest cent', () => {
    const formula: EntryFormula = {
      terms: [{ set: { type: FormulaSetType.ALL, kind: 'income' }, sign: FormulaTermSign.POSITIVE }],
      percentage: 33.333,
    }
    const result = resolver.resolve({
      formula,
      ownerContext: ExpenseContext.PJ,
      fixedViews: [view({ entryId: 'a', kind: 'income', amount: Money.fromCents(99999) })],
    })
    expect(result.inCents).toBe(33333) // round(99999 * 33.333 / 100) = round(33332.66667) = 33333
  })

  it('rejects empty terms', () => {
    expect(() =>
      new FormulaResolver().resolve({
        formula: { terms: [], percentage: 10 },
        ownerContext: ExpenseContext.PJ,
        fixedViews: [],
      }),
    ).toThrow(/at least one term/i)
  })

  it('rejects non-positive percentage', () => {
    const formula: EntryFormula = {
      terms: [{ set: { type: FormulaSetType.ALL, kind: 'income' }, sign: FormulaTermSign.POSITIVE }],
      percentage: 0,
    }
    expect(() =>
      new FormulaResolver().resolve({
        formula,
        ownerContext: ExpenseContext.PJ,
        fixedViews: [],
      }),
    ).toThrow(/percentage/i)
  })
})
```

This test imports `MonthlyEntryView` with `context`, `valueType`, `formulaDescription` — these fields are added in Task 5.

- [ ] **Step 2: Run tests**

Run: `npm run test -- src/domain/services/FormulaResolver.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement FormulaResolver**

```ts
// src/domain/services/FormulaResolver.ts
import type { MonthlyEntryView } from '../entities/MonthlyEntryView'
import type { EntryFormula, FormulaTerm } from '../value-objects/EntryFormula'
import type { ExpenseContext } from '../value-objects/ExpenseContext'
import {
  EntryStatus,
  FormulaSetType,
  type EntryKind,
} from '../value-objects/EntryStatus'
import { Money } from '../value-objects/Money'

export interface FormulaResolutionInput {
  formula: EntryFormula
  ownerContext: ExpenseContext
  fixedViews: MonthlyEntryView[]
}

export class FormulaResolver {
  resolve(input: FormulaResolutionInput): Money {
    const { formula, ownerContext, fixedViews } = input

    if (formula.terms.length === 0) {
      throw new Error('Formula must have at least one term')
    }
    if (formula.percentage <= 0) {
      throw new Error('Formula percentage must be > 0')
    }

    const eligible = fixedViews.filter(
      (v) => v.context === ownerContext && v.status !== EntryStatus.SKIPPED,
    )

    let baseCents = 0
    for (const term of formula.terms) {
      baseCents += term.sign * this.sumTerm(term, eligible)
    }

    const cents = Math.max(0, Math.round((baseCents * formula.percentage) / 100))
    return Money.fromCents(cents)
  }

  private sumTerm(term: FormulaTerm, views: MonthlyEntryView[]): number {
    if (term.set.type === FormulaSetType.ALL) {
      const kind: EntryKind = term.set.kind
      return views
        .filter((v) => v.kind === kind)
        .reduce((acc, v) => acc + v.amount.inCents, 0)
    }
    const ids = new Set(term.set.entryIds)
    return views
      .filter((v) => ids.has(v.entryId))
      .reduce((acc, v) => acc + v.amount.inCents, 0)
  }
}
```

- [ ] **Step 4: Run resolver tests (will still fail until Task 5)**

Run: `npm run test -- src/domain/services/FormulaResolver.test.ts`
Expected: still FAIL because `MonthlyEntryView` is missing the new fields. Task 5 fixes this.

- [ ] **Step 5: Stage but do not commit yet** — proceed to Task 5.

---

## Task 5: Extend MonthlyEntryView and update MonthlyEntryService

**Files:**
- Modify: `src/domain/entities/MonthlyEntryView.ts`
- Modify: `src/domain/services/MonthlyEntryService.ts`
- Modify: `src/domain/services/MonthlyEntryService.test.ts`

- [ ] **Step 1: Update MonthlyEntryView**

```ts
// src/domain/entities/MonthlyEntryView.ts
import type { Money } from '../value-objects/Money'
import type { ExpenseContext } from '../value-objects/ExpenseContext'
import type { EntryKind, EntryStatus, EntryValueType } from '../value-objects/EntryStatus'

export interface MonthlyEntryView {
  readonly entryId: string
  readonly name: string
  readonly amount: Money
  readonly dueDay: number
  readonly kind: EntryKind
  readonly status: EntryStatus
  readonly context: ExpenseContext
  readonly valueType: EntryValueType
  readonly formulaDescription?: string
}
```

- [ ] **Step 2: Write failing test for two-pass build**

Append to `src/domain/services/MonthlyEntryService.test.ts`:

```ts
import { EntryValueType, FormulaSetType, FormulaTermSign, EntryStatus } from '../value-objects/EntryStatus'
import type { EntryFormula } from '../value-objects/EntryFormula'

describe('MonthlyEntryService.buildMonthView (relatives)', () => {
  const svc = new MonthlyEntryService()
  const month = YearMonth.of(2026, 6)
  const formula: EntryFormula = {
    terms: [{ set: { type: FormulaSetType.ALL, kind: 'income' }, sign: FormulaTermSign.POSITIVE }],
    percentage: 10,
  }

  it('resolves a relative entry from fixed views', () => {
    const incomePj = new Entry({
      id: 'inc',
      name: 'Cliente A',
      amount: Money.fromCents(100000),
      dueDay: 5,
      kind: 'income',
      recurrence: 'monthly',
      createdAt: YearMonth.of(2026, 1),
      deletedFromMonth: null,
      context: ExpenseContext.PJ,
      valueType: EntryValueType.FIXED,
    })
    const tax = new Entry({
      id: 'tax',
      name: 'Imposto',
      formula,
      dueDay: 20,
      kind: 'expense',
      recurrence: 'monthly',
      createdAt: YearMonth.of(2026, 1),
      deletedFromMonth: null,
      context: ExpenseContext.PJ,
      valueType: EntryValueType.RELATIVE,
    })

    const views = svc.buildMonthView([incomePj, tax], month, new Map(), new Map())
    const taxView = views.find((v) => v.entryId === 'tax')!
    expect(taxView.amount.inCents).toBe(10000) // 100000 * 10%
  })

  it('uses snapshot when present', () => {
    const incomePj = new Entry({
      id: 'inc',
      name: 'Cliente A',
      amount: Money.fromCents(100000),
      dueDay: 5,
      kind: 'income',
      recurrence: 'monthly',
      createdAt: YearMonth.of(2026, 1),
      deletedFromMonth: null,
      context: ExpenseContext.PJ,
      valueType: EntryValueType.FIXED,
    })
    const tax = new Entry({
      id: 'tax',
      name: 'Imposto',
      formula,
      dueDay: 20,
      kind: 'expense',
      recurrence: 'monthly',
      createdAt: YearMonth.of(2026, 1),
      deletedFromMonth: null,
      context: ExpenseContext.PJ,
      valueType: EntryValueType.RELATIVE,
    })

    const statuses = new Map([['tax', EntryStatus.CONFIRMED]])
    const snapshots = new Map([['tax', 7777]])
    const views = svc.buildMonthView([incomePj, tax], month, statuses, snapshots)
    const taxView = views.find((v) => v.entryId === 'tax')!
    expect(taxView.amount.inCents).toBe(7777)
    expect(taxView.status).toBe(EntryStatus.CONFIRMED)
  })
})
```

- [ ] **Step 3: Run tests to verify failure**

Run: `npm run test -- src/domain/services/MonthlyEntryService.test.ts`
Expected: FAIL — `buildMonthView` signature changed.

- [ ] **Step 4: Update MonthlyEntryService**

Replace `buildMonthView` in `src/domain/services/MonthlyEntryService.ts`:

```ts
import type { Entry } from '../entities/Entry'
import type { MonthlyEntryView } from '../entities/MonthlyEntryView'
import { EntryStatus, EntryValueType } from '../value-objects/EntryStatus'
import type { YearMonth } from '../value-objects/YearMonth'
import { FormulaResolver } from './FormulaResolver'
import { Money } from '../value-objects/Money'
import { describeFormula } from './formulaDescription'

export interface MonthlySummary {
  totalIncome: number
  totalExpense: number
  confirmedIncome: number
  pendingIncome: number
  confirmedExpense: number
  pendingExpense: number
  balance: number
}

export class MonthlyEntryService {
  private readonly resolver = new FormulaResolver()

  buildMonthView(
    allEntries: Entry[],
    month: YearMonth,
    statusOverrides: Map<string, EntryStatus>,
    snapshotsCents: Map<string, number>,
  ): MonthlyEntryView[] {
    const active = allEntries.filter((e) => e.isActiveInMonth(month))

    const fixedViews: MonthlyEntryView[] = active
      .filter((e) => e.valueType === EntryValueType.FIXED)
      .map((entry) => {
        const v = entry.getValuesForMonth(month)
        if (v.valueType !== EntryValueType.FIXED) {
          throw new Error('expected FIXED values')
        }
        return {
          entryId: entry.id,
          name: v.name,
          amount: v.amount,
          dueDay: v.dueDay,
          kind: entry.kind,
          status: statusOverrides.get(entry.id) ?? EntryStatus.PENDING,
          context: entry.context,
          valueType: EntryValueType.FIXED,
        }
      })

    const relativeViews: MonthlyEntryView[] = active
      .filter((e) => e.valueType === EntryValueType.RELATIVE)
      .map((entry) => {
        const v = entry.getValuesForMonth(month)
        if (v.valueType !== EntryValueType.RELATIVE) {
          throw new Error('expected RELATIVE values')
        }
        const status = statusOverrides.get(entry.id) ?? EntryStatus.PENDING
        const snapshot = snapshotsCents.get(entry.id)
        const amount = (status === EntryStatus.CONFIRMED && snapshot !== undefined)
          ? Money.fromCents(snapshot)
          : this.resolver.resolve({
              formula: v.formula,
              ownerContext: entry.context,
              fixedViews,
            })
        return {
          entryId: entry.id,
          name: v.name,
          amount,
          dueDay: v.dueDay,
          kind: entry.kind,
          status,
          context: entry.context,
          valueType: EntryValueType.RELATIVE,
          formulaDescription: describeFormula(v.formula),
        }
      })

    return [...fixedViews, ...relativeViews].sort((a, b) => a.dueDay - b.dueDay)
  }

  computeSummary(views: MonthlyEntryView[]): MonthlySummary {
    let totalIncome = 0
    let totalExpense = 0
    let confirmedIncome = 0
    let pendingIncome = 0
    let confirmedExpense = 0
    let pendingExpense = 0

    for (const v of views) {
      if (v.status === EntryStatus.SKIPPED) continue
      const cents = v.amount.inCents
      if (v.kind === 'income') {
        totalIncome += cents
        if (v.status === EntryStatus.CONFIRMED) confirmedIncome += cents
        else if (v.status === EntryStatus.PENDING) pendingIncome += cents
      } else {
        totalExpense += cents
        if (v.status === EntryStatus.CONFIRMED) confirmedExpense += cents
        else if (v.status === EntryStatus.PENDING) pendingExpense += cents
      }
    }

    return {
      totalIncome,
      totalExpense,
      confirmedIncome,
      pendingIncome,
      confirmedExpense,
      pendingExpense,
      balance: totalIncome - totalExpense,
    }
  }
}
```

- [ ] **Step 5: Implement formulaDescription helper**

Create `src/domain/services/formulaDescription.ts`:

```ts
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
```

- [ ] **Step 6: Update existing buildMonthView call sites**

Search-and-fix:
- `src/application/use-cases/GetMonthlyEntries.ts` — pass empty snapshots map for now (Task 9 wires real data):
  ```ts
  const views = this.domainService.buildMonthView(allEntries, month, statuses, new Map())
  ```
- `src/application/use-cases/GetMonthlySummary.ts` — same (search the file).
- Any other call sites: same treatment.

Update `src/domain/services/MonthlyEntryService.test.ts` existing tests to pass `new Map()` as the 4th argument to `buildMonthView`. Update fixed-entry assertions reading `view` shape for any newly added fields (`context`, `valueType`).

- [ ] **Step 7: Run all tests**

Run: `npm run test`
Expected: PASS for domain + use-case tests.

- [ ] **Step 8: Commit**

```bash
git add src/domain src/application
git commit -m "feat(domain): add FormulaResolver and two-pass buildMonthView"
```

---

## Task 6: Discriminated CreateEntryDTO and UpdateEntryDTO

**Files:**
- Modify: `src/application/dto/CreateEntryDTO.ts`
- Modify: `src/application/dto/UpdateEntryDTO.ts`

- [ ] **Step 1: Rewrite CreateEntryDTO**

```ts
// src/application/dto/CreateEntryDTO.ts
import type { ExpenseContext } from '../../domain/value-objects/ExpenseContext'
import type {
  EntryKind,
  EntryValueType,
  Recurrence,
} from '../../domain/value-objects/EntryStatus'
import type { EntryFormula } from '../../domain/value-objects/EntryFormula'

export interface CreateFixedEntryDTO {
  valueType: EntryValueType.FIXED
  name: string
  amount: number
  dueDay: number
  kind: EntryKind
  recurrence: Recurrence
  context: ExpenseContext
}

export interface CreateRelativeEntryDTO {
  valueType: EntryValueType.RELATIVE
  name: string
  formula: EntryFormula
  dueDay: number
  kind: EntryKind
  context: ExpenseContext
}

export type CreateEntryDTO = CreateFixedEntryDTO | CreateRelativeEntryDTO
```

- [ ] **Step 2: Rewrite UpdateEntryDTO**

```ts
// src/application/dto/UpdateEntryDTO.ts
import type { EntryValueType } from '../../domain/value-objects/EntryStatus'
import type { EntryFormula } from '../../domain/value-objects/EntryFormula'

export interface UpdateFixedEntryDTO {
  valueType: EntryValueType.FIXED
  entryId: string
  name: string
  amount: number
  dueDay: number
  effectiveFromMonth: string
}

export interface UpdateRelativeEntryDTO {
  valueType: EntryValueType.RELATIVE
  entryId: string
  name: string
  formula: EntryFormula
  dueDay: number
  effectiveFromMonth: string
}

export type UpdateEntryDTO = UpdateFixedEntryDTO | UpdateRelativeEntryDTO
```

- [ ] **Step 3: Type-check (will fail at use-case call sites)**

Run: `npx vue-tsc --noEmit`
Expected: FAIL — `CreateEntry`/`UpdateEntry`/`useEntryStore` need updates. We fix them in Task 7.

- [ ] **Step 4: Stage** — proceed to Task 7 to fix.

---

## Task 7: CreateEntry and UpdateEntry use cases — discriminated handling and validation

**Files:**
- Modify: `src/application/use-cases/CreateEntry.ts`
- Modify: `src/application/use-cases/UpdateEntry.ts`
- Add tests: `src/application/use-cases/CreateEntry.test.ts` *(new file)*
- Add tests: `src/application/use-cases/UpdateEntry.test.ts` *(new file)*

- [ ] **Step 1: Write failing tests for CreateEntry validations**

```ts
// src/application/use-cases/CreateEntry.test.ts
import { describe, it, expect, beforeEach } from 'vitest'
import { CreateEntryUseCase } from './CreateEntry'
import { Entry } from '../../domain/entities/Entry'
import type { IEntryRepository } from '../../domain/repositories/IEntryRepository'
import type { ExpenseContext } from '../../domain/value-objects/ExpenseContext'
import {
  EntryValueType,
  FormulaSetType,
  FormulaTermSign,
} from '../../domain/value-objects/EntryStatus'
import { ExpenseContext as Ctx } from '../../domain/value-objects/ExpenseContext'
import { Money } from '../../domain/value-objects/Money'
import { YearMonth } from '../../domain/value-objects/YearMonth'

class FakeRepo implements IEntryRepository {
  saved: Entry[] = []
  byId = new Map<string, Entry>()
  async getAll(_: ExpenseContext) { return Array.from(this.byId.values()) }
  async getById(id: string) { return this.byId.get(id) ?? null }
  async save(e: Entry) { this.saved.push(e); this.byId.set(e.id, e) }
  async update(e: Entry) { this.byId.set(e.id, e) }
}

const fixedDTO = {
  valueType: EntryValueType.FIXED as const,
  name: 'Aluguel',
  amount: 1500,
  dueDay: 5,
  kind: 'expense' as const,
  recurrence: 'monthly' as const,
  context: Ctx.PF,
}

describe('CreateEntryUseCase — fixed', () => {
  it('saves a valid fixed entry', async () => {
    const repo = new FakeRepo()
    const uc = new CreateEntryUseCase(repo)
    const e = await uc.execute(fixedDTO)
    expect(e.valueType).toBe(EntryValueType.FIXED)
    expect(repo.saved.length).toBe(1)
  })
})

describe('CreateEntryUseCase — relative', () => {
  let repo: FakeRepo
  let uc: CreateEntryUseCase
  const fixed = new Entry({
    id: 'fix1',
    name: 'Cliente A',
    amount: Money.fromCents(100000),
    dueDay: 5,
    kind: 'income',
    recurrence: 'monthly',
    createdAt: YearMonth.of(2026, 1),
    deletedFromMonth: null,
    context: Ctx.PJ,
    valueType: EntryValueType.FIXED,
  })

  beforeEach(() => {
    repo = new FakeRepo()
    repo.byId.set(fixed.id, fixed)
    uc = new CreateEntryUseCase(repo)
  })

  const baseRel = {
    valueType: EntryValueType.RELATIVE as const,
    name: 'Imposto',
    dueDay: 20,
    kind: 'expense' as const,
    context: Ctx.PJ,
  }

  it('saves a valid relative entry', async () => {
    await uc.execute({
      ...baseRel,
      formula: {
        terms: [{ set: { type: FormulaSetType.ALL, kind: 'income' }, sign: FormulaTermSign.POSITIVE }],
        percentage: 10,
      },
    })
    expect(repo.saved.length).toBe(1)
    expect(repo.saved[0].valueType).toBe(EntryValueType.RELATIVE)
  })

  it('rejects empty terms', async () => {
    await expect(
      uc.execute({ ...baseRel, formula: { terms: [], percentage: 10 } }),
    ).rejects.toThrow(/term/i)
  })

  it('rejects percentage <= 0', async () => {
    await expect(
      uc.execute({
        ...baseRel,
        formula: {
          terms: [{ set: { type: FormulaSetType.ALL, kind: 'income' }, sign: FormulaTermSign.POSITIVE }],
          percentage: 0,
        },
      }),
    ).rejects.toThrow(/percentage/i)
  })

  it('rejects EXPLICIT term referencing non-existent entry', async () => {
    await expect(
      uc.execute({
        ...baseRel,
        formula: {
          terms: [{ set: { type: FormulaSetType.EXPLICIT, entryIds: ['missing'] }, sign: FormulaTermSign.POSITIVE }],
          percentage: 10,
        },
      }),
    ).rejects.toThrow(/not found|missing/i)
  })

  it('rejects EXPLICIT term referencing a relative entry', async () => {
    const rel = new Entry({
      id: 'rel-other',
      name: 'Outra rel',
      formula: {
        terms: [{ set: { type: FormulaSetType.ALL, kind: 'income' }, sign: FormulaTermSign.POSITIVE }],
        percentage: 5,
      },
      dueDay: 1,
      kind: 'expense',
      recurrence: 'monthly',
      createdAt: YearMonth.of(2026, 1),
      deletedFromMonth: null,
      context: Ctx.PJ,
      valueType: EntryValueType.RELATIVE,
    })
    repo.byId.set(rel.id, rel)
    await expect(
      uc.execute({
        ...baseRel,
        formula: {
          terms: [{ set: { type: FormulaSetType.EXPLICIT, entryIds: [rel.id] }, sign: FormulaTermSign.POSITIVE }],
          percentage: 10,
        },
      }),
    ).rejects.toThrow(/relative/i)
  })

  it('rejects EXPLICIT term referencing entry from another context', async () => {
    const pf = new Entry({
      id: 'pf1',
      name: 'PF',
      amount: Money.fromCents(1000),
      dueDay: 1,
      kind: 'income',
      recurrence: 'monthly',
      createdAt: YearMonth.of(2026, 1),
      deletedFromMonth: null,
      context: Ctx.PF,
      valueType: EntryValueType.FIXED,
    })
    repo.byId.set(pf.id, pf)
    await expect(
      uc.execute({
        ...baseRel,
        formula: {
          terms: [{ set: { type: FormulaSetType.EXPLICIT, entryIds: [pf.id] }, sign: FormulaTermSign.POSITIVE }],
          percentage: 10,
        },
      }),
    ).rejects.toThrow(/context/i)
  })
})
```

- [ ] **Step 2: Run tests to verify failure**

Run: `npm run test -- src/application/use-cases/CreateEntry.test.ts`
Expected: FAIL.

- [ ] **Step 3: Rewrite CreateEntry**

```ts
// src/application/use-cases/CreateEntry.ts
import { Entry } from '../../domain/entities/Entry'
import type { IEntryRepository } from '../../domain/repositories/IEntryRepository'
import {
  EntryValueType,
  FormulaSetType,
} from '../../domain/value-objects/EntryStatus'
import type { EntryFormula } from '../../domain/value-objects/EntryFormula'
import type { ExpenseContext } from '../../domain/value-objects/ExpenseContext'
import { Money } from '../../domain/value-objects/Money'
import { YearMonth } from '../../domain/value-objects/YearMonth'
import type {
  CreateEntryDTO,
  CreateFixedEntryDTO,
  CreateRelativeEntryDTO,
} from '../dto/CreateEntryDTO'

export class CreateEntryUseCase {
  constructor(private readonly entryRepo: IEntryRepository) {}

  async execute(dto: CreateEntryDTO): Promise<Entry> {
    if (dto.valueType === EntryValueType.FIXED) {
      return this.createFixed(dto)
    }
    return this.createRelative(dto)
  }

  private async createFixed(dto: CreateFixedEntryDTO): Promise<Entry> {
    const entry = new Entry({
      id: crypto.randomUUID(),
      name: dto.name,
      amount: Money.fromDecimal(dto.amount),
      dueDay: dto.dueDay,
      kind: dto.kind,
      recurrence: dto.recurrence,
      createdAt: YearMonth.current(),
      deletedFromMonth: null,
      context: dto.context,
      valueType: EntryValueType.FIXED,
    })
    await this.entryRepo.save(entry)
    return entry
  }

  private async createRelative(dto: CreateRelativeEntryDTO): Promise<Entry> {
    await this.validateFormula(dto.formula, dto.context)
    const entry = new Entry({
      id: crypto.randomUUID(),
      name: dto.name,
      formula: dto.formula,
      dueDay: dto.dueDay,
      kind: dto.kind,
      recurrence: 'monthly',
      createdAt: YearMonth.current(),
      deletedFromMonth: null,
      context: dto.context,
      valueType: EntryValueType.RELATIVE,
    })
    await this.entryRepo.save(entry)
    return entry
  }

  private async validateFormula(formula: EntryFormula, ownerContext: ExpenseContext): Promise<void> {
    if (formula.terms.length === 0) {
      throw new Error('Formula must have at least one term')
    }
    if (formula.percentage <= 0) {
      throw new Error('Formula percentage must be > 0')
    }
    const explicitIds = formula.terms
      .filter((t) => t.set.type === FormulaSetType.EXPLICIT)
      .flatMap((t) => (t.set.type === FormulaSetType.EXPLICIT ? t.set.entryIds : []))

    for (const id of explicitIds) {
      const ref = await this.entryRepo.getById(id)
      if (!ref) throw new Error(`Referenced entry not found: ${id}`)
      if (ref.valueType === EntryValueType.RELATIVE) {
        throw new Error(`Relative entries cannot reference other relative entries (id=${id})`)
      }
      if (ref.context !== ownerContext) {
        throw new Error(`Referenced entry must share context (id=${id})`)
      }
    }
  }
}
```

- [ ] **Step 4: Run CreateEntry tests**

Run: `npm run test -- src/application/use-cases/CreateEntry.test.ts`
Expected: PASS.

- [ ] **Step 5: Write failing tests for UpdateEntry**

```ts
// src/application/use-cases/UpdateEntry.test.ts
import { describe, it, expect } from 'vitest'
import { UpdateEntryUseCase } from './UpdateEntry'
import { Entry } from '../../domain/entities/Entry'
import {
  EntryValueType,
  FormulaSetType,
  FormulaTermSign,
} from '../../domain/value-objects/EntryStatus'
import { ExpenseContext } from '../../domain/value-objects/ExpenseContext'
import { Money } from '../../domain/value-objects/Money'
import { YearMonth } from '../../domain/value-objects/YearMonth'
import type { IEntryRepository } from '../../domain/repositories/IEntryRepository'

class FakeRepo implements IEntryRepository {
  byId = new Map<string, Entry>()
  async getAll() { return Array.from(this.byId.values()) }
  async getById(id: string) { return this.byId.get(id) ?? null }
  async save(e: Entry) { this.byId.set(e.id, e) }
  async update(e: Entry) { this.byId.set(e.id, e) }
}

describe('UpdateEntryUseCase', () => {
  it('updates fixed entry as a revision', async () => {
    const repo = new FakeRepo()
    const e = new Entry({
      id: 'fx', name: 'Aluguel', amount: Money.fromCents(150000),
      dueDay: 5, kind: 'expense', recurrence: 'monthly',
      createdAt: YearMonth.of(2026, 1), deletedFromMonth: null,
      context: ExpenseContext.PF, valueType: EntryValueType.FIXED,
    })
    repo.byId.set(e.id, e)
    const uc = new UpdateEntryUseCase(repo)
    await uc.execute({
      valueType: EntryValueType.FIXED,
      entryId: 'fx',
      name: 'Aluguel novo',
      amount: 1700,
      dueDay: 10,
      effectiveFromMonth: '2026-04',
    })
    const updated = repo.byId.get('fx')!
    expect(updated.revisions.length).toBe(1)
    expect(updated.revisions[0].valueType).toBe(EntryValueType.FIXED)
  })

  it('rejects changing valueType', async () => {
    const repo = new FakeRepo()
    const e = new Entry({
      id: 'fx', name: 'Aluguel', amount: Money.fromCents(150000),
      dueDay: 5, kind: 'expense', recurrence: 'monthly',
      createdAt: YearMonth.of(2026, 1), deletedFromMonth: null,
      context: ExpenseContext.PF, valueType: EntryValueType.FIXED,
    })
    repo.byId.set(e.id, e)
    const uc = new UpdateEntryUseCase(repo)
    await expect(
      uc.execute({
        valueType: EntryValueType.RELATIVE,
        entryId: 'fx',
        name: 'x',
        formula: {
          terms: [{ set: { type: FormulaSetType.ALL, kind: 'income' }, sign: FormulaTermSign.POSITIVE }],
          percentage: 10,
        },
        dueDay: 1,
        effectiveFromMonth: '2026-04',
      }),
    ).rejects.toThrow(/value type|valueType|cannot change/i)
  })
})
```

- [ ] **Step 6: Run tests to verify failure**

Run: `npm run test -- src/application/use-cases/UpdateEntry.test.ts`
Expected: FAIL.

- [ ] **Step 7: Rewrite UpdateEntry**

```ts
// src/application/use-cases/UpdateEntry.ts
import type { IEntryRepository } from '../../domain/repositories/IEntryRepository'
import {
  EntryValueType,
  FormulaSetType,
} from '../../domain/value-objects/EntryStatus'
import type { EntryFormula } from '../../domain/value-objects/EntryFormula'
import type { ExpenseContext } from '../../domain/value-objects/ExpenseContext'
import { Money } from '../../domain/value-objects/Money'
import { YearMonth } from '../../domain/value-objects/YearMonth'
import type { UpdateEntryDTO } from '../dto/UpdateEntryDTO'

export class UpdateEntryUseCase {
  constructor(private readonly entryRepo: IEntryRepository) {}

  async execute(dto: UpdateEntryDTO): Promise<void> {
    const entry = await this.entryRepo.getById(dto.entryId)
    if (!entry) throw new Error(`Entry not found: ${dto.entryId}`)
    if (entry.valueType !== dto.valueType) {
      throw new Error('Cannot change entry valueType')
    }
    const fromMonth = YearMonth.fromKey(dto.effectiveFromMonth)

    if (dto.valueType === EntryValueType.FIXED) {
      entry.addRevision({
        valueType: EntryValueType.FIXED,
        fromMonth,
        name: dto.name,
        amount: Money.fromDecimal(dto.amount),
        dueDay: dto.dueDay,
      })
    } else {
      await this.validateFormula(dto.formula, entry.context, dto.entryId)
      entry.addRevision({
        valueType: EntryValueType.RELATIVE,
        fromMonth,
        name: dto.name,
        formula: dto.formula,
        dueDay: dto.dueDay,
      })
    }

    await this.entryRepo.update(entry)
  }

  private async validateFormula(
    formula: EntryFormula,
    ownerContext: ExpenseContext,
    selfId: string,
  ): Promise<void> {
    if (formula.terms.length === 0) throw new Error('Formula must have at least one term')
    if (formula.percentage <= 0) throw new Error('Formula percentage must be > 0')
    const explicitIds = formula.terms
      .filter((t) => t.set.type === FormulaSetType.EXPLICIT)
      .flatMap((t) => (t.set.type === FormulaSetType.EXPLICIT ? t.set.entryIds : []))
    for (const id of explicitIds) {
      if (id === selfId) throw new Error('Formula cannot reference its own entry')
      const ref = await this.entryRepo.getById(id)
      if (!ref) throw new Error(`Referenced entry not found: ${id}`)
      if (ref.valueType === EntryValueType.RELATIVE) {
        throw new Error(`Relative entries cannot reference other relative entries (id=${id})`)
      }
      if (ref.context !== ownerContext) {
        throw new Error(`Referenced entry must share context (id=${id})`)
      }
    }
  }
}
```

- [ ] **Step 8: Run all tests**

Run: `npm run test`
Expected: PASS.

- [ ] **Step 9: Commit**

```bash
git add src/application
git commit -m "feat(application): discriminated Create/UpdateEntry with formula validation"
```

---

## Task 8: IEntryStatusRepository — snapshot field

**Files:**
- Modify: `src/domain/repositories/IEntryStatusRepository.ts`

- [ ] **Step 1: Update interface**

```ts
// src/domain/repositories/IEntryStatusRepository.ts
import type { EntryStatus } from '../value-objects/EntryStatus'
import type { YearMonth } from '../value-objects/YearMonth'

export interface MonthStatusEntry {
  status: EntryStatus
  snapshotAmountCents?: number
}

export interface IEntryStatusRepository {
  getStatusesForMonth(month: YearMonth): Promise<Map<string, EntryStatus>>
  getStatusesForMonths(months: YearMonth[]): Promise<Map<string, Map<string, EntryStatus>>>
  getSnapshotsForMonth(month: YearMonth): Promise<Map<string, number>>
  setStatus(
    month: YearMonth,
    entryId: string,
    status: EntryStatus,
    snapshotAmountCents?: number,
  ): Promise<void>
  removeStatus(month: YearMonth, entryId: string): Promise<void>
}
```

- [ ] **Step 2: Type-check (will surface impls in Task 9 + 10)**

Run: `npx vue-tsc --noEmit`
Expected: FAIL — impls don't have new methods. Fix in Task 9.

- [ ] **Step 3: Stage** — proceed to Task 9.

---

## Task 9: Status repository implementations + GetMonthlyEntries snapshot wiring

**Files:**
- Modify: `src/infrastructure/repositories/SupabaseEntryStatusRepository.ts`
- Modify: `src/infrastructure/repositories/LocalStorageEntryStatusRepository.ts`
- Modify: `src/application/use-cases/GetMonthlyEntries.ts`
- Modify: `src/application/use-cases/GetMonthlySummary.ts` (if uses snapshots — check)

- [ ] **Step 1: Update Supabase impl**

```ts
// src/infrastructure/repositories/SupabaseEntryStatusRepository.ts
import type { IEntryStatusRepository } from '../../domain/repositories/IEntryStatusRepository'
import { EntryStatus } from '../../domain/value-objects/EntryStatus'
import type { YearMonth } from '../../domain/value-objects/YearMonth'
import { supabase } from '../supabase/client'

interface EntryStatusRow {
  month: string
  entry_id: string
  status: string
  snapshot_amount_cents: number | null
}

export class SupabaseEntryStatusRepository implements IEntryStatusRepository {
  async getStatusesForMonth(month: YearMonth): Promise<Map<string, EntryStatus>> {
    const { data, error } = await supabase
      .from('entry_statuses')
      .select('entry_id, status')
      .eq('month', month.key)
    if (error) throw new Error(`Failed to fetch statuses: ${error.message}`)
    const map = new Map<string, EntryStatus>()
    for (const row of (data as Pick<EntryStatusRow, 'entry_id' | 'status'>[])) {
      if (Object.values(EntryStatus).includes(row.status as EntryStatus)) {
        map.set(row.entry_id, row.status as EntryStatus)
      }
    }
    return map
  }

  async getStatusesForMonths(months: YearMonth[]): Promise<Map<string, Map<string, EntryStatus>>> {
    const monthKeys = months.map((m) => m.key)
    const { data, error } = await supabase
      .from('entry_statuses')
      .select('month, entry_id, status')
      .in('month', monthKeys)
    if (error) throw new Error(`Failed to fetch statuses: ${error.message}`)
    const result = new Map<string, Map<string, EntryStatus>>()
    for (const row of data as Pick<EntryStatusRow, 'month' | 'entry_id' | 'status'>[]) {
      if (!Object.values(EntryStatus).includes(row.status as EntryStatus)) continue
      let m = result.get(row.month)
      if (!m) { m = new Map(); result.set(row.month, m) }
      m.set(row.entry_id, row.status as EntryStatus)
    }
    return result
  }

  async getSnapshotsForMonth(month: YearMonth): Promise<Map<string, number>> {
    const { data, error } = await supabase
      .from('entry_statuses')
      .select('entry_id, snapshot_amount_cents')
      .eq('month', month.key)
    if (error) throw new Error(`Failed to fetch snapshots: ${error.message}`)
    const map = new Map<string, number>()
    for (const row of data as Pick<EntryStatusRow, 'entry_id' | 'snapshot_amount_cents'>[]) {
      if (row.snapshot_amount_cents !== null) {
        map.set(row.entry_id, row.snapshot_amount_cents)
      }
    }
    return map
  }

  async setStatus(
    month: YearMonth,
    entryId: string,
    status: EntryStatus,
    snapshotAmountCents?: number,
  ): Promise<void> {
    const { error } = await supabase
      .from('entry_statuses')
      .upsert({
        month: month.key,
        entry_id: entryId,
        status,
        snapshot_amount_cents: snapshotAmountCents ?? null,
      })
    if (error) throw new Error(`Failed to set status: ${error.message}`)
  }

  async removeStatus(month: YearMonth, entryId: string): Promise<void> {
    const { error } = await supabase
      .from('entry_statuses')
      .delete()
      .eq('month', month.key)
      .eq('entry_id', entryId)
    if (error) throw new Error(`Failed to remove status: ${error.message}`)
  }
}
```

- [ ] **Step 2: Update LocalStorage impl**

Read `src/infrastructure/repositories/LocalStorageEntryStatusRepository.ts` first, then add a parallel snapshot record. Reuse the existing key/storage shape; just store an additional object keyed by `${monthKey}:${entryId}` → snapshot cents. Add `getSnapshotsForMonth` and accept the new `snapshotAmountCents` parameter in `setStatus`. `removeStatus` should also remove the snapshot for that key.

- [ ] **Step 3: Wire snapshots through GetMonthlyEntries**

Update `src/application/use-cases/GetMonthlyEntries.ts`:

```ts
async execute(month: YearMonth, context: ExpenseContext): Promise<MonthlyEntryDTO[]> {
  const allEntries = await this.entryRepo.getAll(context)
  const [statuses, snapshots] = await Promise.all([
    this.statusRepo.getStatusesForMonth(month),
    this.statusRepo.getSnapshotsForMonth(month),
  ])
  const views = this.domainService.buildMonthView(allEntries, month, statuses, snapshots)

  return views.map((v) => ({
    entryId: v.entryId,
    name: v.name,
    amountInCents: v.amount.inCents,
    dueDay: v.dueDay,
    kind: v.kind,
    status: v.status,
    valueType: v.valueType,
    formulaDescription: v.formulaDescription,
  }))
}
```

- [ ] **Step 4: Update MonthlyEntryDTO**

```ts
// src/application/dto/MonthlyEntryDTO.ts
import type {
  EntryKind,
  EntryStatus,
  EntryValueType,
} from '../../domain/value-objects/EntryStatus'

export interface MonthlyEntryDTO {
  entryId: string
  name: string
  amountInCents: number
  dueDay: number
  kind: EntryKind
  status: EntryStatus
  valueType: EntryValueType
  formulaDescription?: string
}
```

- [ ] **Step 5: Apply same snapshot wiring to GetMonthlySummary** if it calls `buildMonthView` directly (read the file; if it does, follow the same pattern).

- [ ] **Step 6: Run tests**

Run: `npm run test`
Expected: PASS (no test changes needed; existing tests already pass `new Map()` for snapshots).

- [ ] **Step 7: Commit**

```bash
git add src/domain/repositories src/infrastructure/repositories src/application
git commit -m "feat(persistence): add snapshot_amount_cents support to status repos"
```

---

## Task 10: ConfirmEntry — snapshot logic; RevertEntryStatus — clear snapshot

**Files:**
- Modify: `src/application/use-cases/ConfirmEntry.ts`
- Modify: `src/application/use-cases/RevertEntryStatus.ts`
- Add tests: `src/application/use-cases/ConfirmEntry.test.ts`

- [ ] **Step 1: Write failing tests**

```ts
// src/application/use-cases/ConfirmEntry.test.ts
import { describe, it, expect } from 'vitest'
import { ConfirmEntryUseCase } from './ConfirmEntry'
import { Entry } from '../../domain/entities/Entry'
import {
  EntryStatus,
  EntryValueType,
  FormulaSetType,
  FormulaTermSign,
} from '../../domain/value-objects/EntryStatus'
import { ExpenseContext } from '../../domain/value-objects/ExpenseContext'
import { Money } from '../../domain/value-objects/Money'
import { YearMonth } from '../../domain/value-objects/YearMonth'
import type { IEntryRepository } from '../../domain/repositories/IEntryRepository'
import type { IEntryStatusRepository } from '../../domain/repositories/IEntryStatusRepository'

class FakeEntryRepo implements IEntryRepository {
  byId = new Map<string, Entry>()
  async getAll(ctx: ExpenseContext) {
    return Array.from(this.byId.values()).filter((e) => e.context === ctx)
  }
  async getById(id: string) { return this.byId.get(id) ?? null }
  async save(e: Entry) { this.byId.set(e.id, e) }
  async update(e: Entry) { this.byId.set(e.id, e) }
}

class FakeStatusRepo implements IEntryStatusRepository {
  calls: { entryId: string; status: EntryStatus; snapshot?: number }[] = []
  async getStatusesForMonth() { return new Map() }
  async getStatusesForMonths() { return new Map() }
  async getSnapshotsForMonth() { return new Map() }
  async setStatus(_m: YearMonth, entryId: string, status: EntryStatus, snapshot?: number) {
    this.calls.push({ entryId, status, snapshot })
  }
  async removeStatus() {}
}

const month = YearMonth.of(2026, 6)

describe('ConfirmEntryUseCase', () => {
  it('confirms a fixed entry without snapshot', async () => {
    const er = new FakeEntryRepo()
    er.byId.set('fx', new Entry({
      id: 'fx', name: 'Aluguel', amount: Money.fromCents(100000),
      dueDay: 5, kind: 'expense', recurrence: 'monthly',
      createdAt: YearMonth.of(2026, 1), deletedFromMonth: null,
      context: ExpenseContext.PF, valueType: EntryValueType.FIXED,
    }))
    const sr = new FakeStatusRepo()
    await new ConfirmEntryUseCase(er, sr).execute(month, 'fx')
    expect(sr.calls[0]).toEqual({ entryId: 'fx', status: EntryStatus.CONFIRMED, snapshot: undefined })
  })

  it('confirms a relative entry with computed snapshot', async () => {
    const er = new FakeEntryRepo()
    er.byId.set('inc', new Entry({
      id: 'inc', name: 'Cliente A', amount: Money.fromCents(100000),
      dueDay: 5, kind: 'income', recurrence: 'monthly',
      createdAt: YearMonth.of(2026, 1), deletedFromMonth: null,
      context: ExpenseContext.PJ, valueType: EntryValueType.FIXED,
    }))
    er.byId.set('tax', new Entry({
      id: 'tax', name: 'Imposto', dueDay: 20, kind: 'expense',
      recurrence: 'monthly', createdAt: YearMonth.of(2026, 1),
      deletedFromMonth: null, context: ExpenseContext.PJ,
      valueType: EntryValueType.RELATIVE,
      formula: {
        terms: [{ set: { type: FormulaSetType.ALL, kind: 'income' }, sign: FormulaTermSign.POSITIVE }],
        percentage: 10,
      },
    }))
    const sr = new FakeStatusRepo()
    await new ConfirmEntryUseCase(er, sr).execute(month, 'tax')
    expect(sr.calls[0].snapshot).toBe(10000)
    expect(sr.calls[0].status).toBe(EntryStatus.CONFIRMED)
  })
})
```

- [ ] **Step 2: Run failing test**

Run: `npm run test -- src/application/use-cases/ConfirmEntry.test.ts`
Expected: FAIL.

- [ ] **Step 3: Update ConfirmEntry**

```ts
// src/application/use-cases/ConfirmEntry.ts
import type { IEntryRepository } from '../../domain/repositories/IEntryRepository'
import type { IEntryStatusRepository } from '../../domain/repositories/IEntryStatusRepository'
import { MonthlyEntryService } from '../../domain/services/MonthlyEntryService'
import {
  EntryStatus,
  EntryValueType,
} from '../../domain/value-objects/EntryStatus'
import type { YearMonth } from '../../domain/value-objects/YearMonth'

export class ConfirmEntryUseCase {
  private readonly service = new MonthlyEntryService()

  constructor(
    private readonly entryRepo: IEntryRepository,
    private readonly statusRepo: IEntryStatusRepository,
  ) {}

  async execute(month: YearMonth, entryId: string): Promise<void> {
    const target = await this.entryRepo.getById(entryId)
    if (!target) throw new Error(`Entry not found: ${entryId}`)

    if (target.valueType === EntryValueType.FIXED) {
      await this.statusRepo.setStatus(month, entryId, EntryStatus.CONFIRMED)
      return
    }

    const allInContext = await this.entryRepo.getAll(target.context)
    const [statuses, snapshots] = await Promise.all([
      this.statusRepo.getStatusesForMonth(month),
      this.statusRepo.getSnapshotsForMonth(month),
    ])
    const views = this.service.buildMonthView(allInContext, month, statuses, snapshots)
    const targetView = views.find((v) => v.entryId === entryId)
    if (!targetView) throw new Error(`Relative entry not active in month: ${entryId}`)
    await this.statusRepo.setStatus(
      month,
      entryId,
      EntryStatus.CONFIRMED,
      targetView.amount.inCents,
    )
  }
}
```

Note: `ConfirmEntryUseCase` now takes `entryRepo` as a new dependency. Update the container:

`src/infrastructure/container.ts` — find the `ConfirmEntryUseCase` instantiation and pass `entryRepo` first.

- [ ] **Step 4: Update RevertEntryStatus**

`removeStatus` already deletes the row, which removes the snapshot too. No change needed in the use case. Verify by reading `src/application/use-cases/RevertEntryStatus.ts` — if it calls `removeStatus`, leave alone; document this in a comment-free way (no comment to add).

- [ ] **Step 5: Run all tests**

Run: `npm run test`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/application src/infrastructure/container.ts
git commit -m "feat(application): snapshot relative-entry amount on confirm"
```

---

## Task 11: Database migration

**Files:**
- Create: `supabase/migrations/20260509000000_relative_entries.sql`

- [ ] **Step 1: Write migration**

```sql
-- supabase/migrations/20260509000000_relative_entries.sql
-- Adds RELATIVE entry support: value_type discriminator, optional formula, snapshot on status.

ALTER TABLE public.entries
  ADD COLUMN value_type text NOT NULL DEFAULT 'fixed'
    CHECK (value_type IN ('fixed', 'relative'));
ALTER TABLE public.entries ALTER COLUMN value_type DROP DEFAULT;

ALTER TABLE public.entries ALTER COLUMN amount_cents DROP NOT NULL;

ALTER TABLE public.entries ADD COLUMN formula jsonb;

ALTER TABLE public.entries ADD CONSTRAINT entries_value_type_payload_check CHECK (
  (value_type = 'fixed'    AND amount_cents IS NOT NULL AND formula IS NULL)
  OR
  (value_type = 'relative' AND amount_cents IS NULL     AND formula IS NOT NULL)
);

ALTER TABLE public.entry_statuses
  ADD COLUMN snapshot_amount_cents integer
    CHECK (snapshot_amount_cents IS NULL OR snapshot_amount_cents >= 0);
```

- [ ] **Step 2: Apply migration locally** *(manual)*

If using Supabase CLI: `supabase db push` or apply via Supabase dashboard SQL editor for the dev project. **Do not push to prod yet.**

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260509000000_relative_entries.sql
git commit -m "feat(db): add value_type, formula, and snapshot_amount_cents columns"
```

---

## Task 12: EntryMapper — discriminated JSON

**Files:**
- Modify: `src/infrastructure/mappers/EntryMapper.ts`
- Modify: `src/infrastructure/mappers/EntryMapper.test.ts`

- [ ] **Step 1: Write failing tests for relative round-trip**

Append to `src/infrastructure/mappers/EntryMapper.test.ts`:

```ts
import { EntryValueType, FormulaSetType, FormulaTermSign } from '../../domain/value-objects/EntryStatus'

describe('EntryMapper (relative)', () => {
  it('round-trips a relative entry', () => {
    const json = {
      valueType: EntryValueType.RELATIVE,
      id: 'r1',
      name: 'Imposto',
      dueDay: 20,
      kind: 'expense' as const,
      recurrence: 'monthly' as const,
      createdAt: '2026-01',
      deletedFromMonth: null,
      context: ExpenseContext.PJ,
      formula: {
        terms: [
          { set: { type: FormulaSetType.ALL, kind: 'income' }, sign: FormulaTermSign.POSITIVE },
        ],
        percentage: 20,
      },
    }
    const e = EntryMapper.toDomain(json)
    expect(e.valueType).toBe(EntryValueType.RELATIVE)
    expect(e.formula?.percentage).toBe(20)
    const back = EntryMapper.toJSON(e)
    expect(back).toEqual(json)
  })

  it('round-trips a relative entry with formula revisions', () => {
    const json = {
      valueType: EntryValueType.RELATIVE,
      id: 'r2',
      name: 'Imposto',
      dueDay: 20,
      kind: 'expense' as const,
      recurrence: 'monthly' as const,
      createdAt: '2026-01',
      deletedFromMonth: null,
      context: ExpenseContext.PJ,
      formula: {
        terms: [{ set: { type: FormulaSetType.ALL, kind: 'income' }, sign: FormulaTermSign.POSITIVE }],
        percentage: 15,
      },
      revisions: [{
        valueType: EntryValueType.RELATIVE,
        fromMonth: '2026-04',
        name: 'Imposto novo',
        formula: {
          terms: [{ set: { type: FormulaSetType.ALL, kind: 'income' }, sign: FormulaTermSign.POSITIVE }],
          percentage: 20,
        },
        dueDay: 25,
      }],
    }
    const e = EntryMapper.toDomain(json)
    expect(e.revisions[0].valueType).toBe(EntryValueType.RELATIVE)
    const back = EntryMapper.toJSON(e)
    expect(back).toEqual(json)
  })
})
```

Update existing fixed tests to include `valueType: EntryValueType.FIXED` in JSON shape — this is a breaking change to `EntryJSON`.

- [ ] **Step 2: Run tests to verify failure**

Run: `npm run test -- src/infrastructure/mappers/EntryMapper.test.ts`
Expected: FAIL.

- [ ] **Step 3: Rewrite EntryMapper**

```ts
// src/infrastructure/mappers/EntryMapper.ts
import { Entry, type EntryRevision } from '../../domain/entities/Entry'
import { ExpenseContext } from '../../domain/value-objects/ExpenseContext'
import {
  EntryValueType,
  type EntryKind,
  type Recurrence,
} from '../../domain/value-objects/EntryStatus'
import type { EntryFormula } from '../../domain/value-objects/EntryFormula'
import { Money } from '../../domain/value-objects/Money'
import { YearMonth } from '../../domain/value-objects/YearMonth'

export interface FixedEntryRevisionJSON {
  valueType: EntryValueType.FIXED
  fromMonth: string
  name: string
  amountInCents: number
  dueDay: number
}

export interface RelativeEntryRevisionJSON {
  valueType: EntryValueType.RELATIVE
  fromMonth: string
  name: string
  formula: EntryFormula
  dueDay: number
}

export type EntryRevisionJSON = FixedEntryRevisionJSON | RelativeEntryRevisionJSON

interface BaseEntryJSON {
  id: string
  name: string
  dueDay: number
  kind: EntryKind
  recurrence: Recurrence
  createdAt: string
  deletedFromMonth: string | null
  context: ExpenseContext
}

export interface FixedEntryJSON extends BaseEntryJSON {
  valueType: EntryValueType.FIXED
  amountInCents: number
  revisions?: FixedEntryRevisionJSON[]
}

export interface RelativeEntryJSON extends BaseEntryJSON {
  valueType: EntryValueType.RELATIVE
  formula: EntryFormula
  revisions?: RelativeEntryRevisionJSON[]
}

export type EntryJSON = FixedEntryJSON | RelativeEntryJSON

export class EntryMapper {
  static toDomain(json: EntryJSON): Entry {
    const common = {
      id: json.id,
      name: json.name,
      dueDay: json.dueDay,
      kind: json.kind,
      recurrence: json.recurrence,
      createdAt: YearMonth.fromKey(json.createdAt),
      deletedFromMonth: json.deletedFromMonth ? YearMonth.fromKey(json.deletedFromMonth) : null,
      context: json.context,
    }
    if (json.valueType === EntryValueType.FIXED) {
      const revisions: EntryRevision[] = (json.revisions ?? []).map((r) => ({
        valueType: EntryValueType.FIXED,
        fromMonth: YearMonth.fromKey(r.fromMonth),
        name: r.name,
        amount: Money.fromCents(r.amountInCents),
        dueDay: r.dueDay,
      }))
      return new Entry({
        ...common,
        valueType: EntryValueType.FIXED,
        amount: Money.fromCents(json.amountInCents),
        revisions,
      })
    }
    const revisions: EntryRevision[] = (json.revisions ?? []).map((r) => ({
      valueType: EntryValueType.RELATIVE,
      fromMonth: YearMonth.fromKey(r.fromMonth),
      name: r.name,
      formula: r.formula,
      dueDay: r.dueDay,
    }))
    return new Entry({
      ...common,
      valueType: EntryValueType.RELATIVE,
      formula: json.formula,
      revisions,
    })
  }

  static toJSON(entity: Entry): EntryJSON {
    const base: BaseEntryJSON = {
      id: entity.id,
      name: entity.name,
      dueDay: entity.dueDay,
      kind: entity.kind,
      recurrence: entity.recurrence,
      createdAt: entity.createdAt.key,
      deletedFromMonth: entity.deletedFromMonth?.key ?? null,
      context: entity.context,
    }
    if (entity.valueType === EntryValueType.FIXED) {
      const revs = entity.revisions
        .filter((r) => r.valueType === EntryValueType.FIXED)
        .map((r) => ({
          valueType: EntryValueType.FIXED as const,
          fromMonth: r.fromMonth.key,
          name: r.name,
          amountInCents: (r as Extract<EntryRevision, { valueType: EntryValueType.FIXED }>).amount.inCents,
          dueDay: r.dueDay,
        }))
      const out: FixedEntryJSON = {
        ...base,
        valueType: EntryValueType.FIXED,
        amountInCents: (entity.amount as Money).inCents,
      }
      if (revs.length > 0) out.revisions = revs
      return out
    }
    const revs = entity.revisions
      .filter((r) => r.valueType === EntryValueType.RELATIVE)
      .map((r) => ({
        valueType: EntryValueType.RELATIVE as const,
        fromMonth: r.fromMonth.key,
        name: r.name,
        formula: (r as Extract<EntryRevision, { valueType: EntryValueType.RELATIVE }>).formula,
        dueDay: r.dueDay,
      }))
    const out: RelativeEntryJSON = {
      ...base,
      valueType: EntryValueType.RELATIVE,
      formula: entity.formula as EntryFormula,
    }
    if (revs.length > 0) out.revisions = revs
    return out
  }
}
```

- [ ] **Step 4: Run mapper tests**

Run: `npm run test -- src/infrastructure/mappers/EntryMapper.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/infrastructure/mappers
git commit -m "feat(persistence): discriminated EntryJSON with formula support"
```

---

## Task 13: SupabaseEntryRepository — discriminated rows

**Files:**
- Modify: `src/infrastructure/repositories/SupabaseEntryRepository.ts`

- [ ] **Step 1: Update repo**

```ts
// src/infrastructure/repositories/SupabaseEntryRepository.ts
import type { Entry } from '../../domain/entities/Entry'
import type { IEntryRepository } from '../../domain/repositories/IEntryRepository'
import type { ExpenseContext } from '../../domain/value-objects/ExpenseContext'
import {
  EntryValueType,
  type EntryKind,
  type Recurrence,
} from '../../domain/value-objects/EntryStatus'
import type { EntryFormula } from '../../domain/value-objects/EntryFormula'
import { EntryMapper, type EntryJSON, type EntryRevisionJSON } from '../mappers/EntryMapper'
import { supabase } from '../supabase/client'

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
  revisions: RevisionRow[] | null
}

interface RevisionRow {
  value_type: EntryValueType
  from_month: string
  name: string
  amount_cents?: number
  formula?: EntryFormula
  due_day: number
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
    const revisions: EntryRevisionJSON[] | undefined = row.revisions
      ? row.revisions.map((r) =>
          r.value_type === EntryValueType.FIXED
            ? {
                valueType: EntryValueType.FIXED,
                fromMonth: r.from_month,
                name: r.name,
                amountInCents: r.amount_cents as number,
                dueDay: r.due_day,
              }
            : {
                valueType: EntryValueType.RELATIVE,
                fromMonth: r.from_month,
                name: r.name,
                formula: r.formula as EntryFormula,
                dueDay: r.due_day,
              },
        )
      : undefined
    const json: EntryJSON = row.value_type === EntryValueType.FIXED
      ? {
          ...baseJson,
          valueType: EntryValueType.FIXED,
          amountInCents: row.amount_cents as number,
          revisions: revisions as Extract<EntryRevisionJSON, { valueType: EntryValueType.FIXED }>[] | undefined,
        }
      : {
          ...baseJson,
          valueType: EntryValueType.RELATIVE,
          formula: row.formula as EntryFormula,
          revisions: revisions as Extract<EntryRevisionJSON, { valueType: EntryValueType.RELATIVE }>[] | undefined,
        }
    return EntryMapper.toDomain(json)
  }

  private toRow(entry: Entry): EntryRow {
    const json = EntryMapper.toJSON(entry)
    const revisions: RevisionRow[] | null = json.revisions
      ? json.revisions.map((r) =>
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
      : null
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
    const { data, error } = await supabase.from('entries').select('*').eq('context', context)
    if (error) throw new Error(`Failed to fetch entries: ${error.message}`)
    return (data as EntryRow[]).map((row) => this.toDomain(row))
  }

  async getById(id: string): Promise<Entry | null> {
    const { data, error } = await supabase.from('entries').select('*').eq('id', id).maybeSingle()
    if (error) throw new Error(`Failed to fetch entry: ${error.message}`)
    return data ? this.toDomain(data as EntryRow) : null
  }

  async save(entry: Entry): Promise<void> {
    const row = this.toRow(entry)
    const { error } = await supabase.from('entries').insert(row)
    if (error) throw new Error(`Failed to save entry: ${error.message}`)
  }

  async update(entry: Entry): Promise<void> {
    const row = this.toRow(entry)
    const { id, ...updateData } = row
    const { error } = await supabase.from('entries').update(updateData).eq('id', id)
    if (error) throw new Error(`Failed to update entry: ${error.message}`)
  }
}
```

- [ ] **Step 2: Update LocalStorageEntryRepository**

Read the file first; apply the same shape transformation. Storage payload is JSON, so `EntryJSON` is already the right shape — adapt the (de)serialization to use the discriminated `EntryJSON` directly via `EntryMapper`.

- [ ] **Step 3: Type-check + run tests**

Run: `npx vue-tsc --noEmit && npm run test`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/infrastructure/repositories
git commit -m "feat(persistence): repos handle discriminated entry rows"
```

---

## Task 14: Pinia store — discriminated DTOs in addEntry/editEntry

**Files:**
- Modify: `src/presentation/stores/useEntryStore.ts`
- Modify: `src/presentation/composables/useCreateEntry.ts` (if it constrains the DTO type)

- [ ] **Step 1: Update store signatures**

Replace `addEntry` and `editEntry` in `useEntryStore.ts`:

```ts
async function addEntry(dto: Omit<CreateEntryDTO, 'context'>) {
  const withCtx = { ...dto, context: contextStore.current } as CreateEntryDTO
  await createEntry.execute(withCtx)
  await refresh()
}

async function editEntry(dto: Omit<UpdateEntryDTO, 'effectiveFromMonth'>) {
  const month = navigationStore.currentMonth
  const full = { ...dto, effectiveFromMonth: month.key } as UpdateEntryDTO
  await updateEntry.execute(full)
  await refresh()
}
```

The `as` casts unify the discriminated unions after spreading. Verify by typechecking.

- [ ] **Step 2: Type-check**

Run: `npx vue-tsc --noEmit`
Expected: PASS (UI not yet using new DTOs).

- [ ] **Step 3: Commit**

```bash
git add src/presentation/stores src/presentation/composables
git commit -m "feat(presentation): propagate discriminated DTOs through store"
```

---

## Task 15: EntryForm.vue — value-type toggle and formula builder

**Files:**
- Modify: `src/presentation/components/entry/EntryForm.vue`

This task touches a fair bit of template. Keep behavior of fixed mode identical to today.

- [ ] **Step 1: Replace EntryForm.vue**

```vue
<script setup lang="ts">
import { reactive, computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useEntryStore } from '../../stores/useEntryStore'
import { DUE_DAY_OPTIONS } from '../../../shared/constants'
import {
  EntryValueType,
  FormulaSetType,
  FormulaTermSign,
  type EntryKind,
  type Recurrence,
} from '../../../domain/value-objects/EntryStatus'
import type { EntryFormula, FormulaTerm } from '../../../domain/value-objects/EntryFormula'
import { FormulaResolver } from '../../../domain/services/FormulaResolver'
import { Money } from '../../../domain/value-objects/Money'
import { useCurrency } from '../../composables/useCurrency'
import { useContextStore } from '../../stores/useContextStore'

const props = withDefaults(defineProps<{ inline?: boolean }>(), { inline: false })
const emit = defineEmits<{ saved: [] }>()

const router = useRouter()
const entryStore = useEntryStore()
const contextStore = useContextStore()
const { formatCents } = useCurrency()

const valueType = ref<EntryValueType>(EntryValueType.FIXED)

const fixedForm = reactive({
  name: '',
  amount: '',
  dueDay: 1,
  kind: 'expense' as EntryKind,
  recurrence: 'monthly' as Recurrence,
})

const relativeForm = reactive({
  name: '',
  dueDay: 1,
  kind: 'expense' as EntryKind,
  percentage: '10',
  terms: [] as FormulaTerm[],
})

function addAllIncomeTerm() {
  relativeForm.terms.push({
    set: { type: FormulaSetType.ALL, kind: 'income' },
    sign: FormulaTermSign.POSITIVE,
  })
}

function addAllExpenseTerm() {
  relativeForm.terms.push({
    set: { type: FormulaSetType.ALL, kind: 'expense' },
    sign: FormulaTermSign.POSITIVE,
  })
}

function toggleSign(i: number) {
  const t = relativeForm.terms[i]
  t.sign = t.sign === FormulaTermSign.POSITIVE ? FormulaTermSign.NEGATIVE : FormulaTermSign.POSITIVE
}

function removeTerm(i: number) {
  relativeForm.terms.splice(i, 1)
}

const valueTypeItems = [
  { label: 'Fixo', value: EntryValueType.FIXED },
  { label: 'Relativo', value: EntryValueType.RELATIVE },
]

const dueDayItems = DUE_DAY_OPTIONS.map((opt) => ({ label: opt.label, value: opt.value }))
const kindItems = [
  { label: 'Despesa', value: 'expense' as const, icon: 'i-lucide-arrow-up-right' },
  { label: 'Receita', value: 'income' as const, icon: 'i-lucide-arrow-down-left' },
]
const recurrenceItems = [
  { label: 'Mensal', value: 'monthly' as const },
  { label: 'Pontual', value: 'once' as const },
]

const previewCents = computed(() => {
  const pct = parseFloat(relativeForm.percentage.replace(',', '.'))
  if (isNaN(pct) || pct <= 0 || relativeForm.terms.length === 0) return null
  const formula: EntryFormula = { terms: relativeForm.terms, percentage: pct }
  try {
    const resolver = new FormulaResolver()
    const result = resolver.resolve({
      formula,
      ownerContext: contextStore.current,
      fixedViews: entryStore.entries
        .filter((e) => e.valueType === EntryValueType.FIXED)
        .map((e) => ({
          entryId: e.entryId,
          name: e.name,
          amount: Money.fromCents(e.amountInCents),
          dueDay: e.dueDay,
          kind: e.kind,
          status: e.status,
          context: contextStore.current,
          valueType: EntryValueType.FIXED,
        })),
    })
    return result.inCents
  } catch {
    return null
  }
})

const canSubmitRelative = computed(() => {
  const pct = parseFloat(relativeForm.percentage.replace(',', '.'))
  return relativeForm.name.trim().length > 0 &&
    !isNaN(pct) && pct > 0 &&
    relativeForm.terms.length > 0
})

async function handleSubmit() {
  if (valueType.value === EntryValueType.FIXED) {
    const amount = parseFloat(fixedForm.amount.replace(',', '.'))
    if (!fixedForm.name.trim() || isNaN(amount) || amount <= 0) return
    await entryStore.addEntry({
      valueType: EntryValueType.FIXED,
      name: fixedForm.name.trim(),
      amount,
      dueDay: fixedForm.dueDay,
      kind: fixedForm.kind,
      recurrence: fixedForm.recurrence,
    })
  } else {
    if (!canSubmitRelative.value) return
    const pct = parseFloat(relativeForm.percentage.replace(',', '.'))
    await entryStore.addEntry({
      valueType: EntryValueType.RELATIVE,
      name: relativeForm.name.trim(),
      formula: { terms: [...relativeForm.terms], percentage: pct },
      dueDay: relativeForm.dueDay,
      kind: relativeForm.kind,
    })
  }

  if (props.inline) {
    fixedForm.name = ''; fixedForm.amount = ''; fixedForm.dueDay = 1
    fixedForm.kind = 'expense'; fixedForm.recurrence = 'monthly'
    relativeForm.name = ''; relativeForm.dueDay = 1; relativeForm.kind = 'expense'
    relativeForm.percentage = '10'; relativeForm.terms = []
    valueType.value = EntryValueType.FIXED
    emit('saved')
  } else {
    router.push('/')
  }
}
</script>

<template>
  <form @submit.prevent="handleSubmit" class="space-y-4">
    <UFormField label="Tipo de valor">
      <URadioGroup v-model="valueType" :items="valueTypeItems" orientation="horizontal" />
    </UFormField>

    <template v-if="valueType === EntryValueType.FIXED">
      <UFormField label="Tipo">
        <URadioGroup v-model="fixedForm.kind" :items="kindItems" orientation="horizontal" />
      </UFormField>
      <UFormField label="Recorrência">
        <URadioGroup v-model="fixedForm.recurrence" :items="recurrenceItems" orientation="horizontal" />
      </UFormField>
      <UFormField :label="fixedForm.kind === 'income' ? 'Nome da receita' : 'Nome do gasto'">
        <UInput v-model="fixedForm.name" icon="i-lucide-text" required />
      </UFormField>
      <UFormField label="Valor (R$)">
        <UInput v-model="fixedForm.amount" placeholder="0,00" icon="i-lucide-dollar-sign" inputmode="decimal" required />
      </UFormField>
      <UFormField :label="fixedForm.kind === 'income' ? 'Dia do recebimento' : 'Dia de vencimento'">
        <USelect v-model="fixedForm.dueDay" :items="dueDayItems" value-key="value" />
      </UFormField>
    </template>

    <template v-else>
      <UFormField label="Tipo">
        <URadioGroup v-model="relativeForm.kind" :items="kindItems" orientation="horizontal" />
      </UFormField>
      <UFormField label="Nome">
        <UInput v-model="relativeForm.name" icon="i-lucide-text" required />
      </UFormField>

      <UFormField label="Base de cálculo">
        <div class="space-y-2">
          <div v-for="(term, i) in relativeForm.terms" :key="i" class="flex items-center gap-2">
            <UButton
              :label="term.sign === 1 ? '+' : '−'"
              variant="outline"
              size="xs"
              @click="toggleSign(i)"
            />
            <span class="flex-1 text-sm">
              {{ term.set.type === FormulaSetType.ALL
                ? (term.set.kind === 'income' ? 'Todas as receitas' : 'Todas as despesas')
                : `${term.set.entryIds.length} item(ns)` }}
            </span>
            <UButton icon="i-lucide-x" variant="ghost" size="xs" @click="removeTerm(i)" />
          </div>
          <div class="flex gap-2">
            <UButton label="+ Receitas" variant="soft" size="xs" @click="addAllIncomeTerm" />
            <UButton label="+ Despesas" variant="soft" size="xs" @click="addAllExpenseTerm" />
          </div>
        </div>
      </UFormField>

      <UFormField label="Aplicar percentual (%)">
        <UInput v-model="relativeForm.percentage" inputmode="decimal" required />
      </UFormField>

      <UFormField label="Dia de vencimento">
        <USelect v-model="relativeForm.dueDay" :items="dueDayItems" value-key="value" />
      </UFormField>

      <div v-if="previewCents !== null" class="text-sm text-muted">
        Pré-visualização: <span class="font-semibold text-highlighted">{{ formatCents(previewCents) }}</span>
      </div>
    </template>

    <div class="flex gap-2 pt-2">
      <UButton type="submit" label="Salvar" icon="i-lucide-check" :disabled="valueType === EntryValueType.RELATIVE && !canSubmitRelative" />
      <UButton label="Cancelar" variant="outline" to="/" />
    </div>
  </form>
</template>
```

Note on the preview: `FormulaResolver` expects `MonthlyEntryView` instances. We synthesize them from the store's `MonthlyEntryDTO[]` using `Money.fromCents(...)`.

- [ ] **Step 2: Run dev server, smoke test manually**

Run: `npm run dev`
Manually verify: switching toggle, adding terms, preview computes, submitting a relative entry creates one in the dashboard.

- [ ] **Step 3: Commit**

```bash
git add src/presentation/components/entry/EntryForm.vue
git commit -m "feat(ui): add value-type toggle and formula builder to EntryForm"
```

---

## Task 16: EntryCard — `[calculado]` badge and formula subtitle

**Files:**
- Modify: `src/presentation/components/entry/EntryCard.vue`

The `MonthlyEntryDTO` already carries `valueType` and `formulaDescription` (Task 9).

- [ ] **Step 1: Add badge and subtitle to template**

In the name row of `EntryCard.vue`, add a small badge after the existing `EntryStatusBadge`:

```vue
<span
  v-if="entry.valueType === EntryValueType.RELATIVE"
  class="text-[10px] px-1.5 py-0.5 rounded bg-info/10 text-info uppercase tracking-wide"
>
  calculado
</span>
```

Below the amount line, add a subtitle when there's a formula description:

```vue
<span v-if="entry.formulaDescription" class="text-xs text-dimmed">
  {{ entry.formulaDescription }}
</span>
```

Add the import in the `<script setup>` block:

```ts
import { EntryValueType } from '../../../domain/value-objects/EntryStatus'
```

The Edit modal currently asks for an amount; for relatives this needs to show formula editing instead. **Out of scope for this task** — gate the edit action: in `secondaryActions`, hide the "Editar" item when `entry.valueType === EntryValueType.RELATIVE` and add a TODO note via plan reference (the PRD/spec lists relative-formula edit UI; deliver in a follow-up). For v1 the user can still revert+delete+recreate.

Concretely, replace:

```ts
const secondaryActions = computed(() => [
  [{
    label: 'Editar',
    icon: 'i-lucide-pencil',
    onSelect: () => { showEditModal.value = true },
  }, {
    label: 'Excluir',
    icon: 'i-lucide-trash-2',
    color: 'error' as const,
    onSelect: () => { showDeleteModal.value = true },
  }],
])
```

with:

```ts
const secondaryActions = computed(() => {
  const editItem = props.entry.valueType === EntryValueType.FIXED
    ? [{ label: 'Editar', icon: 'i-lucide-pencil', onSelect: () => { showEditModal.value = true } }]
    : []
  return [[
    ...editItem,
    {
      label: 'Excluir',
      icon: 'i-lucide-trash-2',
      color: 'error' as const,
      onSelect: () => { showDeleteModal.value = true },
    },
  ]]
})
```

- [ ] **Step 2: Smoke test in dev server**

Run: `npm run dev`. Confirm: relative entry shows badge + subtitle; edit menu hides edit option; confirm/skip/revert all work.

- [ ] **Step 3: Commit**

```bash
git add src/presentation/components/entry/EntryCard.vue
git commit -m "feat(ui): show calculado badge and formula subtitle on relative cards"
```

---

## Task 17: Storybook fixtures for relative entries

**Files:**
- Modify: `src/presentation/components/entry/EntryCard.stories.ts`
- Modify: `src/presentation/components/entry/EntryList.stories.ts`

- [ ] **Step 1: Add three new stories per file**

For `EntryCard.stories.ts`, add stories:

```ts
export const RelativePending: Story = {
  args: {
    entry: {
      entryId: 'rel1',
      name: 'Imposto faturamento',
      amountInCents: 24000,
      dueDay: 20,
      kind: 'expense',
      status: EntryStatus.PENDING,
      valueType: EntryValueType.RELATIVE,
      formulaDescription: '20% de receitas',
    },
  },
}

export const RelativeConfirmedSnapshot: Story = {
  args: {
    entry: {
      entryId: 'rel2',
      name: 'Imposto faturamento',
      amountInCents: 18000,
      dueDay: 20,
      kind: 'expense',
      status: EntryStatus.CONFIRMED,
      valueType: EntryValueType.RELATIVE,
      formulaDescription: '20% de receitas',
    },
  },
}

export const RelativeMultiTerm: Story = {
  args: {
    entry: {
      entryId: 'rel3',
      name: 'PIS/COFINS',
      amountInCents: 4800,
      dueDay: 15,
      kind: 'expense',
      status: EntryStatus.PENDING,
      valueType: EntryValueType.RELATIVE,
      formulaDescription: '6% de (receitas − 1 item(ns))',
    },
  },
}
```

Add the missing imports at the top of the file:

```ts
import { EntryValueType } from '../../../domain/value-objects/EntryStatus'
```

For `EntryList.stories.ts`, add a story that mixes 2 fixed + 1 relative entry to verify ordering by `dueDay` and visual mix. Use the same fixture shape.

- [ ] **Step 2: Run Storybook to spot-check**

Run: `npm run storybook` (or whatever script the project uses).
Expected: stories render without errors.

- [ ] **Step 3: Commit**

```bash
git add src/presentation/components/entry
git commit -m "test(stories): add relative-entry fixtures"
```

---

## Task 18: Final verification

- [ ] **Step 1: Type check + tests + build**

Run all in sequence:
```bash
npx vue-tsc --noEmit
npm run test
npm run build
```
Expected: all PASS.

- [ ] **Step 2: Manual smoke test**

Run: `npm run dev`. Walk through:
1. Create a fixed income (PJ context).
2. Create a relative expense PJ: 20% of all incomes.
3. Verify the relative shows correct calculated value on the dashboard.
4. Confirm the relative — note the value displayed.
5. Edit the original income to a different amount — refresh the month — relative's confirmed value stays at the snapshot.
6. Revert the relative status — value recomputes.
7. Switch to PF context — relative does not appear (different context).
8. Skip a base income — relative recomputes excluding it.

- [ ] **Step 3: Final commit (if any wrap-up needed) and push**

```bash
git status
# Confirm clean tree.
```
