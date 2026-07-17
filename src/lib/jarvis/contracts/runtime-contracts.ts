/**
 * Shared Jarvis runtime contracts.
 * This file contains strictly defined, dependency-free boundaries for
 * the parallel Jarvis runtime implementation wave.
 */

export const JARVIS_RUNTIME_CONTRACT_VERSION = "1.0.0";

// --- Identifiers ---
// Branded string types for stable identifier safety.
export type SessionId = string & { readonly __brand: "SessionId" };
export type TurnId = string & { readonly __brand: "TurnId" };
export type RequestId = string & { readonly __brand: "RequestId" };
export type OperationId = string & { readonly __brand: "OperationId" };
export type ConfirmationId = string & { readonly __brand: "ConfirmationId" };
export type ClarificationId = string & { readonly __brand: "ClarificationId" };
export type AuditEventId = string & { readonly __brand: "AuditEventId" };
export type IdempotencyKey = string & { readonly __brand: "IdempotencyKey" };
export type ToolName = string & { readonly __brand: "ToolName" };

// --- Source Spans & Transcripts ---
export interface SourceSpan {
  readonly startIndex: number; // inclusive
  readonly endIndex: number; // exclusive
  readonly originalText?: string;
}

export interface NormalizedTranscript {
  readonly originalText: string;
  readonly normalizedText: string;
  readonly hasMeaningfulText: boolean;
  readonly warnings?: readonly string[];
  readonly sourceMapping?: readonly SourceSpan[];
}

// --- Confidence & Match Outcomes ---
export type ConfidenceLevel = "high" | "medium" | "low";

export type MatchOutcome<TCandidate extends CommandCandidate = CommandCandidate> =
  | {
      readonly status: "matched";
      readonly candidate: TCandidate;
      readonly warnings?: readonly string[];
    }
  | { readonly status: "no_match"; readonly reasonCode: string; readonly safeMessage: string }
  | {
      readonly status: "ambiguous";
      readonly reasonCode: string;
      readonly safeMessage: string;
      readonly clarification?: ClarificationRequirement;
    }
  | { readonly status: "unsupported"; readonly reasonCode: string; readonly safeMessage: string };

// --- Command Families & Context ---
export type CommandFamily =
  | "control"
  | "set"
  | "timer"
  | "workout_state"
  | "navigation"
  | "response_preference"
  | "unknown"
  | "deferred";

export type ContextRequirement =
  | "active_session"
  | "active_workout"
  | "active_exercise"
  | "previous_set"
  | "active_timer"
  | "paused_timer"
  | "previous_assistant_response"
  | "pending_confirmation"
  | "pending_clarification"
  | "undoable_action"
  | "configured_default_duration"
  | "workout_lookup"
  | "exercise_position_validation";

export interface CommandCandidate {
  readonly family: CommandFamily;
  readonly action: string;
  readonly originalTranscript: string;
  readonly normalizedText: string;
  readonly matchedSpan: SourceSpan;
  readonly confidence: ConfidenceLevel;
  readonly clarificationRequired: boolean;
  readonly confirmationRequired: boolean;
  readonly requiredContext: readonly ContextRequirement[];
  readonly warnings?: readonly string[];
  readonly parserVersion?: string;
}

// --- Clarification Contracts ---
export interface ClarificationRequirement {
  readonly clarificationId: ClarificationId;
  readonly originatingTurnId: TurnId;
  readonly reasonCode: string;
  readonly fieldsRequiringClarification: readonly string[];
  readonly allowedChoices?: readonly string[];
}

export interface ClarificationReference {
  readonly clarificationId: ClarificationId;
}

export interface ClarificationCategory {
  readonly category: string;
}

export interface ClarificationResolutionReference {
  readonly clarificationId: ClarificationId;
  readonly resolvedValue: unknown;
}

// --- Risk & Confirmation Contracts ---
export type RiskClass =
  | "read_only"
  | "low_risk_reversible_write"
  | "confirmation_sensitive_write"
  | "destructive_action";

export interface ConfirmationRequirement {
  readonly confirmationId: ConfirmationId;
  readonly originatingTurnId: TurnId;
  readonly actionReference: string;
  readonly riskClass: RiskClass;
  readonly expirationTimestamp?: number;
}

