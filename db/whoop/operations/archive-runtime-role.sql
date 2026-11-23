-- Run as migration owner after 006 and runtime-role.sql. Does not enable storage.
begin;
grant select, insert, update on fitcore_whoop.archive_consents to fitcore_whoop_runtime;
grant select, insert, update on fitcore_whoop.archive_records to fitcore_whoop_runtime;
grant select on fitcore_whoop.archive_deletions to fitcore_whoop_runtime;
grant select, insert, update on fitcore_whoop.archive_imports to fitcore_whoop_runtime;
commit;
