begin;

alter table fitcore_whoop.connections
  add column sync_id uuid,
  add column sync_started_at timestamptz,
  add column sync_after timestamptz,
  add column last_synced_at timestamptz,
  add column snapshot jsonb,
  add check ((sync_id is null) = (sync_started_at is null)),
  add check ((snapshot is null) = (last_synced_at is null)),
  add check (snapshot is null or jsonb_typeof(snapshot) = 'array');

commit;
