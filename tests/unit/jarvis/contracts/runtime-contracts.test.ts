import { describe, it, expect } from "vitest";
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
} from "../../../../src/lib/jarvis/contracts/runtime-contracts";

describe("Jarvis Runtime Contracts", () => {
  describe("Version", () => {
    it("exports a stable version string", () => {
      expect(typeof JARVIS_RUNTIME_CONTRACT_VERSION).toBe("string");
      expect(JARVIS_RUNTIME_CONTRACT_VERSION.length).toBeGreaterThan(0);
      expect(JARVIS_RUNTIME_CONTRACT_VERSION).toBe("1.0.0");
    });
  });

  describe("Validation Helpers", () => {
    describe("isValidIdentifier", () => {
      it("accepts valid identifiers", () => {
        expect(isValidIdentifier("session-123")).toBe(true);
        expect(isValidIdentifier("turn_456")).toBe(true);
        expect(isValidIdentifier("uuid-v4-format")).toBe(true);
      });

      it("rejects empty or whitespace-only strings", () => {
        expect(isValidIdentifier("")).toBe(false);
        expect(isValidIdentifier("   ")).toBe(false);
      });

      it("rejects control characters", () => {
        expect(isValidIdentifier("invalid\nid")).toBe(false);
        expect(isValidIdentifier("invalid\tid")).toBe(false);
        expect(isValidIdentifier("invalid\u0000id")).toBe(false);
      });

      it("rejects excessively long identifiers", () => {
        const longId = "a".repeat(257);
        expect(isValidIdentifier(longId)).toBe(false);
      });

      it("rejects non-strings", () => {
        expect(isValidIdentifier(null)).toBe(false);
        expect(isValidIdentifier(undefined)).toBe(false);
        // @ts-expect-error Testing invalid runtime input
        expect(isValidIdentifier(123)).toBe(false);
      });
    });

    describe("isValidSourceSpan", () => {
      it("accepts a valid span", () => {
        expect(isValidSourceSpan({ startIndex: 0, endIndex: 5 })).toBe(true);
        expect(isValidSourceSpan({ startIndex: 10, endIndex: 15, originalText: "hello" })).toBe(
          true,
        );
      });

      it("accepts zero-length spans", () => {
        expect(isValidSourceSpan({ startIndex: 5, endIndex: 5 })).toBe(true);
      });

      it("rejects negative start index", () => {
        expect(isValidSourceSpan({ startIndex: -1, endIndex: 5 })).toBe(false);
      });

      it("rejects end index before start index", () => {
        expect(isValidSourceSpan({ startIndex: 5, endIndex: 4 })).toBe(false);
      });

      it("rejects non-integer indexes", () => {
        expect(isValidSourceSpan({ startIndex: 1.5, endIndex: 5 })).toBe(false);
      });

      it("rejects values beyond safe integer limits", () => {
        expect(
          isValidSourceSpan({
            startIndex: Number.MAX_SAFE_INTEGER + 1,
            endIndex: Number.MAX_SAFE_INTEGER + 2,
          }),
        ).toBe(false);
      });
    });

    describe("isValidRevision", () => {
      it("accepts zero", () => {
        expect(isValidRevision(0)).toBe(true);
      });

      it("accepts positive safe integers", () => {
        expect(isValidRevision(1)).toBe(true);
        expect(isValidRevision(100)).toBe(true);
      });

      it("rejects negative numbers", () => {
        expect(isValidRevision(-1)).toBe(false);
      });

      it("rejects decimals", () => {
        expect(isValidRevision(1.5)).toBe(false);
      });

      it("rejects unsafe integers", () => {
        expect(isValidRevision(Number.MAX_SAFE_INTEGER + 1)).toBe(false);
      });

      it("rejects string coercion", () => {
        // @ts-expect-error Testing runtime behavior
        expect(isValidRevision("1")).toBe(false);
      });
    });

    describe("Risk & Terminal State Helpers", () => {
      it("correctly identifies confirmation requirements", () => {
        expect(requiresConfirmation("read_only")).toBe(false);
        expect(requiresConfirmation("low_risk_reversible_write")).toBe(false);
        expect(requiresConfirmation("confirmation_sensitive_write")).toBe(true);
        expect(requiresConfirmation("destructive_action")).toBe(true);
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
        activeStates.forEach((state) => expect(isTerminalSessionState(state)).toBe(false));

        const terminalStates: SessionStateName[] = ["completed", "canceled", "expired", "failed"];
        terminalStates.forEach((state) => expect(isTerminalSessionState(state)).toBe(true));
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
        activeStates.forEach((state) => expect(isTerminalTurnState(state)).toBe(false));

        const terminalStates: TurnLifecycleState[] = [
          "superseded",
          "canceled",
          "completed",
          "failed",
        ];
        terminalStates.forEach((state) => expect(isTerminalTurnState(state)).toBe(true));
      });
    });
  });

  describe("Serialization", () => {
    it("can be JSON serialized without losing fields", () => {
      const span: SourceSpan = { startIndex: 0, endIndex: 5, originalText: "hello" };
      const serialized = JSON.stringify(span);
      const deserialized = JSON.parse(serialized);
      expect(deserialized).toEqual(span);
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

      expect(matched.status).toBe("matched");
      expect(noMatch.status).toBe("no_match");
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
        errorCode: "error_1",
        safeMessage: "Failed",
        retryable: false,
        recoverable: false,
      };

      expect(success.status).toBe("success");
      expect(failure.status).toBe("failure");
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
      expect(accepted.decision).toBe("accepted");
      expect(rejected.decision).toBe("rejected");
    });

    it("distinguishes OperationStatus correctly", () => {
      const pending: OperationStatus = "pending";
      const accepted: OperationStatus = "accepted";
      const rejected: OperationStatus = "rejected";
      const invalidated: OperationStatus = "invalidated";
      const canceled: OperationStatus = "canceled";
      const stale: OperationStatus = "stale";
      expect(pending).toBe("pending");
      expect(accepted).toBe("accepted");
    });
  });

  describe("Determinism", () => {
    it("produces deterministic validation results", () => {
      const id = "test-id";
      for (let i = 0; i < 5; i++) {
        expect(isValidIdentifier(id)).toBe(true);
      }
    });
  });
});
