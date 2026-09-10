-- Data migration, no schema change.
--
-- normalizePhone now canonicalises a number to its last ten digits so that a
-- country code cannot defeat suppression. Rows written before that change may
-- hold a longer string (for example "16125550199"), which a lookup for
-- "6125550199" would no longer match — silently un-suppressing people who had
-- already opted out. Rewrite them into the new canonical form.
--
-- Idempotent: the final predicate makes a second run a no-op.
UPDATE "dnc_requests"
SET "phone" = right(regexp_replace("phone", '\D', '', 'g'), 10)
WHERE "phone" IS NOT NULL
  AND length(regexp_replace("phone", '\D', '', 'g')) >= 10
  AND "phone" <> right(regexp_replace("phone", '\D', '', 'g'), 10);
