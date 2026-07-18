import { describe, it } from "node:test";
import * as assert from "node:assert/strict";
import {
  JARVIS_RUNTIME_CONTRACT_VERSION,
  isValidSourceSpan,
  isValidRevision,
  isValidIdentifier,
  requiresConfirmation,
  isTerminalSessionState,
  isTerminalTurnState,
  type SourceSpan,
  type MatchOutcome,
  type ToolResultEnvelope,
  type ConfirmationDecision,
  type SessionStateName,
  type TurnLifecycleState,
  type OperationStatus,
  type RequestId,
  type ToolName,
  type ConfirmationId,
  type SessionId,
  type TurnId,
  type AuditEventId,
  type IdempotencyKey,
  type ToolRequestEnvelope,
  type SessionContract,
  type TurnContract,
  type RuntimeErrorContract,
  type AuditEventBase,
  type JsonValue,
} from "../../../../src/lib/jarvis/contracts/runtime-contracts";

describe("Jarvis Runtime Contracts", () => {
  describe("Version", () => {
    it("exports a stable version string", () => {
      assert.equal(typeof JARVIS_RUNTIME_CONTRACT_VERSION, "string");
      assert.ok(JARVIS_RUNTIME_CONTRACT_VERSION.length > 0);
      assert.equal(JARVIS_RUNTIME_CONTRACT_VERSION, "1.0.0");
    });
  });

  describe("Validation Helpers", () => {
    describe("isValidIdentifier", () => {
      it("accepts valid identifiers", () => {
        assert.equal(isValidIdentifier("session-123"), true);
        assert.equal(isValidIdentifier("turn_456"), true);
        assert.equal(isValidIdentifier("uuid-v4-format"), true);
      });

      it("rejects empty or whitespace-only strings", () => {
        assert.equal(isValidIdentifier(""), false);
        assert.equal(isValidIdentifier("   "), false);
      });

      it("rejects strings with leading or trailing whitespace", () => {
        assert.equal(isValidIdentifier(" id "), false);
        assert.equal(isValidIdentifier("id "), false);
        assert.equal(isValidIdentifier(" id"), false);
        assert.equal(isValidIdentifier(" ".repeat(100) + "id" + " ".repeat(100)), false);
      });

      it("rejects control characters", () => {
        assert.equal(isValidIdentifier("invalid\nid"), false);
        assert.equal(isValidIdentifier("invalid\tid"), false);
        assert.equal(isValidIdentifier("invalid\u0000id"), false);
      });

      it("rejects excessively long identifiers", () => {
        const longId = "a".repeat(257);
        assert.equal(isValidIdentifier(longId), false);
        // Ensure the length check happens before trimming
        assert.equal(isValidIdentifier(" ".repeat(257)), false);
      });

      it("rejects non-strings", () => {
        assert.equal(isValidIdentifier(null), false);
        assert.equal(isValidIdentifier(undefined), false);
        // @ts-expect-error Testing invalid runtime input
        assert.equal(isValidIdentifier(123), false);
      });
    });

    describe("isValidSourceSpan", () => {
      it("accepts a valid span", () => {
        assert.equal(isValidSourceSpan({ startIndex: 0, endIndex: 5 }), true);
        assert.equal(
          isValidSourceSpan({ startIndex: 10, endIndex: 15, originalText: "hello" }),
          true,
        );
      });

      it("accepts zero-length spans", () => {
        assert.equal(isValidSourceSpan({ startIndex: 5, endIndex: 5 }), true);
      });

      it("rejects negative start index", () => {
        assert.equal(isValidSourceSpan({ startIndex: -1, endIndex: 5 }), false);
      });

      it("rejects end index before start index", () => {
        assert.equal(isValidSourceSpan({ startIndex: 5, endIndex: 4 }), false);
      });

      it("rejects non-integer indexes", () => {
        assert.equal(isValidSourceSpan({ startIndex: 1.5, endIndex: 5 }), false);
      });

      it("rejects values beyond safe integer limits", () => {
        assert.equal(
          isValidSourceSpan({
            startIndex: Number.MAX_SAFE_INTEGER + 1,
            endIndex: Number.MAX_SAFE_INTEGER + 2,
          }),
          false,
        );
      });
    });

    describe("isValidRevision", () => {
      it("accepts zero", () => {
        assert.equal(isValidRevision(0), true);
      });

      it("accepts positive safe integers", () => {
        assert.equal(isValidRevision(1), true);
        assert.equal(isValidRevision(100), true);
      });

      it("rejects negative numbers", () => {
        assert.equal(isValidRevision(-1), false);
      });

      it("rejects decimals", () => {
        assert.equal(isValidRevision(1.5), false);
      });

      it("rejects unsafe integers", () => {
        assert.equal(isValidRevision(Number.MAX_SAFE_INTEGER + 1), false);
      });

      it("rejects string coercion", () => {
        // @ts-expect-error Testing runtime behavior
        assert.equal(isValidRevision("1"), false);
      });
    });

    describe("Risk & Terminal State Helpers", () => {
      it("correctly identifies confirmation requirements", () => {
        assert.equal(requiresConfirmation("read_only"), false);
        assert.equal(requiresConfirmation("low_risk_reversible_write"), false);
        assert.equal(requiresConfirmation("confirmation_sensitive_write"), true);
        assert.equal(requiresConfirmation("destructive_action"), true);
      });

      it("correctly identifies terminal session states", () => {
        const activeStates: SessionStateName[] = [
          "created",
          "idle",
          "listening",
          "transcribing",
          "interpreting",
          "awaiting_clarification",
          "awaiting_confirmation",
          "preparing_response",
          "speaking",
          "paused",
          "interrupted",
        ];
        activeStates.forEach((state) => assert.equal(isTerminalSessionState(state), false));

        const terminalStates: SessionStateName[] = ["completed", "canceled", "expired", "failed"];
        terminalStates.forEach((state) => assert.equal(isTerminalSessionState(state), true));
      });

      it("correctly identifies terminal turn states", () => {
        const activeStates: TurnLifecycleState[] = [
          "created",
          "input_pending",
          "transcription_pending",
          "transcript_ready",
          "interpretation_pending",
          "interpretation_ready",
          "action_pending",
          "response_pending",
          "response_ready",
          "output_pending",
          "interrupted",
        ];
        activeStates.forEach((state) => assert.equal(isTerminalTurnState(state), false));

        const terminalStates: TurnLifecycleState[] = [
          "superseded",
          "canceled",
          "completed",
          "failed",
        ];
        terminalStates.forEach((state) => assert.equal(isTerminalTurnState(state), true));
      });
    });
  });

  describe("Serialization", () => {
    it("can be JSON serialized without losing fields", () => {
      const toolRequest: ToolRequestEnvelope = {
        requestId: "req-1" as RequestId,
        sessionId: "sess-1" as SessionId,
        turnId: "turn-1" as TurnId,
        turnRevision: 0,
        toolName: "test_tool" as ToolName,
        arguments: { someArg: "val" }, // unknown pre-validation
        contextTimestamp: 123456789,
        idempotencyKey: "idem-key-1" as IdempotencyKey,
        requestMetadata: { origin: "client", retryCount: 0 },
      };

      const toolResult: ToolResultEnvelope = {
        status: "success",
        requestId: "req-1" as RequestId,
        toolName: "test_tool" as ToolName,
        resultValue: { ok: true, nested: { value: 123 } },
        completionTimestamp: 12345,
        warnings: ["test warning"],
      };

      const sessionContract: SessionContract = {
        sessionId: "sess-1" as SessionId,
        state: "listening",
        createdTimestamp: 1000,
        updatedTimestamp: 2000,
        transitionSequence: 1,
        interruptionMetadata: { cause: "user_barge_in" },
      };

      const turnContract: TurnContract = {
        turnId: "turn-1" as TurnId,
        sessionId: "sess-1" as SessionId,
        revision: 2,
        lifecycleState: "interpretation_ready",
        createdTimestamp: 1000,
        updatedTimestamp: 2000,
        operationReferences: [],
        supersessionMetadata: { newerTurnId: "turn-2" },
      };

      const auditEvent: AuditEventBase = {
        auditEventId: "audit-1" as AuditEventId,
        eventType: "tool_execution",
        timestamp: 1234567890,
        actorType: "system",
        outcome: "success",
        metadata: { info: "test", details: { nested: true } },
      };

      const runtimeError: RuntimeErrorContract = {
        code: "invalid_input",
        category: "validation",
        safeMessage: "Bad input",
        recoverable: true,
        retryable: false,
        metadata: { input: "xyz" },
      };

      for (const obj of [
        toolRequest,
        toolResult,
        sessionContract,
        turnContract,
        auditEvent,
        runtimeError,
      ]) {
        const serialized = JSON.stringify(obj);
        const deserialized = JSON.parse(serialized);
        assert.deepEqual(deserialized, obj);
      }
    });

    it("prevents assigning non-JSON values to JSON fields at compile time", () => {
      // @ts-expect-error Functions are not JSON safe
      const err1: JsonValue = () => {};

      // @ts-expect-error Dates are not JSON safe
      const err2: JsonValue = new Date();

      // @ts-expect-error Maps are not JSON safe
      const err3: JsonValue = new Map();

      // @ts-expect-error Sets are not JSON safe
      const err4: JsonValue = new Set();

      // @ts-expect-error undefined is not JSON safe for object values under the updated rule
      const err5: JsonValue = { key: undefined };

      assert.ok(true, "Compile-time checks configured via @ts-expect-error");
    });
  });

  describe("Discriminated Union Constraints", () => {
    it("distinguishes MatchOutcome correctly", () => {
      const matched: MatchOutcome = {
        status: "matched",
        candidate: {
          family: "control",
          action: "stop",
          originalTranscript: "stop",
          normalizedText: "stop",
          matchedSpan: { startIndex: 0, endIndex: 4 },
          confidence: "high",
          clarificationRequired: false,
          confirmationRequired: false,
          requiredContext: [],
        },
      };

      const noMatch: MatchOutcome = {
        status: "no_match",
        reasonCode: "not_found",
        safeMessage: "Could not match command",
      };

      assert.equal(matched.status, "matched");
      assert.equal(noMatch.status, "no_match");
    });

    it("distinguishes ToolResultEnvelope correctly", () => {
      const success: ToolResultEnvelope = {
        status: "success",
        requestId: "req-1" as RequestId,
        toolName: "test_tool" as ToolName,
        resultValue: { ok: true },
        completionTimestamp: 12345,
      };

      const failure: ToolResultEnvelope = {
        status: "failure",
        requestId: "req-1" as RequestId,
        errorCode: "unknown_tool",
        safeMessage: "Failed",
        retryable: false,
        recoverable: false,
      };

      assert.equal(success.status, "success");
      assert.equal(failure.status, "failure");
    });

    it("distinguishes ConfirmationDecision correctly", () => {
      const accepted: ConfirmationDecision = {
        confirmationId: "c-1" as ConfirmationId,
        decision: "accepted",
      };
      const rejected: ConfirmationDecision = {
        confirmationId: "c-1" as ConfirmationId,
        decision: "rejected",
      };
      assert.equal(accepted.decision, "accepted");
      assert.equal(rejected.decision, "rejected");
    });

    it("distinguishes OperationStatus correctly", () => {
      const pending: OperationStatus = "pending";
      const accepted: OperationStatus = "accepted";
      const rejected: OperationStatus = "rejected";
      const invalidated: OperationStatus = "invalidated";
      const canceled: OperationStatus = "canceled";
      const stale: OperationStatus = "stale";
      assert.equal(pending, "pending");
      assert.equal(accepted, "accepted");
    });
  });

  describe("Determinism", () => {
    it("produces deterministic validation results", () => {
      const id = "test-id";
      for (let i = 0; i < 5; i++) {
        assert.equal(isValidIdentifier(id), true);
      }
    });
  });
});
