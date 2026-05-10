# Entradas relativas — design

**Data:** 2026-05-09
**Status:** aprovado p/ planejamento
**Escopo:** v1 — entradas cujo valor é calculado a partir de outras entradas via fórmula

## Motivação

Hoje toda `Entry` tem `amount: Money` fixo. Vários casos reais exigem que o valor seja derivado do estado de outras entradas no mesmo mês:

- **Investimento programado:** "investir 10% de todas as receitas" → uma despesa cujo valor é 10% × Σ receitas do mês.
- **Tributos sobre faturamento:** "Simples Nacional 20% sobre faturamento PJ" → uma despesa cujo valor é 20% × Σ receitas PJ do mês.
- **Bases compostas:** "imposto sobre receita líquida" → `(receitas − devoluções) × alíquota`.

A solução é introduzir um novo `valueType` na entidade `Entry`: além de `FIXED`, passa a existir `RELATIVE`. Entradas relativas guardam uma fórmula no lugar do valor.

## Princípios e escopo v1

- **Forma da fórmula:** combinação linear de conjuntos × percentual. Forma canônica: `(Σ termᵢ.sign × soma(termᵢ.set)) × (percentage/100)`.
- **Conjuntos referenciados:** apenas entradas `FIXED`. Relativa-de-relativa não é permitida na v1 — evita ordem topológica e detecção de ciclo.
- **Contexto:** uma relativa só agrega entradas do mesmo `ExpenseContext` (PF ou PJ). Cross-context não existe na v1.
- **Snapshot ao confirmar:** confirmar uma relativa congela o valor calculado em `entry_statuses.snapshot_amount_cents`. Reverter limpa o snapshot.
- **Revisões:** suportadas — uma revisão de relativa guarda uma nova fórmula a partir de um mês.
- **Base de cálculo:** entradas com status `PENDING` ou `CONFIRMED`; `SKIPPED` excluídas. Coerente com `MonthlyEntryService.computeSummary`.
- **Estilo TypeScript:** tipos e enums nomeados (sem inline unions/inline object types). `undefined` em vez de `null` no domínio; `null` só persiste na borda do banco.

## Modelo de domínio

### Novos enums (`src/domain/value-objects/EntryStatus.ts`)

```ts
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

### Tipos de fórmula (`src/domain/value-objects/EntryFormula.ts`, novo)

```ts
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
  terms: FormulaTerm[]    // ≥ 1
  percentage: number       // > 0, em pontos percentuais (10 = 10%)
}
```

### Mudanças em `Entry` (`src/domain/entities/Entry.ts`)

- novo campo imutável `valueType: EntryValueType`
- `amount?: Money` (presente sse `valueType === FIXED`)
- novo `formula?: EntryFormula` (presente sse `valueType === RELATIVE`)
- `EntryRevision` vira união nomeada discriminada por `valueType`:

```ts
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
```

- `getValuesForMonth(month)` muda o retorno para uma união nomeada (`FixedMonthlyValues` | `RelativeMonthlyValues`). Para relativa retorna `name`, `formula`, `dueDay` — **sem amount**, porque a resolução depende das outras entradas do mês e não pertence à entidade.
- `addRevision` ganha overload por `valueType` (uma assinatura aceitando `FixedEntryRevision`, outra `RelativeEntryRevision`); rejeita revisão cuja forma diverge do `valueType` da entrada.

### Invariantes

- `valueType` é definido na criação e nunca muda.
- `valueType === FIXED` ⇒ `amount` definido, `formula` indefinido.
- `valueType === RELATIVE` ⇒ `formula` definido, `amount` indefinido, `recurrence !== 'once'` (decisão: relativa só faz sentido recorrente; once é raro e adiciona casos a cobrir — pode ser revisitado depois).
- Revisão precisa ter `valueType` igual ao da entrada hospedeira.
- Validações que exigem o conjunto de outras entradas (referências `EXPLICIT`, ausência de relativa-de-relativa) ficam em `CreateEntry` e `UpdateEntry`, não no construtor.

## Cálculo

### `MonthlyEntryService.buildMonthView` — duas passadas

1. **Fixas:** filtra ativas com `valueType === FIXED`, gera `MonthlyEntryView` com `amount` resolvido por `getValuesForMonth`.
2. **Relativas:** para cada ativa com `valueType === RELATIVE`:
   - obtém a fórmula efetiva do mês (revisão mais recente ≤ mês, fallback para a fórmula base);
   - se houver status `CONFIRMED` com `snapshotAmountCents` definido → usa o snapshot;
   - senão → chama `FormulaResolver.resolve` sobre as views da Passada 1, filtradas pelo `context` da relativa, e usa o resultado.
   - emite `MonthlyEntryView` com o valor resolvido.

### `MonthlyEntryView` (`src/domain/entities/MonthlyEntryView.ts`)

Adiciona `context: ExpenseContext` para que a Passada 2 possa filtrar o conjunto agregado pelo contexto da relativa.

### `FormulaResolver` (`src/domain/services/FormulaResolver.ts`, novo)

Serviço de domínio puro. Sem I/O.

```ts
export interface FormulaResolutionInput {
  formula: EntryFormula
  ownerContext: ExpenseContext
  fixedViews: MonthlyEntryView[]
}

