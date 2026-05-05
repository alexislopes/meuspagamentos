# Suporte a receitas: unificação em `Entry`

**Data:** 2026-05-04
**Branch sugerida:** `feat/entries-receitas`

## Objetivo

Aceitar receitas (recorrentes e pontuais) além das despesas fixas, mantendo a mesma experiência mês-a-mês. Para isso, unificar despesas e receitas em uma única entidade `Entry` discriminada por `kind`, e introduzir o conceito de recorrência (`monthly` ou `once`).

## Decisões fundamentais

- **Receitas** podem ser recorrentes (salário, aluguel recebido) ou pontuais (bônus, freela).
- **Status de receita** segue o mesmo modelo de despesa: `pending → confirmed`, podendo ser `skipped` no mês.
- **Modelo unificado**: uma entidade `Entry` com `kind: 'expense' | 'income'` e `recurrence: 'monthly' | 'once'`. Substitui `FixedExpense` por completo.
- **Status enum** passa a ser neutro: `pending | confirmed | skipped` (renomeia `paid → confirmed`). UI traduz o label conforme o `kind`.
- **Dashboard**: lista única ordenada por dia, com distinção visual entre entrada (receita) e saída (despesa); resumo mensal mostra entradas, saídas e saldo.
- **Cards de média**: mantém custo médio mensal (despesas) e adiciona receita média mensal ao lado.
- **Migração**: in-place no Supabase (rename de tabelas e colunas, adição de colunas com defaults).
- **Pontuais**: ativas apenas no `createdAt` (mesmo ano-mês), sem suporte a revisões.

## 1. Modelo de domínio

```ts
// src/domain/entities/Entry.ts
type EntryKind = 'expense' | 'income'
type Recurrence = 'monthly' | 'once'

interface EntryRevision {
  fromMonth: YearMonth
  name: string
  amount: Money
  dueDay: number
}

interface EntryProps {
  id: string
  name: string
  amount: Money
  dueDay: number
  kind: EntryKind
  recurrence: Recurrence
  createdAt: YearMonth
  deletedFromMonth: YearMonth | null
  context: ExpenseContext  // PF | PJ — nome do enum mantido por enquanto
  revisions?: EntryRevision[]
}

class Entry {
  // Construtor valida:
  //  - dueDay ∈ [1, 31]
  //  - name não-vazio
  //  - se recurrence === 'once' e revisions.length > 0: throw
  //
  // isActiveInMonth(month):
  //  - recurrence === 'monthly': createdAt <= month && (deletedFromMonth === null || deletedFromMonth > month)
  //  - recurrence === 'once': createdAt.equals(month)
  //
  // getValuesForMonth(month): inalterado para 'monthly'; para 'once' sempre retorna os valores base.
  //
  // addRevision(...): lança erro se recurrence === 'once'.
  // markDeletedFrom(month): inalterado.
}
```

```ts
// src/domain/value-objects/EntryStatus.ts (substitui ExpenseStatus)
enum EntryStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  SKIPPED = 'skipped',
}
```

```ts
// src/domain/entities/MonthlyEntryView.ts
interface MonthlyEntryView {
  entryId: string
  name: string
  amount: Money
  dueDay: number
  kind: EntryKind
  status: EntryStatus
}
```

```ts
// src/domain/services/MonthlyEntryService.ts
class MonthlyEntryService {
  buildMonthView(allEntries: Entry[], month: YearMonth, statusOverrides: Map<string, EntryStatus>): MonthlyEntryView[]
  // mesma lógica do MonthlyExpenseService atual, com kind propagado para a view

  computeSummary(views: MonthlyEntryView[]): {
    totalIncome: number      // soma de receitas não-skipped
    totalExpense: number     // soma de despesas não-skipped
    confirmedIncome: number
    pendingIncome: number
    confirmedExpense: number
    pendingExpense: number
    balance: number          // totalIncome - totalExpense
  }
}
```

`ExpenseContext` (PF/PJ) permanece com o nome atual; renomear é fora do escopo.

## 2. Schema do banco

Migração SQL única, aplicada via Supabase MCP `apply_migration` após snapshot manual.

