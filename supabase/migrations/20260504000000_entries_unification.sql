-- Unify expenses and incomes into a single `entries` table.
-- Renames fixed_expenses -> entries and adds kind/recurrence columns.
-- Renames expense_statuses -> entry_statuses and migrates `paid` -> `confirmed`.
-- Run with: supabase db push  (or apply manually in the SQL editor)

BEGIN;

-- 1. Rename main table and add discriminators
ALTER TABLE fixed_expenses RENAME TO entries;

ALTER TABLE entries
  ADD COLUMN kind text NOT NULL DEFAULT 'expense'
    CHECK (kind IN ('expense', 'income'));

ALTER TABLE entries
  ADD COLUMN recurrence text NOT NULL DEFAULT 'monthly'
    CHECK (recurrence IN ('monthly', 'once'));

ALTER TABLE entries ALTER COLUMN kind DROP DEFAULT;
ALTER TABLE entries ALTER COLUMN recurrence DROP DEFAULT;

-- 2. Rename status table, column, and migrate values
ALTER TABLE expense_statuses RENAME TO entry_statuses;
ALTER TABLE entry_statuses RENAME COLUMN expense_id TO entry_id;

UPDATE entry_statuses SET status = 'confirmed' WHERE status = 'paid';

ALTER TABLE entry_statuses DROP CONSTRAINT IF EXISTS expense_statuses_status_check;
ALTER TABLE entry_statuses ADD CONSTRAINT entry_statuses_status_check
  CHECK (status IN ('pending', 'confirmed', 'skipped'));

-- 3. Rebuild RLS policies under new names. Adjust the policy bodies if your
--    project uses different ownership columns or join conditions.
DROP POLICY IF EXISTS "Users can read own expenses" ON entries;
DROP POLICY IF EXISTS "Users can insert own expenses" ON entries;
DROP POLICY IF EXISTS "Users can update own expenses" ON entries;
DROP POLICY IF EXISTS "Users can delete own expenses" ON entries;

CREATE POLICY "Users can read own entries"
  ON entries FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own entries"
  ON entries FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own entries"
  ON entries FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own entries"
  ON entries FOR DELETE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can read own expense_statuses" ON entry_statuses;
DROP POLICY IF EXISTS "Users can upsert own expense_statuses" ON entry_statuses;
DROP POLICY IF EXISTS "Users can update own expense_statuses" ON entry_statuses;
DROP POLICY IF EXISTS "Users can delete own expense_statuses" ON entry_statuses;

CREATE POLICY "Users can read own entry_statuses"
  ON entry_statuses FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own entry_statuses"
  ON entry_statuses FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own entry_statuses"
  ON entry_statuses FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own entry_statuses"
  ON entry_statuses FOR DELETE
  USING (auth.uid() = user_id);

COMMIT;
