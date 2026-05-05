-- Unify expenses and incomes into a single `entries` table.
-- Renames fixed_expenses -> entries (adds kind/recurrence) and
-- expense_statuses -> entry_statuses (paid -> confirmed).
-- Applied to project lvmmilmcsiarlesimmik on 2026-05-04.

ALTER TABLE public.fixed_expenses RENAME TO entries;

ALTER TABLE public.entries
  ADD COLUMN kind text NOT NULL DEFAULT 'expense'
    CHECK (kind IN ('expense', 'income'));
ALTER TABLE public.entries
  ADD COLUMN recurrence text NOT NULL DEFAULT 'monthly'
    CHECK (recurrence IN ('monthly', 'once'));
ALTER TABLE public.entries ALTER COLUMN kind DROP DEFAULT;
ALTER TABLE public.entries ALTER COLUMN recurrence DROP DEFAULT;

ALTER TABLE public.expense_statuses RENAME TO entry_statuses;
ALTER TABLE public.entry_statuses RENAME COLUMN expense_id TO entry_id;

-- Drop old check before rewriting values, so the UPDATE can write 'confirmed'
ALTER TABLE public.entry_statuses DROP CONSTRAINT expense_statuses_status_check;
UPDATE public.entry_statuses SET status = 'confirmed' WHERE status = 'paid';
ALTER TABLE public.entry_statuses ADD CONSTRAINT entry_statuses_status_check
  CHECK (status IN ('confirmed', 'skipped'));

ALTER POLICY "Users can view own expenses" ON public.entries RENAME TO "Users can view own entries";
ALTER POLICY "Users can insert own expenses" ON public.entries RENAME TO "Users can insert own entries";
ALTER POLICY "Users can update own expenses" ON public.entries RENAME TO "Users can update own entries";

ALTER POLICY "Users can view own statuses" ON public.entry_statuses RENAME TO "Users can view own entry_statuses";
ALTER POLICY "Users can insert own statuses" ON public.entry_statuses RENAME TO "Users can insert own entry_statuses";
ALTER POLICY "Users can update own statuses" ON public.entry_statuses RENAME TO "Users can update own entry_statuses";
ALTER POLICY "Users can delete own statuses" ON public.entry_statuses RENAME TO "Users can delete own entry_statuses";

ALTER TABLE public.entries RENAME CONSTRAINT fixed_expenses_pkey TO entries_pkey;
ALTER TABLE public.entries RENAME CONSTRAINT fixed_expenses_user_id_fkey TO entries_user_id_fkey;
ALTER TABLE public.entries RENAME CONSTRAINT fixed_expenses_amount_cents_check TO entries_amount_cents_check;
ALTER TABLE public.entries RENAME CONSTRAINT fixed_expenses_context_check TO entries_context_check;
ALTER TABLE public.entries RENAME CONSTRAINT fixed_expenses_due_day_check TO entries_due_day_check;

ALTER TABLE public.entry_statuses RENAME CONSTRAINT expense_statuses_pkey TO entry_statuses_pkey;
ALTER TABLE public.entry_statuses RENAME CONSTRAINT expense_statuses_user_id_fkey TO entry_statuses_user_id_fkey;
ALTER TABLE public.entry_statuses RENAME CONSTRAINT expense_statuses_expense_id_fkey TO entry_statuses_entry_id_fkey;
