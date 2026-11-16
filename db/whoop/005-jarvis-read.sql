begin;

alter table fitcore_whoop.connections add column jarvis_after timestamptz;

commit;
