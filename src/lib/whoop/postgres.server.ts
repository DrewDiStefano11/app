import { randomUUID } from "node:crypto";
import type { WhoopSession } from "./oauth.server";
import type { WhoopSnapshot } from "./dashboard";
import type { WhoopV2Record } from "./v2.server";

type Query = <Row extends Record<string, unknown>>(
  statement: string,
  parameters: (string | number)[],
) => Promise<Row[]>;

type Connection = {
  id: string;
  envelope: string | null;
  expiresAt: string;
  revision: number;
  lastSyncedAt: string | null;
  status: "connected" | "reconnect_required" | "disconnecting";
};

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
           to_char(last_synced_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') as "lastSyncedAt"
         from fitcore_whoop.connections where owner_id = $1`,
        [ownerId],
      );
      return connection ?? null;
    },

    async getSnapshot(session: WhoopSession) {
      const [snapshot] = await query<WhoopSnapshot>(
        `select to_char(connection.last_synced_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') as "lastSyncedAt",
           to_char(browser_session.expires_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') as "accessExpiresAt",
           connection.snapshot as records
         from fitcore_whoop.connections connection
         join fitcore_whoop.sessions browser_session on browser_session.owner_id = connection.owner_id
         where connection.owner_id = $1 and connection.status = 'connected' and connection.snapshot is not null
           and browser_session.id = $2 and browser_session.expires_at > now()`,
        [session.ownerId, session.id],
      );
      return snapshot ?? null;
    },

    async claimSync(session: WhoopSession) {
      const [claim] = await query<{
        id: string;
        envelope: string;
        expiresAtMs: number;
        revision: number;
        syncId: string;
      }>(
        `update fitcore_whoop.connections
         set sync_id = $3, sync_started_at = now()
         where owner_id = $1 and status = 'connected' and refresh_id is null
           and (sync_id is null or sync_started_at <= now() - interval '90 seconds')
           and (sync_after is null or sync_after <= now())
           and exists (select 1 from fitcore_whoop.sessions
             where owner_id = $1 and id = $2 and expires_at > now())
         returning id, token_envelope as envelope, revision, sync_id as "syncId",
           (extract(epoch from expires_at) * 1000)::float8 as "expiresAtMs"`,
        [session.ownerId, session.id, randomUUID()],
      );
      return claim ?? null;
    },

    async expireAbandonedRefresh(session: WhoopSession) {
      await query(
        `update fitcore_whoop.connections
         set token_envelope = null, status = 'reconnect_required', revision = revision + 1,
             refresh_id = null, refresh_started_at = null, sync_id = null, sync_started_at = null
         where owner_id = $1 and status = 'connected'
           and refresh_started_at <= now() - interval '45 seconds'
           and exists (select 1 from fitcore_whoop.sessions
             where owner_id = $1 and id = $2 and expires_at > now())`,
        [session.ownerId, session.id],
      );
    },

    async saveSync(
      session: WhoopSession,
      id: string,
      syncId: string,
      records: WhoopV2Record[],
      cooldownSeconds: number,
    ) {
      const rows = await query(
        `update fitcore_whoop.connections
         set snapshot = $4::jsonb, last_synced_at = now(),
             sync_id = null, sync_started_at = null,
             sync_after = now() + $5 * interval '1 second'
         where owner_id = $1 and id = $2 and sync_id = $3 and status = 'connected'
           and exists (select 1 from fitcore_whoop.sessions
             where owner_id = $1 and id = $6 and expires_at > now())
         returning id`,
        [session.ownerId, id, syncId, JSON.stringify(records), cooldownSeconds, session.id],
      );
      return rows.length === 1;
    },

    async releaseSync(ownerId: string, id: string, syncId: string, cooldownSeconds: number) {
      await query(
        `update fitcore_whoop.connections
         set sync_id = null, sync_started_at = null,
             sync_after = now() + $4 * interval '1 second'
         where owner_id = $1 and id = $2 and sync_id = $3 and status = 'connected'`,
        [ownerId, id, syncId, cooldownSeconds],
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
        `update fitcore_whoop.connections
         set status = 'disconnecting', disconnect_id = $2, disconnect_started_at = now(),
             disconnect_refresh_taken = disconnect_refresh_taken or refresh_id is not null,
             refresh_id = null, refresh_started_at = null,
             snapshot = null, last_synced_at = null, sync_id = null, sync_started_at = null
         where owner_id = $1
           and (refresh_id is null or refresh_started_at <= now() - interval '45 seconds')
           and (disconnect_id is null or disconnect_started_at <= now() - interval '60 seconds')
         returning id, token_envelope as envelope, disconnect_id as "disconnectId"`,
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
