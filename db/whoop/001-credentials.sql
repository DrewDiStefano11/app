begin;

create schema fitcore_whoop;
revoke all on schema fitcore_whoop from public;

create table fitcore_whoop.sessions (
  id uuid primary key,
  owner_id text not null,
  credential_digest text not null unique,
  expires_at timestamptz not null
);

create index whoop_session_expiry on fitcore_whoop.sessions (expires_at);

create table fitcore_whoop.oauth_attempts (
  owner_id text primary key,
  id uuid not null unique,
  session_id uuid not null references fitcore_whoop.sessions (id) on delete cascade,
  proof_digest text not null,
  expires_at timestamptz not null,
  claimed_at timestamptz
);

create index whoop_attempt_session on fitcore_whoop.oauth_attempts (session_id);

create table fitcore_whoop.connections (
  owner_id text primary key,
  id uuid not null unique,
  token_envelope text,
  expires_at timestamptz not null,
  revision integer not null default 0,
  status text not null default 'connected',
  refresh_id uuid,
  refresh_started_at timestamptz,
  disconnect_id uuid,
  disconnect_started_at timestamptz,
  disconnect_refresh_taken boolean not null default false,
  check (status in ('connected', 'reconnect_required', 'disconnecting')),
  check (status <> 'connected' or token_envelope is not null),
  check ((refresh_id is null) = (refresh_started_at is null)),
  check ((disconnect_id is null) = (disconnect_started_at is null)),
  check ((status = 'disconnecting') = (disconnect_id is not null))
);

revoke all on all tables in schema fitcore_whoop from public;

commit;
