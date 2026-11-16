begin;

alter table fitcore_whoop.connections
  drop constraint connections_check5,
  add column snapshot_expires_at timestamptz;

update fitcore_whoop.connections set snapshot = null where snapshot is not null;

alter table fitcore_whoop.connections
  add check ((snapshot is null) = (snapshot_expires_at is null));

commit;
