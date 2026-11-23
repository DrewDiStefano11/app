-- Separate owner-authorized measurements from the provider-header-limited cache.
-- This migration creates no consent and does not activate archival storage.
begin;

alter table fitcore_whoop.connections add column archive_invalidated_at timestamptz;

create table fitcore_whoop.archive_consents (
  connection_id uuid primary key references fitcore_whoop.connections(id) on delete cascade,
  id uuid not null unique,
  owner_id text not null,
  provider_user_id text not null,
  granted_at timestamptz not null default now(),
  revoked_at timestamptz,
  notice_version text not null check (notice_version = 'owner-measurements-v1'),
  purposes text[] not null check (purposes = array['personal-display', 'history', 'fitness-analysis']::text[]),
  source text not null check (source in ('settings', 'account-owner-request')),
  last_synced_at timestamptz,
  check (revoked_at is null or revoked_at >= granted_at)
);

create table fitcore_whoop.archive_records (
  consent_id uuid not null references fitcore_whoop.archive_consents(id) on delete cascade,
  kind text not null check (kind in ('recovery', 'cycle', 'sleep', 'workout')),
  record_id text not null,
  related_sleep_id text,
  measured_at timestamptz not null,
  ended_at timestamptz,
  provider_updated_at timestamptz not null,
  envelope text not null check (envelope like 'v1.%'),
  units_version text not null default 'whoop-v2-native',
  synced_at timestamptz not null default now(),
  primary key (consent_id, kind, record_id)
);
create index whoop_archive_measurement_time on fitcore_whoop.archive_records(consent_id, measured_at);

-- Longer-lived than temporary webhook receipts, so backfill cannot resurrect deletions.
create table fitcore_whoop.archive_deletions (
  consent_id uuid not null references fitcore_whoop.archive_consents(id) on delete cascade,
  event_type text not null check (event_type in ('recovery.deleted', 'sleep.deleted', 'workout.deleted')),
  record_id text not null,
  received_at timestamptz not null,
  primary key (consent_id, event_type, record_id)
);

create table fitcore_whoop.archive_imports (
  consent_id uuid not null references fitcore_whoop.archive_consents(id) on delete cascade,
  kind text not null check (kind in ('recovery', 'cycle', 'sleep', 'workout')),
  window_start timestamptz not null,
  window_end timestamptz not null,
  next_token text,
  completed_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (consent_id, kind),
  check (window_start < window_end)
);

-- Database-level lifecycle guards also protect writes made by an older runtime.
create function fitcore_whoop.erase_archive_on_disconnect() returns trigger
language plpgsql security definer set search_path = pg_catalog, fitcore_whoop as $$
begin
  if (new.status = 'disconnecting' and old.status <> 'disconnecting') or
     (old.provider_user_id is distinct from new.provider_user_id and old.provider_user_id is not null) then
    delete from fitcore_whoop.archive_records where consent_id in
      (select id from fitcore_whoop.archive_consents where connection_id = new.id);
    delete from fitcore_whoop.archive_imports where consent_id in
      (select id from fitcore_whoop.archive_consents where connection_id = new.id);
    delete from fitcore_whoop.archive_deletions where consent_id in
      (select id from fitcore_whoop.archive_consents where connection_id = new.id);
    update fitcore_whoop.archive_consents set revoked_at = coalesce(revoked_at, now()), last_synced_at = null
      where connection_id = new.id;
    new.archive_invalidated_at := now();
  end if;
  return new;
end $$;
create trigger whoop_archive_disconnect before update on fitcore_whoop.connections
for each row execute function fitcore_whoop.erase_archive_on_disconnect();

create function fitcore_whoop.erase_archive_on_withdrawal() returns trigger
language plpgsql security definer set search_path = pg_catalog, fitcore_whoop as $$
begin
  if old.revoked_at is null and new.revoked_at is not null then
    delete from fitcore_whoop.archive_records where consent_id = old.id;
    delete from fitcore_whoop.archive_imports where consent_id = old.id;
    delete from fitcore_whoop.archive_deletions where consent_id = old.id;
    if pg_trigger_depth() = 1 then
      update fitcore_whoop.connections set archive_invalidated_at = now(),
        event_revision = event_revision + 1, snapshot = null, snapshot_expires_at = null
        where id = old.connection_id;
    end if;
    new.last_synced_at := null;
  end if;
  return new;
end $$;
create trigger whoop_archive_withdrawal before update on fitcore_whoop.archive_consents
for each row execute function fitcore_whoop.erase_archive_on_withdrawal();

create function fitcore_whoop.erase_archive_on_webhook() returns trigger
language plpgsql security definer set search_path = pg_catalog, fitcore_whoop as $$
declare archive_id uuid;
begin
  if new.event_type not like '%.deleted' then return new; end if;
  select id into archive_id from fitcore_whoop.archive_consents
    where connection_id = new.connection_id and provider_user_id = new.provider_user_id and revoked_at is null;
  if archive_id is null then return new; end if;
  insert into fitcore_whoop.archive_deletions(consent_id, event_type, record_id, received_at)
    values (archive_id, new.event_type, new.record_id::text, new.received_at)
    on conflict (consent_id, event_type, record_id) do update
      set received_at = greatest(archive_deletions.received_at, excluded.received_at);
  delete from fitcore_whoop.archive_records record where consent_id = archive_id and
    provider_updated_at <= new.received_at and (
      (new.event_type = 'workout.deleted' and kind = 'workout' and lower(record_id) = new.record_id::text) or
      (new.event_type = 'sleep.deleted' and kind = 'sleep' and lower(record_id) = new.record_id::text) or
      (new.event_type in ('sleep.deleted', 'recovery.deleted') and kind = 'recovery' and lower(related_sleep_id) = new.record_id::text)
    );
  return new;
end $$;
create trigger whoop_archive_webhook after insert on fitcore_whoop.webhook_events
for each row execute function fitcore_whoop.erase_archive_on_webhook();

revoke all on function fitcore_whoop.erase_archive_on_disconnect() from public;
revoke all on function fitcore_whoop.erase_archive_on_withdrawal() from public;
revoke all on function fitcore_whoop.erase_archive_on_webhook() from public;
revoke all on fitcore_whoop.archive_consents, fitcore_whoop.archive_records,
  fitcore_whoop.archive_deletions, fitcore_whoop.archive_imports from public;

commit;
