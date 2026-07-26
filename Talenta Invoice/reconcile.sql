-- Reconciliation SQL generated from Talenta Bumi invoices
-- Review carefully before applying!

BEGIN;


-- Verify day totals match invoice before committing:
SELECT date, COUNT(*) ritase, SUM(netto_jetty_kg) system_total
FROM trips
WHERE jetty_destination = 'talenta'
  AND date IN ('2026-05-22', '2026-05-24', '2026-05-25', '2026-05-29', '2026-05-30', '2026-06-02', '2026-06-03', '2026-06-04')
GROUP BY date ORDER BY date;

-- If totals match invoice, run COMMIT; otherwise ROLLBACK;
-- COMMIT;
-- ROLLBACK;