export interface PendingConfirmationReference {
  readonly confirmationId: ConfirmationId;
}

export interface ConfirmationDecision {
  readonly confirmationId: ConfirmationId;
  readonly decision: "accepted" | "rejected";
}

export interface ConfirmationResolution {
  readonly confirmationId: ConfirmationId;
  readonly resolution: "accepted" | "rejected";
  readonly timestamp: number;
}

// --- Session Contracts ---
export type SessionStateName =
  | "created"
  | "idle"
  | "listening"
  | "transcribing"
  | "interpreting"
  | "awaiting_clarification"
  | "awaiting_confirmation"
  | "preparing_response"
  | "speaking"
  | "paused"
  | "interrupted"
  | "completed"
  | "canceled"
  | "expired"
  | "failed";

export interface SessionIdentity {
  readonly sessionId: SessionId;
}

export interface SessionContract extends SessionIdentity {
  readonly state: SessionStateName;
  readonly createdTimestamp: number;
  readonly updatedTimestamp: number;
  readonly transitionSequence: number;
  readonly pendingClarification?: ClarificationRequirement;
  readonly pendingConfirmation?: ConfirmationRequirement;
  readonly interruptionMetadata?: unknown;
  readonly terminalReason?: string;
}

// --- Turn Contracts ---
export type TurnLifecycleState =
  | "created"
  | "input_pending"
  | "transcription_pending"
  | "transcript_ready"
  | "interpretation_pending"
  | "interpretation_ready"
  | "action_pending"
  | "response_pending"
  | "response_ready"
  | "output_pending"
  | "interrupted"
  | "superseded"
  | "canceled"
  | "completed"
  | "failed";

export interface TurnIdentity {
  readonly turnId: TurnId;
  readonly sessionId: SessionId;
}

export interface TurnContract extends TurnIdentity {
  readonly revision: number;
  readonly lifecycleState: TurnLifecycleState;
  readonly createdTimestamp: number;
  readonly updatedTimestamp: number;
  readonly operationReferences: readonly OperationReference[];
  readonly transcriptReference?: string;
  readonly interpretationReference?: string;
  readonly responseReference?: string;
  readonly interruptionMetadata?: unknown;
  readonly supersessionMetadata?: unknown;
  readonly terminalMetadata?: unknown;
}

// --- Turn-Operation Contracts ---
export type OperationStage =
  | "input"
  | "transcription"
  | "interpretation"
  | "action_validation"
  | "action_execution"
  | "response_generation"
  | "output_delivery";

export type OperationStatus =
  | "pending"
  | "accepted"
  | "rejected"
  | "invalidated"
  | "canceled"
  | "stale";

export interface OperationReference {
  readonly operationId: OperationId;
  readonly turnId: TurnId;
  readonly turnRevision: number;
  readonly stage: OperationStage;
  readonly status: OperationStatus;
  readonly registeredTimestamp: number;
  readonly completedTimestamp?: number;
  readonly invalidationReason?: string;
}

// --- Tool Envelopes ---
export interface ToolRequestEnvelope {
  readonly requestId: RequestId;
  readonly sessionId: SessionId;
  readonly turnId: TurnId;
  readonly turnRevision: number;
  readonly toolName: ToolName;
  readonly arguments: unknown;
  readonly contextTimestamp: number;
  readonly idempotencyKey: IdempotencyKey;
  readonly confirmationReference?: ConfirmationId;
  readonly expectedStateVersion?: number;
  readonly requestMetadata?: unknown;
}

export interface ToolSuccessResult<TValue = unknown> {
  readonly status: "success";
  readonly requestId: RequestId;
  readonly toolName: ToolName;
  readonly resultValue: TValue;
  readonly stateVersion?: number;
  readonly undoReference?: string;
  readonly auditReference?: AuditEventId;
  readonly warnings?: readonly string[];
  readonly completionTimestamp: number;
}

export interface ToolFailureResult {
  readonly status: "failure";
  readonly requestId: RequestId;
  readonly toolName?: ToolName;
  readonly errorCode: string;
  readonly safeMessage: string;
  readonly retryable: boolean;
  readonly recoverable: boolean;
  readonly clarificationRequirement?: ClarificationRequirement;
  readonly confirmationRequirement?: ConfirmationRequirement;
  readonly currentStateVersion?: number;
  readonly auditReference?: AuditEventId;
}