export class FormulaResolver {
  resolve(input: FormulaResolutionInput): Money
}
```

Algoritmo:

1. Filtra `fixedViews` por `context === ownerContext` e `status !== SKIPPED`.
2. Para cada `term`:
   - `FormulaSetAll`: soma `view.amount.inCents` onde `view.kind === term.set.kind`.
   - `FormulaSetExplicit`: soma das views cujo `entryId ∈ term.set.entryIds`.
   - aplica `term.sign` (× 1 ou × −1).
3. Soma todos os termos → base em centavos (inteiro).
4. Multiplica pelo percentual: `Money.fromCents(round(base × percentage / 100))`.
5. Arredondamento: meios para par (banker's rounding) ou o que `Money` já adotar — usar a regra existente de `Money` para consistência.

Erros:

- `formula.terms.length === 0` → erro de invariante (não deveria sair da validação).
- `percentage <= 0` → idem.

### Snapshot e ciclo de vida do status

- `ConfirmEntry`:
  - `FIXED`: comportamento atual.
  - `RELATIVE`: resolve o valor (`FormulaResolver` com as fixas do mês), persiste em `entry_statuses.snapshot_amount_cents`.
- `RevertEntryStatus`: limpa `snapshotAmountCents`.
- `SkipEntry`: inalterado; status `SKIPPED` não exige snapshot.
- Re-confirmar (idempotência) atualiza o snapshot pra refletir o estado atual no momento da reconfirmação. (Decisão: snapshot reflete o valor do *último* `confirmed`; não acumulamos histórico.)

### `computeSummary`

Inalterado. Opera sobre `MonthlyEntryView` que já carrega o `amount` resolvido. Relativas entram em `totalIncome`/`totalExpense` conforme `kind` como qualquer outra entrada.

## Persistência

### Migração `<ts>_relative_entries.sql`

```sql
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

Notas:

- A coluna `revisions` (JSONB pré-existente em `entries`) continua a mesma. Itens passam a ser discriminados por `valueType` — sem CHECK adicional no SQL; validação concentrada em TS.
- `snapshot_amount_cents` é `NULL` para entradas fixas (sempre) e para relativas não confirmadas.
- RLS atual (`Users can view/insert/update own entries`, etc.) cobre os campos novos automaticamente — sem mudança.

### `EntryMapper` (`src/infrastructure/mappers/EntryMapper.ts`)

`EntryJSON` vira união nomeada discriminada:

```ts
export interface EntryFormulaJSON {
  terms: FormulaTermJSON[]
  percentage: number
}

export interface FixedEntryJSON {
  valueType: EntryValueType.FIXED
  // campos comuns: id, name, dueDay, kind, recurrence, createdAt, deletedFromMonth, context
  amountInCents: number
  revisions?: FixedEntryRevisionJSON[]
}

export interface RelativeEntryJSON {
  valueType: EntryValueType.RELATIVE
  // campos comuns
  formula: EntryFormulaJSON
  revisions?: RelativeEntryRevisionJSON[]
}

export type EntryJSON = FixedEntryJSON | RelativeEntryJSON
```

Mapper converte `null` (banco) → `undefined` (domínio) na borda. Tipos de fórmula no JSON são planos (sem `Money`/`YearMonth`); `FormulaTermSign` serializado como `1`/`-1`.

### `SupabaseEntryRepository`

`EntryRow` ganha `value_type`, `amount_cents: number | null`, `formula: EntryFormulaJSON | null`. `toDomain`/`toRow` ramificam por `valueType`.

### `LocalStorageEntryRepository`

Mesmo formato JSON do mapper; sem migração (storage é por usuário).

### `IEntryStatusRepository` / `SupabaseEntryStatusRepository` / `LocalStorageEntryStatusRepository`

Payload de "set status" passa a aceitar `snapshotAmountCents?: number`. Persistência grava na nova coluna; ao reverter, escreve `null`.

## UI

### `EntryForm.vue`

Toggle "Tipo de valor" no topo: **Fixo** | **Relativo**. Padrão: Fixo. Em update, toggle é readonly (consistente com a invariante `valueType` imutável).

**Modo fixo:** sem mudanças.

**Modo relativo:** o campo "Valor" é substituído por um construtor de fórmula:

