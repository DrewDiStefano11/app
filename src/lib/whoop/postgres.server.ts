import { randomUUID } from "node:crypto";
import type { WhoopSession } from "./oauth.server";
import type { WhoopSnapshot } from "./dashboard";
import type { WhoopV2Record } from "./v2.server";
import type { WhoopWebhookEvent } from "./webhook.server";

type Query = <Row extends Record<string, unknown>>(
  statement: string,
  parameters: (string | number)[],
) => Promise<Row[]>;

type Connection = {
  id: string;
  envelope: string | null;
  expiresAt: string;
  revision: number;
  eventRevision: number;
  lastSyncedAt: string | null;
  lastDeletedAt?: string | null;
  status: "connected" | "reconnect_required" | "disconnecting";
};

export type WhoopBackgroundConnection = { ownerId: string; connectionId: string };
export type WhoopSyncActor = WhoopSession | WhoopBackgroundConnection;
export type WhoopSyncPurpose = "dashboard" | "jarvis";
export type WhoopDeletion = {
  type: "workout.deleted" | "sleep.deleted" | "recovery.deleted";
  recordId: string;
  receivedAtMs: number;
};

function syncPrincipal(actor: WhoopSyncActor) {
  return "id" in actor ? [actor.id, "session"] : [actor.connectionId, "connection"];
}

// Recovery deletion IDs identify sleeps. A sleep deletion removes its dependent recovery as well.
const webhookDeletesRecord = `case event.event_type
  when 'workout.deleted' then item.record->>'kind' = 'workout'
    and lower(item.record->>'id') = event.record_id::text
  when 'recovery.deleted' then item.record->>'kind' = 'recovery'
    and lower(item.record->>'sleep_id') = event.record_id::text
  when 'sleep.deleted' then
    (item.record->>'kind' = 'sleep' and lower(item.record->>'id') = event.record_id::text)
    or (item.record->>'kind' = 'recovery' and lower(item.record->>'sleep_id') = event.record_id::text)
  else false
end`;

