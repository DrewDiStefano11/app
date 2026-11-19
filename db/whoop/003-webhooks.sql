begin;

alter table fitcore_whoop.connections
  add column provider_user_id text unique,
  add column event_revision integer not null default 0;

update fitcore_whoop.connections connection
set provider_user_id = (
  select case when count(distinct record->>'user_id') = 1 then min(record->>'user_id') end
  from jsonb_array_elements(connection.snapshot) record
)
where snapshot is not null;

create table fitcore_whoop.webhook_events (
  connection_id uuid not null references fitcore_whoop.connections(id) on delete cascade,
  provider_user_id text not null,
  trace_id text not null,
  event_type text not null,
  record_id uuid not null,
  received_at timestamptz not null default now(),
  primary key (connection_id, provider_user_id, trace_id)
);

create index whoop_webhook_receipt_time on fitcore_whoop.webhook_events (received_at);
revoke all on fitcore_whoop.webhook_events from public;

commit;