```sql
-- Renomear tabela e colunas principais
ALTER TABLE fixed_expenses RENAME TO entries;

ALTER TABLE entries
  ADD COLUMN kind text NOT NULL DEFAULT 'expense'
    CHECK (kind IN ('expense', 'income'));
ALTER TABLE entries
  ADD COLUMN recurrence text NOT NULL DEFAULT 'monthly'
    CHECK (recurrence IN ('monthly', 'once'));
ALTER TABLE entries ALTER COLUMN kind DROP DEFAULT;
ALTER TABLE entries ALTER COLUMN recurrence DROP DEFAULT;

-- Status: rename + migração de valor
ALTER TABLE expense_statuses RENAME TO entry_statuses;
ALTER TABLE entry_statuses RENAME COLUMN expense_id TO entry_id;
UPDATE entry_statuses SET status = 'confirmed' WHERE status = 'paid';
ALTER TABLE entry_statuses DROP CONSTRAINT IF EXISTS expense_statuses_status_check;
ALTER TABLE entry_statuses ADD CONSTRAINT entry_statuses_status_check
  CHECK (status IN ('pending', 'confirmed', 'skipped'));
```

Observações:
- Dados existentes recebem `kind='expense'`, `recurrence='monthly'`.
- FKs, indexes e RLS policies que referenciam o nome antigo precisam ser recriados; conferir via `list_tables` após o rename.
- A coluna `context` (PF/PJ) e `revisions` ficam inalteradas.

## 3. Application + Infrastructure

Renames diretos (sem mudança de assinatura, exceto onde indicado):

| Antes | Depois | Mudança |
|---|---|---|
| `IFixedExpenseRepository` | `IEntryRepository` | rename |
| `SupabaseFixedExpenseRepository` | `SupabaseEntryRepository` | rename + colunas `kind`, `recurrence` |
| `LocalStorageFixedExpenseRepository` | `LocalStorageEntryRepository` | rename + chave nova |
| `FixedExpenseMapper` | `EntryMapper` | rename + `kind`, `recurrence` |
| `IExpenseStatusRepository` | `IEntryStatusRepository` | rename |
| `Supabase/LocalStorageExpenseStatusRepository` | `Supabase/LocalStorageEntryStatusRepository` | rename |
| `ExpenseStatusMapper` | `EntryStatusMapper` | rename + valor `paid → confirmed` |
| `MonthlyExpenseService` | `MonthlyEntryService` | rename + `computeSummary` retorna saldo |
| `MonthlyExpenseView` | `MonthlyEntryView` | + campo `kind` |
| `MonthlyExpenseDTO` | `MonthlyEntryDTO` | + campo `kind` |

Use cases:

| Antes | Depois | Notas |
|---|---|---|
| `CreateFixedExpense` | `CreateEntry` | DTO ganha `kind`, `recurrence` |
| `UpdateFixedExpense` | `UpdateEntry` | sem alteração de assinatura além de tipo |
| `DeleteFixedExpense` | `DeleteEntry` | — |
| `ConfirmPayment` | `ConfirmEntry` | status: `pending → confirmed` |
| `SkipExpense` | `SkipEntry` | — |
| `RevertExpenseStatus` | `RevertEntryStatus` | — |
| `GetMonthlyExpenses` | `GetMonthlyEntries` | retorna ambos os kinds |
| `GetMonthlySummary` | `GetMonthlySummary` | retorno enriquecido (income, expense, balance) |
| `GetAverageMonthlyCost` | `GetAverageMonthlyCost` | filtra `kind='expense'` |
| — | `GetAverageMonthlyIncome` | novo; filtra `kind='income'` |

`container.ts` instancia os novos tipos e injeta nos use cases.

## 4. Presentation

**Renames de componentes/composables/stores:**

| Antes | Depois |
|---|---|
| `ExpenseCard` | `EntryCard` |
| `ExpenseList` | `EntryList` |
| `ExpenseForm` | `EntryForm` |
| `ExpenseStatusBadge` | `EntryStatusBadge` |
| `CreateExpensePage` | `CreateEntryPage` |
| `useCreateExpense` | `useCreateEntry` |
| `useExpenseStore` | `useEntryStore` |

**Mudanças funcionais:**

- `EntryCard` recebe `kind` e aplica distinção visual (saída em vermelho/menos, entrada em verde/mais; paleta exata fica para a fase de implementação visual).
- `EntryStatusBadge` mostra label "Pago" se `kind='expense'`, "Recebido" se `kind='income'`.
- `EntryList` é uma lista única ordenada por `dueDay`, com `kind` propagado em cada card.
- `EntryForm` tem dois novos toggles no topo:
  - "Despesa | Receita" (default Despesa)
  - "Mensal | Pontual" (default Mensal)
  - Quando `recurrence='once'`, o campo dia é rotulado "dia em que ocorre" e o suporte a revisões é desabilitado.
