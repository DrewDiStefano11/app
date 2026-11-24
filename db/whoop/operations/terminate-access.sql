-- Operator procedure ONLY when WHOOP API access ends or archival use is discontinued.
-- Disable integration/archive flags first. Confirm recovery history is disabled and
-- no branch/replica/snapshot copies exist; this SQL cannot erase managed backups.
-- Run as migration owner. Connection cascades erase consents and archive children.
begin;
delete from fitcore_whoop.connections;
delete from fitcore_whoop.oauth_attempts;
delete from fitcore_whoop.sessions;
commit;
