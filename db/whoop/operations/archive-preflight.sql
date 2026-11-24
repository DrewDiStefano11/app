-- Read-only deployment preflight. Contains no credentials or measurements.
-- Run as migration owner. A false result is a blocker, not an instruction to grant more access.
begin read only;

with required(name) as (values
  ('archive_consents'), ('archive_records'), ('archive_deletions'), ('archive_imports'))
select name as archive_table,
  to_regclass('fitcore_whoop.' || name) is not null as present,
  coalesce(has_table_privilege((select oid from pg_roles where rolname = 'fitcore_whoop_runtime'),
    to_regclass('fitcore_whoop.' || name), 'SELECT'), false) as runtime_can_read,
  coalesce(has_table_privilege((select oid from pg_roles where rolname = 'fitcore_whoop_runtime'),
    to_regclass('fitcore_whoop.' || name), 'INSERT'), false) as runtime_can_insert,
  coalesce(has_table_privilege((select oid from pg_roles where rolname = 'fitcore_whoop_runtime'),
    to_regclass('fitcore_whoop.' || name), 'UPDATE'), false) as runtime_can_update,
  coalesce(has_table_privilege((select oid from pg_roles where rolname = 'fitcore_whoop_runtime'),
    to_regclass('fitcore_whoop.' || name), 'DELETE'), false) as runtime_can_delete
from required order by name;

select exists (select 1 from information_schema.columns where table_schema = 'fitcore_whoop'
  and table_name = 'connections' and column_name = 'archive_invalidated_at') as invalidation_column_present;

with required(name) as (values
  ('whoop_archive_disconnect'), ('whoop_archive_withdrawal'), ('whoop_archive_webhook'))
select name as lifecycle_guard, exists (
  select 1 from pg_trigger t join pg_class c on c.oid = t.tgrelid
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'fitcore_whoop' and t.tgname = name and t.tgenabled = 'O'
) as enabled from required order by name;

select rolname, rolcanlogin, rolsuper, rolcreatedb, rolcreaterole, rolbypassrls
from pg_roles where rolname = 'fitcore_whoop_runtime';

-- No row-level data, tokens, envelopes, IDs or measurements are returned.
select status, count(*) as connection_count from fitcore_whoop.connections group by status;
select coalesce(has_table_privilege((select oid from pg_roles where rolname = 'fitcore_whoop_runtime'),
  to_regclass('fitcore_whoop.webhook_events'), 'INSERT'), false) as runtime_can_receive_deletions;

-- Required only when WHOOP_HISTORY_IMPORT_ENABLED is enabled (migration 007).
with required(name) as (values ('pages'), ('records_seen'), ('seen_tokens'))
select name as history_column, exists (select 1 from information_schema.columns
  where table_schema = 'fitcore_whoop' and table_name = 'archive_imports'
    and column_name = name) as present from required order by name;
select exists (select 1 from information_schema.columns
  where table_schema = 'fitcore_whoop' and table_name = 'archive_imports'
    and column_name = 'window_start' and is_nullable = 'YES') as history_window_unbounded;
commit;