- Lista de termos. Cada termo:
  - botão de sinal (toggle `+`/`−`)
  - dropdown de conjunto: `Todas as receitas` | `Todas as despesas` | `Entradas específicas...`
  - se `EXPLICIT`: multi-select das entradas fixas do mesmo `context`
  - botão remover
- Botão "Adicionar termo".
- Campo "Aplicar percentual" (numérico, sufixo `%`, aceita decimais).
- **Pré-visualização:** roda `FormulaResolver` no mês atual (`useNavigationStore`) e mostra valor resultante + breakdown (`R$ X = (R$ A − R$ B) × P%`). Recalcula reativamente.
- Validação inline: ≥ 1 termo, `percentage > 0`, termos `EXPLICIT` com seleção não vazia. Submit bloqueado se inválido.

### `EntryCard.vue`

- Badge "calculado" ao lado do nome quando `valueType === RELATIVE`.
- Subtítulo com a fórmula em texto humano (`"10% das receitas"` / `"20% das receitas PJ"` / `"6% de (receitas − devoluções)"`).
- Valor exibido continua sendo `view.amount` (já resolvido, snapshot ou não).

### `EntryList.vue`, `MonthlySummary.vue`, cards de média

Sem mudanças estruturais. Relativas entram nos somatórios via `MonthlyEntryView`.

### DTOs e composables

- `CreateEntryDTO` vira união nomeada discriminada (`CreateFixedEntryDTO` | `CreateRelativeEntryDTO`).
- `UpdateEntryDTO` idem; impede mudança de `valueType` no use case.
- `useCreateEntry`, `useEntryStore` propagam o discriminador.

### i18n / textos

Strings novas (pt-BR): `Tipo de valor`, `Fixo`, `Relativo`, `Base de cálculo`, `Adicionar termo`, `Aplicar percentual`, `calculado`, mensagens de validação.

## Validações nos use cases

### `CreateEntry` / `UpdateEntry` — relativas

- `formula.terms.length >= 1`
- `formula.percentage > 0`
- para cada termo `EXPLICIT`:
  - `entryIds.length >= 1`
  - cada id existe no repositório
  - cada entrada referenciada tem `valueType === FIXED` (proibição relativa-de-relativa)
  - cada entrada referenciada tem o mesmo `context` da relativa
- `valueType` não pode mudar em update (rejeita)

## Plano de testes

### Domínio (Vitest)

- `Entry.test.ts` — invariantes do construtor por `valueType`; revisão precisa bater com o tipo; `getValuesForMonth` em relativa retorna `name/formula/dueDay`.
- `FormulaResolver.test.ts` (novo) — termo único `ALL`; filtro por contexto; soma e subtração entre conjuntos; termo `EXPLICIT`; exclusão de `SKIPPED`; percentual 0 e termos vazios disparam erro; arredondamento.
- `MonthlyEntryService.test.ts` — duas passadas; snapshot prevalece sobre recálculo; sem snapshot reflete mudanças nas fixas; filtro por contexto; `computeSummary` integra relativas corretamente.

### Casos de uso

- `CreateEntry.test.ts` — criação válida; rejeições (sem termos; percentual ≤ 0; `EXPLICIT` apontando para relativa; `EXPLICIT` cross-context; id inexistente).
- `UpdateEntry.test.ts` — update de fórmula OK; rejeita mudança de `valueType`.
- `ConfirmEntry.test.ts` — fixa sem snapshot (regressão); relativa persiste snapshot; reconfirmação atualiza snapshot.
- `RevertEntryStatus.test.ts` — revert de relativa limpa snapshot.

### Mapper

- `EntryMapper.test.ts` — round-trip JSON↔domain para `FIXED` (regressão); para `RELATIVE` com `ALL` e com `EXPLICIT`; revisões mistas; conversão `null` ↔ `undefined` na borda.

### Storybook

- `EntryCard.stories.ts` e `EntryList.stories.ts` ganham fixtures de relativa: 1 termo simples, 2 termos com sinais opostos, com snapshot e sem snapshot.

### Smoke manual (no plano de implementação, fora da spec)

Criar relativa via UI, confirmar, reverter, editar fórmula, navegar entre meses, alternar contexto PF/PJ.

## Itens fora de escopo (v1)

- Relativa referenciando relativa (exigirá ordenação topológica e detecção de ciclo).
- Cross-context (relativa PJ que enxerga receitas PF, ou vice-versa).
- Operações além de soma/subtração e percentual (multiplicação direta, divisão, condicionais).
- Tags ou outras dimensões de filtro além de `kind` + `context`.
- Histórico de snapshots (mantemos só o do último `confirmed`).
- Relativas com `recurrence === 'once'`.