- `MonthlySummary` exibe três valores: Entradas, Saídas, Saldo (com sinal).
- `DashboardPage` mostra dois cards lado a lado: `AverageMonthlyCostCard` (existente) + novo `AverageMonthlyIncomeCard`.

## 5. Setup, testes e stories

**Setup (uma vez no início):**

- Instalar `vitest`, `@vue/test-utils`, `@vitest/coverage-v8`, `jsdom`.
- Instalar Storybook para Vue 3 + Vite via `npx storybook@latest init --type vue3`.
- Adicionar scripts ao `package.json`: `test`, `test:watch`, `storybook`, `build-storybook`.
- Criar `vitest.config.ts` (env `jsdom`, alias `@` apontando para `src`).

**Testes Vitest (escopo mínimo):**

- Domínio:
  - `Entry.isActiveInMonth`: recurrence monthly (antes/durante/depois do createdAt; com e sem deletedFromMonth) e once (apenas no createdAt).
  - `Entry.getValuesForMonth`: resolução de revisões; once sempre retorna base.
  - `Entry` construtor: valida `dueDay`, `name`, `revisions vazias quando once`.
  - `Entry.addRevision`: rejeita quando recurrence === 'once'.
  - `MonthlyEntryService.buildMonthView`: filtragem por mês, ordenação por `dueDay`, propagação de `kind`.
  - `MonthlyEntryService.computeSummary`: saldo correto, exclusão de `skipped`, separação por `kind`.
  - `Money`, `YearMonth`: cobertura básica se ainda não houver.
- Application:
  - `GetMonthlySummary` com mix de kinds.
  - `GetAverageMonthlyCost` filtra apenas despesas.
  - `GetAverageMonthlyIncome` filtra apenas receitas.
  - `CreateEntry`: aceita kind/recurrence; rejeita combinações inválidas.
- Infrastructure:
  - `EntryMapper` round-trip JSON ↔ domínio com `kind`/`recurrence`.
  - `EntryStatusMapper` lê e escreve `pending|confirmed|skipped` (a migração SQL já converte os `paid` existentes; não há fallback legado em código).

**Stories Storybook:**

- `EntryCard`: 6 variantes (3 status × 2 kinds) + valor longo.
- `EntryList`: vazia / só despesas / só receitas / mista.
- `EntryStatusBadge`: 6 variantes.
- `EntryForm`: criar despesa mensal / criar receita pontual / editar com revisão.
- `MonthlySummary`: saldo positivo / saldo negativo / sem dados.
- `AverageMonthlyCostCard`, `AverageMonthlyIncomeCard`: com dados / vazio.
- `ContextSwitcher`, `MonthNavigator`: estados básicos.

## Ordem de execução

1. Instalar e configurar Vitest e Storybook; commit inicial só com setup.
2. Domínio: criar `Entry`, `EntryStatus`, `MonthlyEntryView`, `MonthlyEntryService` com testes red→green. Remover `FixedExpense` e `MonthlyExpenseService` quando não houver mais consumidor.
3. Application: renomear DTOs e use cases; ajustar `GetMonthlySummary`; criar `GetAverageMonthlyIncome`; testes.
4. Infrastructure: atualizar mappers e repositórios (Supabase + LocalStorage); testes de mapper. Atualizar `container.ts`.
5. Migração SQL: aplicar via `apply_migration` após snapshot do projeto Supabase.
6. Presentation: renomear stores, composables, componentes; adicionar toggles no `EntryForm`; novo `AverageMonthlyIncomeCard`; resumo com saldo. Criar stories conforme cada componente é tocado.
7. Smoke test manual: criar despesa recorrente, receita recorrente, receita pontual; confirmar/pular cada uma; navegar meses; conferir saldo e médias; alternar PF/PJ.

## Critério de pronto

- `npm run build` passa sem erros.
- `npm test` 100% verde.
- `npm run storybook` abre e todas as stories renderizam sem erro de console.
- Smoke test manual completo OK.

## Riscos

- Migração SQL é destrutiva (renames de tabelas e colunas). Mitigação: snapshot do projeto Supabase antes de aplicar; testar localmente em branch do Supabase se disponível.
- Renames atravessam praticamente todo o código — PR único e grande. Aceitável dada a escolha consciente pelo modelo unificado.
- Setup de Storybook adiciona dependências e tempo de build; aceito por trazer cobertura visual útil para o redesign visual em curso.