export function createWhoopStore(query: Query) {
  return {
    async createSession(
      ownerId: string,
      digest: string,
      ttlSeconds: number,
    ): Promise<WhoopSession> {
      const id = randomUUID();
      await query(
        `insert into fitcore_whoop.sessions (id, owner_id, credential_digest, expires_at)
         values ($1, $2, $3, now() + $4 * interval '1 second')`,
        [id, ownerId, digest, ttlSeconds],
      );
      return { id, ownerId };
    },

    async getSession(digest: string) {
      const [session] = await query<WhoopSession>(
        `select id, owner_id as "ownerId" from fitcore_whoop.sessions
         where credential_digest = $1 and expires_at > now()`,
        [digest],
      );
      return session ?? null;
    },

    async deleteSession(id: string) {
      await query("delete from fitcore_whoop.sessions where id = $1", [id]);
    },

    async beginAttempt(session: WhoopSession, proof: string, ttlSeconds: number) {
      const rows = await query(
        `insert into fitcore_whoop.oauth_attempts as previous
           (owner_id, id, session_id, proof_digest, expires_at)
         select owner_id, $3, id, $4, now() + $5 * interval '1 second'
           from fitcore_whoop.sessions
         where id = $1 and owner_id = $2 and expires_at > now()
           and not exists (select 1 from fitcore_whoop.connections where owner_id = $2)
         on conflict (owner_id) do update
           set id = excluded.id, session_id = excluded.session_id,
               proof_digest = excluded.proof_digest, expires_at = excluded.expires_at,
               claimed_at = null
         where previous.claimed_at is null or previous.expires_at <= now()
         returning id`,
        [session.id, session.ownerId, randomUUID(), proof, ttlSeconds],
      );
      return rows.length === 1;
    },

    async claimAttempt(session: WhoopSession, proof: string) {
      const [attempt] = await query<{ id: string }>(
        `update fitcore_whoop.oauth_attempts set claimed_at = now()
         where owner_id = $1 and session_id = $2 and proof_digest = $3
           and expires_at > now() and claimed_at is null
           and exists (
             select 1 from fitcore_whoop.sessions
             where owner_id = $1 and id = $2 and expires_at > now()
           )
           and not exists (select 1 from fitcore_whoop.connections where owner_id = $1)
         returning id`,
        [session.ownerId, session.id, proof],
      );
      return attempt?.id ?? null;
    },

    async discardAttempt(session: WhoopSession, attemptId: string) {
      await query(
        `delete from fitcore_whoop.oauth_attempts
         where owner_id = $1 and session_id = $2 and id = $3`,
        [session.ownerId, session.id, attemptId],
      );
    },

    async saveConnection(
      session: WhoopSession,
      attemptId: string,
      envelope: string,
      ttlSeconds: number,
    ) {
      const rows = await query(
        `with consumed as (
           delete from fitcore_whoop.oauth_attempts
           where owner_id = $1 and session_id = $2 and id = $3
             and expires_at > now() and claimed_at is not null
             and exists (
               select 1 from fitcore_whoop.sessions
               where id = $2 and owner_id = $1 and expires_at > now()
             )
           returning owner_id, id
         )
         insert into fitcore_whoop.connections (owner_id, id, token_envelope, expires_at)
         select owner_id, id, $4, now() + $5 * interval '1 second' from consumed
         on conflict (owner_id) do nothing
         returning id`,
        [session.ownerId, session.id, attemptId, envelope, ttlSeconds],
      );
      return rows.length === 1;
    },

    async getConnection(ownerId: string) {
      const [connection] = await query<Connection>(
        `select id, token_envelope as envelope, expires_at::text as "expiresAt", revision, status,
           event_revision as "eventRevision",
           to_char(last_synced_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') as "lastSyncedAt",
           (select to_char(max(event.received_at) at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
            from fitcore_whoop.webhook_events event
            where event.connection_id = connection.id and event.event_type like '%.deleted') as "lastDeletedAt"
         from fitcore_whoop.connections connection where owner_id = $1`,
        [ownerId],
      );
      return connection ?? null;
    },

    async getSnapshot(session: WhoopSession) {
      const [snapshot] = await query<WhoopSnapshot & { version: string }>(
        `select connection.id::text || ':' || connection.event_revision::text as version,
           to_char(connection.last_synced_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') as "lastSyncedAt",
           to_char(least(browser_session.expires_at, connection.snapshot_expires_at) at time zone 'UTC',
             'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') as "accessExpiresAt",
           connection.snapshot as records
         from fitcore_whoop.connections connection
         join fitcore_whoop.sessions browser_session on browser_session.owner_id = connection.owner_id
         where connection.owner_id = $1 and connection.status = 'connected' and connection.snapshot_expires_at > now()
           and browser_session.id = $2 and browser_session.expires_at > now()`,
        [session.ownerId, session.id],
      );
      return snapshot ?? null;
    },

    async isLiveVersionCurrent(session: WhoopSession, version: string) {
      const [row] = await query<{ current: boolean }>(
        `select exists (
           select 1 from fitcore_whoop.connections connection
           join fitcore_whoop.sessions browser_session on browser_session.owner_id = connection.owner_id
           where connection.owner_id = $1 and connection.status = 'connected'
             and browser_session.id = $2 and browser_session.expires_at > now()
             and connection.id::text || ':' || connection.event_revision::text = $3
         ) as current`,
        [session.ownerId, session.id, version],
      );
      return row?.current === true;
    },

    async claimSync(actor: WhoopSyncActor, purpose: WhoopSyncPurpose = "dashboard") {
      const [claim] = await query<{
        id: string;
        envelope: string;
        expiresAtMs: number;
        revision: number;
        syncId: string;
        eventRevision: number;
      }>(
        `update fitcore_whoop.connections
         set sync_id = $4, sync_started_at = now()
         where owner_id = $1 and status = 'connected' and refresh_id is null
           and (sync_id is null or sync_started_at <= now() - interval '90 seconds')
           and coalesce(case when $5 = 'jarvis' then jarvis_after else sync_after end, '-infinity') <= now()
           and ($5 <> 'jarvis' or $3 = 'session')
           and (($3 = 'connection' and id = $2) or
             ($3 = 'session' and exists (select 1 from fitcore_whoop.sessions
               where owner_id = $1 and id = $2 and expires_at > now())))
         returning id, token_envelope as envelope, revision, sync_id as "syncId",
           event_revision as "eventRevision",
           (extract(epoch from expires_at) * 1000)::float8 as "expiresAtMs"`,
        [actor.ownerId, ...syncPrincipal(actor), randomUUID(), purpose],
      );
      return claim ?? null;
    },

    async getSyncRetryAfter(actor: WhoopSyncActor, purpose: WhoopSyncPurpose = "dashboard") {
      const [retry] = await query<{ seconds: number }>(
        `select greatest(1, ceil(extract(epoch from greatest(
           coalesce(case when $4 = 'jarvis' then jarvis_after else sync_after end, now()),
           case when sync_id is not null then sync_started_at + interval '90 seconds' else now() end,
           case when refresh_id is not null then refresh_started_at + interval '45 seconds' else now() end
         ) - now())))::integer as seconds
         from fitcore_whoop.connections
         where owner_id = $1 and status = 'connected'
           and ($4 <> 'jarvis' or $3 = 'session')
           and (($3 = 'connection' and id = $2) or
             ($3 = 'session' and exists (select 1 from fitcore_whoop.sessions
               where owner_id = $1 and id = $2 and expires_at > now())))`,
        [actor.ownerId, ...syncPrincipal(actor), purpose],
      );
      return retry?.seconds ?? null;
    },

    async expireAbandonedRefresh(actor: WhoopSyncActor) {
      await query(
        `update fitcore_whoop.connections
         set token_envelope = null, status = 'reconnect_required', revision = revision + 1,
             refresh_id = null, refresh_started_at = null, sync_id = null, sync_started_at = null
         where owner_id = $1 and status = 'connected'
           and refresh_started_at <= now() - interval '45 seconds'
           and (($3 = 'connection' and id = $2) or
             ($3 = 'session' and exists (select 1 from fitcore_whoop.sessions
               where owner_id = $1 and id = $2 and expires_at > now())))`,
        [actor.ownerId, ...syncPrincipal(actor)],
      );
    },

    async saveSync(
      actor: WhoopSyncActor,
      id: string,
      syncId: string,
      records: WhoopV2Record[],
      cooldownSeconds: number,
      eventRevision: number,
      cacheExpiresAtMs: number,
      purpose: WhoopSyncPurpose = "dashboard",
    ) {
      const durable = purpose === "dashboard" && cacheExpiresAtMs > Date.now();
      const [saved] = await query<{
        lastSyncedAt: string;
        accessExpiresAt: string | null;
        deletions: WhoopDeletion[];
      }>(
        `with saved as (
         update fitcore_whoop.connections connection
         set snapshot = case when $11 = 'jarvis' then snapshot when $10::float8 = 0 then null else (
               select coalesce(jsonb_agg(item.record order by item.position), '[]'::jsonb)
               from jsonb_array_elements(nullif($4, '')::jsonb) with ordinality as item(record, position)
               where not exists (
                 select 1 from fitcore_whoop.webhook_events event
                 where event.connection_id = connection.id and event.received_at > now() - interval '31 days'
                   and event.provider_user_id = coalesce(connection.provider_user_id, nullif($8, ''))
                   and coalesce((item.record->>'updated_at')::timestamptz, '-infinity') <= event.received_at
                   and (${webhookDeletesRecord})
               )
             ) end,
             snapshot_expires_at = case when $11 = 'jarvis' then snapshot_expires_at
               else to_timestamp(nullif($10::float8, 0) / 1000) end,
             provider_user_id = coalesce(provider_user_id, nullif($8, '')),
             last_synced_at = case when $11 = 'jarvis' then last_synced_at else now() end,
             sync_id = null, sync_started_at = null,
             sync_after = case when $11 = 'jarvis' then sync_after else now() + $5 * interval '1 second' end,
             jarvis_after = case when $11 = 'jarvis' then now() + $5 * interval '1 second' else jarvis_after end
         where owner_id = $1 and id = $2 and sync_id = $3 and status = 'connected'
           and event_revision = $9
           and (provider_user_id is null or $8 = '' or provider_user_id = $8)
           and (($7 = 'connection' and id = $6) or
             ($7 = 'session' and exists (select 1 from fitcore_whoop.sessions
               where owner_id = $1 and id = $6 and expires_at > now())))
         returning id, provider_user_id
        )
        select to_char(now() at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') as "lastSyncedAt",
          to_char(browser_session.expires_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') as "accessExpiresAt",
          case when browser_session.id is null then '[]'::jsonb else (
            select coalesce(jsonb_agg(jsonb_build_object(
              'type', event.event_type, 'recordId', event.record_id::text,
              'receivedAtMs', extract(epoch from event.received_at) * 1000
            )), '[]'::jsonb)
            from fitcore_whoop.webhook_events event
            where event.connection_id = saved.id and event.provider_user_id = saved.provider_user_id
              and event.received_at > now() - interval '31 days' and event.event_type like '%.deleted'
          ) end as deletions
        from saved
        left join fitcore_whoop.sessions browser_session
          on $10 = 0 and $7 = 'session' and browser_session.id = $6
          and browser_session.owner_id = $1 and browser_session.expires_at > now()`,
        [
          actor.ownerId,
          id,
          syncId,
          durable ? JSON.stringify(records) : "",
          cooldownSeconds,
          ...syncPrincipal(actor),
          records[0]?.user_id ?? "",
          eventRevision,
          durable ? cacheExpiresAtMs : 0,
          purpose,
        ],
      );
      return saved ?? null;
    },

    async registerWebhook(event: WhoopWebhookEvent) {
      const [connection] = await query<WhoopBackgroundConnection & { pinned: boolean }>(
        `with matched as (
           select id from fitcore_whoop.connections
           where status = 'connected' and
             (provider_user_id = $1 or (provider_user_id is null and $3 like '%.deleted'))
           for update
         ), received as (
           insert into fitcore_whoop.webhook_events (connection_id, provider_user_id, trace_id, event_type, record_id)
           select id, $1, $2, $3, $4::uuid from matched
           on conflict (connection_id, provider_user_id, trace_id) do nothing
           returning connection_id, event_type, record_id
         )
         update fitcore_whoop.connections connection
         set event_revision = connection.event_revision + 1,
             snapshot = case
               when connection.provider_user_id is null or connection.snapshot is null
                 or event.event_type not like '%.deleted' then connection.snapshot
               else (
                 select coalesce(jsonb_agg(item.record order by item.position), '[]'::jsonb)
                 from jsonb_array_elements(connection.snapshot) with ordinality as item(record, position)
                 where not coalesce((${webhookDeletesRecord}), false)
               )
             end
         from received event
         where connection.id = event.connection_id
         returning connection.owner_id as "ownerId", connection.id as "connectionId",
           connection.provider_user_id is not null as pinned`,
        [event.userId, event.traceId, event.type, event.recordId],
      );
      return connection?.pinned
        ? { ownerId: connection.ownerId, connectionId: connection.connectionId }
        : null;
    },

    async getBackgroundConnection(ownerId: string) {
      const [connection] = await query<WhoopBackgroundConnection>(
        `select owner_id as "ownerId", id as "connectionId" from fitcore_whoop.connections
         where owner_id = $1 and status = 'connected'`,
        [ownerId],
      );
      return connection ?? null;
    },

    async pruneWebhookEvents() {
      await query(
        `delete from fitcore_whoop.webhook_events event
         where event.received_at <= now() - case
           when event.event_type like '%.deleted' then interval '31 days'
           else interval '2 days'
         end or exists (
           select 1 from fitcore_whoop.connections connection
           where connection.id = event.connection_id and connection.provider_user_id <> event.provider_user_id
         )`,
        [],
      );
    },

    async pruneSnapshots() {
      await query(
        `update fitcore_whoop.connections
         set snapshot = null, snapshot_expires_at = null
         where snapshot_expires_at <= now()`,
        [],
      );
    },

    async releaseSync(
      ownerId: string,
      id: string,
      syncId: string,
      cooldownSeconds: number,
      scope: WhoopSyncPurpose | "all" = "dashboard",
    ) {
      await query(
        `update fitcore_whoop.connections
         set sync_id = null, sync_started_at = null,
             sync_after = case when $5 in ('dashboard', 'all')
               then greatest(sync_after, now() + $4 * interval '1 second') else sync_after end,
             jarvis_after = case when $5 in ('jarvis', 'all')
               then greatest(jarvis_after, now() + $4 * interval '1 second') else jarvis_after end
         where owner_id = $1 and id = $2 and sync_id = $3 and status = 'connected'`,
        [ownerId, id, syncId, cooldownSeconds, scope],
      );
    },

    async rejectSyncAuthorization(ownerId: string, id: string, syncId: string) {
      await query(
        `update fitcore_whoop.connections
         set status = 'reconnect_required', revision = revision + 1,
             sync_id = null, sync_started_at = null
         where owner_id = $1 and id = $2 and sync_id = $3 and status = 'connected'
           and refresh_id is null`,
        [ownerId, id, syncId],
      );
    },

    async cancelPendingAttempt(ownerId: string) {
      await query(
        `delete from fitcore_whoop.oauth_attempts
         where owner_id = $1 and (claimed_at is null or expires_at <= now())`,
        [ownerId],
      );
      const remaining = await query(
        `select owner_id from fitcore_whoop.oauth_attempts where owner_id = $1
         union all
         select owner_id from fitcore_whoop.connections where owner_id = $1`,
        [ownerId],
      );
      return remaining.length === 0;
    },

    async claimDisconnect(session: WhoopSession) {
      const [connection] = await query<
        Pick<Connection, "id" | "envelope"> & { disconnectId: string }
      >(
        `with disconnected as (
           update fitcore_whoop.connections
           set status = 'disconnecting', disconnect_id = $2, disconnect_started_at = now(),
               disconnect_refresh_taken = disconnect_refresh_taken or refresh_id is not null,
               refresh_id = null, refresh_started_at = null,
               snapshot = null, snapshot_expires_at = null, last_synced_at = null,
               sync_id = null, sync_started_at = null
           where owner_id = $1
             and (refresh_id is null or refresh_started_at <= now() - interval '45 seconds')
             and (disconnect_id is null or disconnect_started_at <= now() - interval '60 seconds')
           returning id, token_envelope as envelope, disconnect_id as "disconnectId"
         ), erased as (
           delete from fitcore_whoop.webhook_events event using disconnected
           where event.connection_id = disconnected.id
         )
         select * from disconnected`,
        [session.ownerId, randomUUID()],
      );
      return connection ?? null;
    },

    async claimDisconnectRefresh(ownerId: string, connectionId: string, disconnectId: string) {
      const rows = await query(
        `update fitcore_whoop.connections set disconnect_refresh_taken = true
         where owner_id = $1 and id = $2 and disconnect_id = $3 and not disconnect_refresh_taken
         returning id`,
        [ownerId, connectionId, disconnectId],
      );
      return rows.length === 1;
    },

    async saveDisconnectRefresh(
      ownerId: string,
      connectionId: string,
      disconnectId: string,
      envelope: string,
      ttlSeconds: number,
    ) {
      const rows = await query(
        `update fitcore_whoop.connections
         set token_envelope = $4, expires_at = now() + $5 * interval '1 second'
         where owner_id = $1 and id = $2 and disconnect_id = $3 and disconnect_refresh_taken
         returning id`,
        [ownerId, connectionId, disconnectId, envelope, ttlSeconds],
      );
      return rows.length === 1;
    },

    async finishDisconnect(ownerId: string, connectionId: string, disconnectId: string) {
      const rows = await query(
        `delete from fitcore_whoop.connections
         where owner_id = $1 and id = $2 and disconnect_id = $3
         returning id`,
        [ownerId, connectionId, disconnectId],
      );
      return rows.length === 1;
    },
    async claimRefresh(ownerId: string, connectionId: string, revision: number, syncId = "") {
      const [claim] = await query<{ refreshId: string }>(
        `update fitcore_whoop.connections set refresh_id = $4, refresh_started_at = now()
         where owner_id = $1 and id = $2 and revision = $3
           and status = 'connected' and refresh_id is null
           and ($5 = '' or sync_id::text = $5)
         returning refresh_id as "refreshId"`,
        [ownerId, connectionId, revision, randomUUID(), syncId],
      );
      return claim?.refreshId ?? null;
    },

    async releaseRefresh(ownerId: string, connectionId: string, refreshId: string) {
      await query(
        `update fitcore_whoop.connections set refresh_id = null, refresh_started_at = null
         where owner_id = $1 and id = $2 and refresh_id = $3 and status = 'connected'`,
        [ownerId, connectionId, refreshId],
      );
    },

    async saveRefresh(
      ownerId: string,
      connectionId: string,
      refreshId: string,
      envelope: string,
      ttlSeconds: number,
    ) {
      const rows = await query(
        `update fitcore_whoop.connections
         set token_envelope = $4, expires_at = now() + $5 * interval '1 second',
             revision = revision + 1, refresh_id = null, refresh_started_at = null
         where owner_id = $1 and id = $2 and refresh_id = $3 and status = 'connected'
         returning id`,
        [ownerId, connectionId, refreshId, envelope, ttlSeconds],
      );
      return rows.length === 1;
    },

    async failRefresh(ownerId: string, connectionId: string, refreshId: string) {
      await query(
        `update fitcore_whoop.connections
         set token_envelope = null, status = 'reconnect_required', revision = revision + 1,
             refresh_id = null, refresh_started_at = null
         where owner_id = $1 and id = $2 and refresh_id = $3`,
        [ownerId, connectionId, refreshId],
      );
    },
  };
}