export type ToolResultEnvelope<TValue = unknown> = ToolSuccessResult<TValue> | ToolFailureResult;

// --- Runtime Errors ---
export type RuntimeErrorCode =
  | "invalid_input"
  | "unsupported_command"
  | "ambiguous_command"
  | "missing_context"
  | "invalid_session"
  | "invalid_turn"
  | "stale_turn"
  | "future_turn_revision"
  | "invalid_transition"
  | "unknown_tool"
  | "invalid_tool_arguments"
  | "permission_denied"
  | "confirmation_required"
  | "confirmation_mismatch"
  | "clarification_required"
  | "idempotency_conflict"
  | "stale_state_version"
  | "operation_canceled"
  | "operation_superseded"
  | "timeout"
  | "internal_failure";

export interface RuntimeErrorContract {
  readonly code: RuntimeErrorCode;
  readonly category: string;
  readonly safeMessage: string;
  readonly developerDetail?: string;
  readonly recoverable: boolean;
  readonly retryable: boolean;
  readonly sessionId?: SessionId;
  readonly turnId?: TurnId;
  readonly requestId?: RequestId;
  readonly expectedRevision?: number;
  readonly receivedRevision?: number;
  readonly metadata?: unknown;
}

// --- Audit Event Base ---
export interface AuditEventBase {
  readonly auditEventId: AuditEventId;
  readonly eventType: string;
  readonly timestamp: number;
  readonly sessionId?: SessionId;
  readonly turnId?: TurnId;
  readonly requestId?: RequestId;
  readonly actorType: string;
  readonly outcome: "success" | "failure" | "unknown";
  readonly riskClass?: RiskClass;
  readonly metadata?: unknown;
}

// --- Dependency-Injection Interfaces ---
export interface ClockProvider {
  now(): number;
}

export interface IdProvider {
  generateSessionId(): SessionId;
  generateTurnId(): TurnId;
  generateRequestId(): RequestId;
  generateOperationId(): OperationId;
  generateClarificationId(): ClarificationId;
  generateConfirmationId(): ConfirmationId;
  generateAuditEventId(): AuditEventId;
  generateIdempotencyKey(): IdempotencyKey;
}

export interface ToolExecutor {
  executeTool(request: ToolRequestEnvelope): Promise<ToolResultEnvelope>;
}

export interface AuditSink {
  recordEvent(event: AuditEventBase): Promise<void>;
}

export interface ContextReader {
  readContext(requirements: readonly ContextRequirement[]): Promise<unknown>;
}

export interface ConfirmationVerifier {
  verifyConfirmation(
    requirement: ConfirmationRequirement,
    decision: ConfirmationDecision,
  ): Promise<ConfirmationResolution>;
}

export interface Logger {
  info(message: string, context?: unknown): void;
  warn(message: string, context?: unknown): void;
  error(message: string, error?: unknown, context?: unknown): void;
}

// --- Runtime Validation Helpers ---

export function isValidSourceSpan(span: SourceSpan): boolean {
  return (
    Number.isSafeInteger(span.startIndex) &&
    Number.isSafeInteger(span.endIndex) &&
    span.startIndex >= 0 &&
    span.endIndex >= span.startIndex
  );
}

export function isValidRevision(revision: number): boolean {
  return Number.isSafeInteger(revision) && revision >= 0;
}

export function isValidIdentifier(id: string | null | undefined): boolean {
  if (typeof id !== "string") return false;
  const trimmed = id.trim();
  if (trimmed.length === 0 || trimmed.length > 256) return false;
  // Disallow control characters
  return !/[\u0000-\u001F\u007F-\u009F]/.test(id);
}

export function requiresConfirmation(riskClass: RiskClass): boolean {
  return riskClass === "confirmation_sensitive_write" || riskClass === "destructive_action";
}

export function isTerminalSessionState(state: SessionStateName): boolean {
  return state === "completed" || state === "canceled" || state === "expired" || state === "failed";
}

export function isTerminalTurnState(state: TurnLifecycleState): boolean {
  return (
    state === "superseded" || state === "canceled" || state === "completed" || state === "failed"
  );
}
