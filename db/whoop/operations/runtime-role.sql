-- Run ONCE as the migration owner, AFTER migrations 001 through 005.
-- Only for a DEDICATED WHOOP database: PUBLIC database/schema grants are removed.
-- No password is included. Set the login password privately before using the role.
begin;

create role fitcore_whoop_runtime login
  nosuperuser nocreatedb nocreaterole noinherit noreplication nobypassrls;

do $$
begin
  execute format('revoke all on database %I from public', current_database());
  execute format('grant connect on database %I to fitcore_whoop_runtime', current_database());
end
$$;

revoke all on schema public from public;
revoke all on schema fitcore_whoop from public;
revoke all on all tables in schema fitcore_whoop from public;
grant usage on schema fitcore_whoop to fitcore_whoop_runtime;
grant select, insert, delete on fitcore_whoop.sessions to fitcore_whoop_runtime;
grant select, insert, update, delete on
  fitcore_whoop.oauth_attempts,
  fitcore_whoop.connections
to fitcore_whoop_runtime;
-- Foreground sync reads deletions, and disconnect removes them.
-- INSERT is reserved for a separately approved webhook rollout; UPDATE is unused.
grant select, delete on fitcore_whoop.webhook_events to fitcore_whoop_runtime;

commit;
