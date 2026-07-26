-- Add arrived_jetty status for Hasnur two-step CP3 flow.
-- Hasnur jetty does not provide weight information immediately on truck arrival,
-- so the operator records arrival time first and fills in weights separately.
alter type trip_status_enum add value if not exists 'arrived_jetty' after 'in_transit';
