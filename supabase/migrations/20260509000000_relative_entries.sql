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
