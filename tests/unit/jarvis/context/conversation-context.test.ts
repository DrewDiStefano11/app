import { describe, it } from "node:test";
import * as assert from "node:assert/strict";
import {
  projectConversationContext,
  getLatestAssistantMessage,
  getLatestUserMessage,
  type ConversationContextItem,
  type ConversationContextLimits,
} from "../../../../src/lib/jarvis/context/conversation-context";
import type { SessionId, TurnId } from "../../../../src/lib/jarvis/contracts/runtime-contracts";

const SESSION_ID = "session-1" as SessionId;
const TURN_1 = "turn-1" as TurnId;
const TURN_2 = "turn-2" as TurnId;
const TURN_3 = "turn-3" as TurnId;

const DEFAULT_LIMITS: ConversationContextLimits = {
  maxContentCharacters: 100000,
  maxItems: 500,
  maxRecentTurns: 100,
};

let itemIdCounter = 0;

function createItem(overrides: Partial<ConversationContextItem>): ConversationContextItem {
  itemIdCounter++;
  return {
    itemId: overrides.itemId ?? `item-${itemIdCounter}`,
    sessionId: overrides.sessionId ?? SESSION_ID,
    turnId: overrides.turnId,
    sequence: overrides.sequence ?? 1,
    kind: overrides.kind ?? "user_message",
    text: overrides.text ?? "Test message",
    metadata: overrides.metadata,
  };
}

describe("Conversation Context Projection", () => {
  describe("Initial and empty projection tests", () => {
    it("handles an empty item array", () => {
      const result = projectConversationContext({
        sessionId: SESSION_ID,
        items: [],
        limits: DEFAULT_LIMITS,
      });

      assert.equal(result.status, "projected");
      if (result.status === "projected") {
        assert.deepEqual(result.context.items, []);
        assert.deepEqual(result.context.includedItemIds, []);
        assert.deepEqual(result.context.omittedItemIds, []);
        assert.equal(result.context.contentCharacters, 0);
        assert.equal(result.context.includedTurnCount, 0);
        assert.equal(result.context.truncated, false);
        assert.deepEqual(result.context.warnings, ["empty_context"]);
        assert.equal(result.context.projectionVersion, "conversation-context-v1");
      }
    });

    it("handles zero limits with empty context", () => {
      const result = projectConversationContext({
        sessionId: SESSION_ID,
        items: [],
        limits: { maxContentCharacters: 0, maxItems: 0, maxRecentTurns: 0 },
      });

      assert.equal(result.status, "projected");
      if (result.status === "projected") {
        assert.deepEqual(result.context.warnings, ["empty_context"]);
      }
    });

    it("returns independently constructed arrays", () => {
      const items: ConversationContextItem[] = [];
      const result = projectConversationContext({
        sessionId: SESSION_ID,
        items,
        limits: DEFAULT_LIMITS,
      });

      if (result.status === "projected") {
        assert.notStrictEqual(result.context.items, items);
      }
    });
  });

  describe("Basic full-context projection", () => {
    it("selects all items and preserves order", () => {
      const items = [
        createItem({ itemId: "s1", kind: "session_summary", sequence: 1 }),
        createItem({ itemId: "a1", kind: "active_context", sequence: 2 }),
        createItem({ itemId: "a2", kind: "active_context", sequence: 3 }),
        createItem({ itemId: "u1", kind: "user_message", turnId: TURN_1, sequence: 4 }),
        createItem({ itemId: "m1", kind: "assistant_message", turnId: TURN_1, sequence: 5 }),
        createItem({ itemId: "u2", kind: "user_message", turnId: TURN_2, sequence: 6 }),
        createItem({ itemId: "m2", kind: "assistant_message", turnId: TURN_2, sequence: 7 }),
        createItem({ itemId: "u3", kind: "user_message", turnId: TURN_3, sequence: 8 }),
        createItem({ itemId: "m3", kind: "assistant_message", turnId: TURN_3, sequence: 9 }),
        createItem({ itemId: "c1", kind: "pending_clarification", sequence: 10 }),
        createItem({ itemId: "c2", kind: "pending_confirmation", sequence: 11 }),
      ];

      const result = projectConversationContext({
        sessionId: SESSION_ID,
        items,
        limits: DEFAULT_LIMITS,
      });

      assert.equal(result.status, "projected");
      if (result.status === "projected") {
        assert.equal(result.context.items.length, 11);
        assert.deepEqual(
          result.context.includedItemIds,
          items.map((i) => i.itemId),
        );
        assert.deepEqual(result.context.omittedItemIds, []);
        assert.deepEqual(result.context.includedTurnIds, [TURN_1, TURN_2, TURN_3]);
        assert.equal(result.context.truncated, false);
        assert.deepEqual(result.context.warnings, []);
        assert.equal(
          result.context.contentCharacters,
          items.reduce((sum, i) => sum + i.text.length, 0),
        );
      }
    });
  });

  describe("Character accounting", () => {
    it("counts UTF-16 code units", () => {
      const text = "ASCII 🌟👨‍👩‍👧‍👦 \r\n\t\u00A0";
      const item = createItem({
        itemId: "u1",
        kind: "user_message",
        turnId: TURN_1,
        sequence: 1,
        text,
      });

      const result = projectConversationContext({
        sessionId: SESSION_ID,
        items: [item],
        limits: DEFAULT_LIMITS,
      });

      assert.equal(result.status, "projected");
      if (result.status === "projected") {
        assert.equal(result.context.contentCharacters, text.length);
        assert.equal(result.context.items[0].text, text);
      }
    });
  });
  describe("Item validation", () => {
    it("rejects invalid item IDs", () => {
      const cases = ["", "   ", "a".repeat(129)];
      for (const itemId of cases) {
        const result = projectConversationContext({
          sessionId: SESSION_ID,
          items: [createItem({ itemId, sequence: 1 })],
          limits: DEFAULT_LIMITS,
        });
        assert.equal(result.status, "invalid_input");
        if (result.status === "invalid_input") {
          assert.equal(result.reasonCode, "invalid_item_id");
        }
      }
    });

    it("rejects unknown runtime item kind", () => {
      const result = projectConversationContext({
        sessionId: SESSION_ID,
        items: [createItem({ kind: "unknown_kind" as any, sequence: 1, turnId: TURN_1 })],
        limits: DEFAULT_LIMITS,
      });
      assert.equal(result.status, "invalid_input");
      if (result.status === "invalid_input") {
        assert.equal(result.reasonCode, "invalid_item_kind");
      }
    });

    it("rejects duplicate item IDs", () => {
      const result = projectConversationContext({
        sessionId: SESSION_ID,
        items: [
          createItem({ itemId: "id1", sequence: 1, turnId: TURN_1 }),
          createItem({ itemId: "id1", sequence: 2, turnId: TURN_1 }),
        ],
        limits: DEFAULT_LIMITS,
      });
      assert.equal(result.status, "invalid_input");
      if (result.status === "invalid_input") {
        assert.equal(result.reasonCode, "duplicate_item_id");
      }
    });

    it("allows case-sensitive distinct item IDs", () => {
      const result = projectConversationContext({
        sessionId: SESSION_ID,
        items: [
          createItem({ itemId: "id1", sequence: 1, turnId: TURN_1 }),
          createItem({ itemId: "ID1", sequence: 2, turnId: TURN_1 }),
        ],
        limits: DEFAULT_LIMITS,
      });
      assert.equal(result.status, "projected");
    });

    it("rejects invalid text", () => {
      const cases = ["", "   ", "a".repeat(16385)];
      for (const text of cases) {
        const result = projectConversationContext({
          sessionId: SESSION_ID,
          items: [createItem({ text, sequence: 1, turnId: TURN_1 })],
          limits: DEFAULT_LIMITS,
        });
        assert.equal(result.status, "invalid_input");
        if (result.status === "invalid_input") {
          assert.equal(result.reasonCode, "invalid_item_text");
        }
      }
    });

    it("rejects invalid sequences", () => {
      const cases = [0, -1, 1.5, Number.MAX_SAFE_INTEGER + 1];
      for (const sequence of cases) {
        const result = projectConversationContext({
          sessionId: SESSION_ID,
          items: [createItem({ sequence, turnId: TURN_1 })],
          limits: DEFAULT_LIMITS,
        });
        assert.equal(result.status, "invalid_input");
        if (result.status === "invalid_input") {
          assert.equal(result.reasonCode, "invalid_item_sequence");
        }
      }
    });

    it("rejects duplicate sequences", () => {
      const result = projectConversationContext({
        sessionId: SESSION_ID,
        items: [
          createItem({ itemId: "id1", sequence: 1, turnId: TURN_1 }),
          createItem({ itemId: "id2", sequence: 1, turnId: TURN_1 }),
        ],
        limits: DEFAULT_LIMITS,
      });
      assert.equal(result.status, "invalid_input");
      if (result.status === "invalid_input") {
        assert.equal(result.reasonCode, "duplicate_sequence");
      }
    });

    it("rejects mismatched session", () => {
      const result = projectConversationContext({
        sessionId: SESSION_ID,
        items: [
          createItem({ sessionId: "other-session" as SessionId, sequence: 1, turnId: TURN_1 }),
        ],
        limits: DEFAULT_LIMITS,
      });
      assert.equal(result.status, "invalid_input");
      if (result.status === "invalid_input") {
        assert.equal(result.reasonCode, "session_mismatch");
      }
    });

    it("rejects missing required turn ID", () => {
      const kinds: ConversationContextItem["kind"][] = [
        "user_message",
        "assistant_message",
        "tool_result_summary",
      ];
      for (const kind of kinds) {
        const result = projectConversationContext({
          sessionId: SESSION_ID,
          items: [createItem({ kind, sequence: 1, turnId: undefined })],
          limits: DEFAULT_LIMITS,
        });
        assert.equal(result.status, "invalid_input");
        if (result.status === "invalid_input") {
          assert.equal(result.reasonCode, "missing_turn_id");
        }
      }
    });

    it("allows standalone items without turn IDs", () => {
      const kinds: ConversationContextItem["kind"][] = [
        "session_summary",
        "active_context",
        "pending_clarification",
        "pending_confirmation",
      ];
      for (const kind of kinds) {
        const result = projectConversationContext({
          sessionId: SESSION_ID,
          items: [createItem({ kind, sequence: 1, turnId: undefined })],
          limits: DEFAULT_LIMITS,
        });
        assert.equal(result.status, "projected");
      }
    });
  });

  describe("Cardinality validation", () => {
    it("rejects two session summaries", () => {
      const result = projectConversationContext({
        sessionId: SESSION_ID,
        items: [
          createItem({ itemId: "id1", kind: "session_summary", sequence: 1 }),
          createItem({ itemId: "id2", kind: "session_summary", sequence: 2 }),
        ],
        limits: DEFAULT_LIMITS,
      });
      assert.equal(result.status, "invalid_input");
      if (result.status === "invalid_input") {
        assert.equal(result.reasonCode, "multiple_session_summaries");
      }
    });

    it("rejects two pending clarifications", () => {
      const result = projectConversationContext({
        sessionId: SESSION_ID,
        items: [
          createItem({ itemId: "id1", kind: "pending_clarification", sequence: 1 }),
          createItem({ itemId: "id2", kind: "pending_clarification", sequence: 2 }),
        ],
        limits: DEFAULT_LIMITS,
      });
      assert.equal(result.status, "invalid_input");
      if (result.status === "invalid_input") {
        assert.equal(result.reasonCode, "multiple_pending_clarifications");
      }
    });

    it("rejects two pending confirmations", () => {
      const result = projectConversationContext({
        sessionId: SESSION_ID,
        items: [
          createItem({ itemId: "id1", kind: "pending_confirmation", sequence: 1 }),
          createItem({ itemId: "id2", kind: "pending_confirmation", sequence: 2 }),
        ],
        limits: DEFAULT_LIMITS,
      });
      assert.equal(result.status, "invalid_input");
      if (result.status === "invalid_input") {
        assert.equal(result.reasonCode, "multiple_pending_confirmations");
      }
    });

    it("allows multiple active-context items", () => {
      const result = projectConversationContext({
        sessionId: SESSION_ID,
        items: [
          createItem({ itemId: "id1", kind: "active_context", sequence: 1 }),
          createItem({ itemId: "id2", kind: "active_context", sequence: 2 }),
        ],
        limits: DEFAULT_LIMITS,
      });
      assert.equal(result.status, "projected");
    });
  });

  describe("Limit validation", () => {
    it("rejects invalid limits", () => {
      const invalidLimits: ConversationContextLimits[] = [
        { maxContentCharacters: -1, maxItems: 10, maxRecentTurns: 10 },
        { maxContentCharacters: 10, maxItems: -1, maxRecentTurns: 10 },
        { maxContentCharacters: 10, maxItems: 10, maxRecentTurns: -1 },
        { maxContentCharacters: 1.5, maxItems: 10, maxRecentTurns: 10 },
        { maxContentCharacters: 10, maxItems: 1.5, maxRecentTurns: 10 },
        { maxContentCharacters: 10, maxItems: 10, maxRecentTurns: 1.5 },
        { maxContentCharacters: Number.MAX_SAFE_INTEGER + 1, maxItems: 10, maxRecentTurns: 10 },
        { maxContentCharacters: 100001, maxItems: 10, maxRecentTurns: 10 },
        { maxContentCharacters: 10, maxItems: 501, maxRecentTurns: 10 },
        { maxContentCharacters: 10, maxItems: 10, maxRecentTurns: 101 },
      ];

      for (const limits of invalidLimits) {
        const result = projectConversationContext({
          sessionId: SESSION_ID,
          items: [],
          limits,
        });
        assert.equal(result.status, "invalid_input");
        if (result.status === "invalid_input") {
          assert.equal(result.reasonCode, "invalid_limits");
        }
      }
    });

    it("allows zero and maximum boundary limits", () => {
      const validLimits: ConversationContextLimits[] = [
        { maxContentCharacters: 0, maxItems: 0, maxRecentTurns: 0 },
        { maxContentCharacters: 100000, maxItems: 500, maxRecentTurns: 100 },
      ];

      for (const limits of validLimits) {
        const result = projectConversationContext({
          sessionId: SESSION_ID,
          items: [],
          limits,
        });
        assert.equal(result.status, "projected");
      }
    });
  });

  describe("Required-context budget", () => {
    it("fails when required items exceed character budget", () => {
      const items = [
        createItem({ kind: "active_context", sequence: 1, text: "A".repeat(60) }),
        createItem({ kind: "pending_confirmation", sequence: 2, text: "B".repeat(50) }),
      ];

      const result = projectConversationContext({
        sessionId: SESSION_ID,
        items,
        limits: { maxContentCharacters: 100, maxItems: 10, maxRecentTurns: 10 },
      });

      assert.equal(result.status, "insufficient_budget");
      if (result.status === "insufficient_budget") {
        assert.equal(result.reasonCode, "required_context_exceeds_budget");
        assert.equal(result.requiredCharacters, 110);
        assert.equal(result.requiredItems, 2);
      }
    });

    it("fails when required items exceed item budget", () => {
      const items = [
        createItem({ kind: "active_context", sequence: 1 }),
        createItem({ kind: "active_context", sequence: 2 }),
        createItem({ kind: "pending_confirmation", sequence: 3 }),
      ];

      const result = projectConversationContext({
        sessionId: SESSION_ID,
        items,
        limits: { maxContentCharacters: 1000, maxItems: 2, maxRecentTurns: 10 },
      });

      assert.equal(result.status, "insufficient_budget");
      if (result.status === "insufficient_budget") {
        assert.equal(result.requiredItems, 3);
      }
    });

    it("does not count session summary or history as required", () => {
      const items = [
        createItem({ kind: "session_summary", sequence: 1, text: "A".repeat(100) }),
        createItem({ kind: "user_message", turnId: TURN_1, sequence: 2, text: "B".repeat(100) }),
      ];

      const result = projectConversationContext({
        sessionId: SESSION_ID,
        items,
        limits: { maxContentCharacters: 50, maxItems: 1, maxRecentTurns: 10 },
      });

      assert.equal(result.status, "projected");
    });
  });
  describe("Turn grouping and atomic turn behavior", () => {
    it("groups turns correctly and uses earliest sequence for chronology", () => {
      const items = [
        createItem({ itemId: "m1", kind: "assistant_message", turnId: TURN_2, sequence: 3 }),
        createItem({ itemId: "u1", kind: "user_message", turnId: TURN_1, sequence: 1 }),
        createItem({ itemId: "m2", kind: "assistant_message", turnId: TURN_2, sequence: 4 }),
        createItem({ itemId: "s1", kind: "tool_result_summary", turnId: TURN_1, sequence: 2 }),
      ];

      const result = projectConversationContext({
        sessionId: SESSION_ID,
        items,
        limits: DEFAULT_LIMITS,
      });

      assert.equal(result.status, "projected");
      if (result.status === "projected") {
        assert.deepEqual(result.context.includedTurnIds, [TURN_1, TURN_2]);
        assert.equal(result.context.items[0].itemId, "u1");
        assert.equal(result.context.items[1].itemId, "s1");
        assert.equal(result.context.items[2].itemId, "m1");
        assert.equal(result.context.items[3].itemId, "m2");
      }
    });

    it("omits the entire turn if it doesn't fit", () => {
      const items = [
        createItem({
          itemId: "u1",
          kind: "user_message",
          turnId: TURN_1,
          sequence: 1,
          text: "A".repeat(50),
        }),
        createItem({
          itemId: "m1",
          kind: "assistant_message",
          turnId: TURN_1,
          sequence: 2,
          text: "B".repeat(60),
        }),
      ];

      const result = projectConversationContext({
        sessionId: SESSION_ID,
        items,
        limits: { maxContentCharacters: 100, maxItems: 10, maxRecentTurns: 10 },
      });

      assert.equal(result.status, "projected");
      if (result.status === "projected") {
        assert.deepEqual(result.context.items, []);
        assert.deepEqual(result.context.includedTurnIds, []);
        assert.deepEqual(result.context.omittedTurnIds, [TURN_1]);
        assert.equal(result.context.truncated, true);
        assert.deepEqual(result.context.warnings, [
          "history_limited_by_character_budget",
          "latest_turn_exceeds_available_budget",
          "empty_context",
        ]);
      }
    });
  });

  describe("Recent contiguous suffix", () => {
    it("selects contiguous newest turns and stops at first failure", () => {
      const turn1 = [createItem({ turnId: TURN_1, sequence: 1, text: "A".repeat(10) })];
      const turn2 = [createItem({ turnId: TURN_2, sequence: 2, text: "B".repeat(10) })];
      const turn3 = [createItem({ turnId: TURN_3, sequence: 3, text: "C".repeat(100) })]; // Doesn't fit
      const turn4 = [createItem({ turnId: "turn-4" as TurnId, sequence: 4, text: "D".repeat(10) })]; // Fits
      const turn5 = [createItem({ turnId: "turn-5" as TurnId, sequence: 5, text: "E".repeat(10) })]; // Fits

      const items = [...turn1, ...turn2, ...turn3, ...turn4, ...turn5];

      const result = projectConversationContext({
        sessionId: SESSION_ID,
        items,
        limits: { maxContentCharacters: 50, maxItems: 10, maxRecentTurns: 10 },
      });

      assert.equal(result.status, "projected");
      if (result.status === "projected") {
        assert.deepEqual(result.context.includedTurnIds, ["turn-4" as TurnId, "turn-5" as TurnId]);
        assert.deepEqual(result.context.omittedTurnIds, [TURN_1, TURN_2, TURN_3]);
        assert.equal(result.context.warnings.includes("history_limited_by_character_budget"), true);
      }
    });
  });

  describe("Latest-turn overflow", () => {
    it("omits history if the newest turn does not fit, preserving standalone context", () => {
      const active = createItem({ kind: "active_context", sequence: 1, text: "Active" });
      const turn1 = createItem({ turnId: TURN_1, sequence: 2, text: "Old" });
      const turn2 = createItem({ turnId: TURN_2, sequence: 3, text: "Newest, too big for limit" });

      const items = [active, turn1, turn2];

      const result = projectConversationContext({
        sessionId: SESSION_ID,
        items,
        limits: { maxContentCharacters: 20, maxItems: 10, maxRecentTurns: 10 },
      });

      assert.equal(result.status, "projected");
      if (result.status === "projected") {
        assert.equal(result.context.items.length, 1);
        assert.equal(result.context.items[0].itemId, active.itemId);
        assert.deepEqual(result.context.includedTurnIds, []);
        assert.deepEqual(result.context.omittedTurnIds, [TURN_1, TURN_2]);
        assert.deepEqual(result.context.warnings, [
          "history_limited_by_character_budget",
          "latest_turn_exceeds_available_budget",
        ]);
      }
    });
  });

  describe("Recent-turn-count limit", () => {
    it("limits by maxRecentTurns", () => {
      const items = [
        createItem({ turnId: TURN_1, sequence: 1 }),
        createItem({ turnId: TURN_2, sequence: 2 }),
        createItem({ turnId: TURN_3, sequence: 3 }),
        createItem({ turnId: "turn-4" as TurnId, sequence: 4 }),
        createItem({ turnId: "turn-5" as TurnId, sequence: 5 }),
      ];

      const result = projectConversationContext({
        sessionId: SESSION_ID,
        items,
        limits: { maxContentCharacters: 1000, maxItems: 100, maxRecentTurns: 2 },
      });

      assert.equal(result.status, "projected");
      if (result.status === "projected") {
        assert.deepEqual(result.context.includedTurnIds, ["turn-4" as TurnId, "turn-5" as TurnId]);
        assert.deepEqual(result.context.omittedTurnIds, [TURN_1, TURN_2, TURN_3]);
        assert.deepEqual(result.context.warnings, ["history_limited_by_turn_count"]);
      }
    });

    it("handles maxRecentTurns: 0", () => {
      const items = [createItem({ turnId: TURN_1, sequence: 1 })];

      const result = projectConversationContext({
        sessionId: SESSION_ID,
        items,
        limits: { maxContentCharacters: 1000, maxItems: 100, maxRecentTurns: 0 },
      });

      assert.equal(result.status, "projected");
      if (result.status === "projected") {
        assert.deepEqual(result.context.includedTurnIds, []);
        assert.deepEqual(result.context.warnings, [
          "history_limited_by_turn_count",
          "empty_context",
        ]);
      }
    });
  });
  describe("Character and Item Budget limits", () => {
    it("stops selecting turns if character budget is reached", () => {
      const items = [
        createItem({ turnId: TURN_1, sequence: 1, text: "A".repeat(50) }),
        createItem({ turnId: TURN_2, sequence: 2, text: "B".repeat(60) }), // Together > 100
      ];

      const result = projectConversationContext({
        sessionId: SESSION_ID,
        items,
        limits: { maxContentCharacters: 100, maxItems: 10, maxRecentTurns: 10 },
      });

      assert.equal(result.status, "projected");
      if (result.status === "projected") {
        assert.deepEqual(result.context.includedTurnIds, [TURN_2]);
        assert.deepEqual(result.context.omittedTurnIds, [TURN_1]);
        assert.deepEqual(result.context.warnings, ["history_limited_by_character_budget"]);
      }
    });

    it("stops selecting turns if item budget is reached", () => {
      const items = [
        createItem({ turnId: TURN_1, sequence: 1 }),
        createItem({ turnId: TURN_2, sequence: 2 }), // Total items = 2
      ];

      const result = projectConversationContext({
        sessionId: SESSION_ID,
        items,
        limits: { maxContentCharacters: 100, maxItems: 1, maxRecentTurns: 10 },
      });

      assert.equal(result.status, "projected");
      if (result.status === "projected") {
        assert.deepEqual(result.context.includedTurnIds, [TURN_2]);
        assert.deepEqual(result.context.omittedTurnIds, [TURN_1]);
        assert.deepEqual(result.context.warnings, ["history_limited_by_item_budget"]);
      }
    });

    it("evaluates budgets independently and correctly handles combinations", () => {
      const turn1 = createItem({ turnId: TURN_1, sequence: 1, text: "A" }); // 1 item, 1 char
      const turn2 = createItem({ turnId: TURN_2, sequence: 2, text: "B".repeat(50) }); // 1 item, 50 chars
      const turn3 = createItem({ turnId: TURN_3, sequence: 3, text: "C" }); // 1 item, 1 char

      // Limit: 55 chars, 2 items
      // newest is turn3 (1 char, 1 item -> remaining 54 chars, 1 item)
      // next is turn2 (50 chars, 1 item -> remaining 4 chars, 0 items)
      // next is turn1 (1 char, 1 item -> item budget exceeded)
      const result = projectConversationContext({
        sessionId: SESSION_ID,
        items: [turn1, turn2, turn3],
        limits: { maxContentCharacters: 55, maxItems: 2, maxRecentTurns: 10 },
      });

      assert.equal(result.status, "projected");
      if (result.status === "projected") {
        assert.deepEqual(result.context.includedTurnIds, [TURN_2, TURN_3]);
        assert.deepEqual(result.context.omittedTurnIds, [TURN_1]);
        assert.deepEqual(result.context.warnings, ["history_limited_by_item_budget"]);
      }
    });
  });

  describe("Session Summary priority and Required Output order", () => {
    it("includes session summary if space remains and places it first", () => {
      const summary = createItem({ kind: "session_summary", sequence: 1, text: "Summary" });
      const active = createItem({ kind: "active_context", sequence: 2, text: "Active" });
      const msg = createItem({ kind: "user_message", turnId: TURN_1, sequence: 3, text: "Msg" });
      const clar = createItem({ kind: "pending_clarification", sequence: 4, text: "Clarify" });
      const conf = createItem({ kind: "pending_confirmation", sequence: 5, text: "Confirm" });

      // Deliberately scrambled array order
      const items = [conf, msg, summary, active, clar];

      const result = projectConversationContext({
        sessionId: SESSION_ID,
        items,
        limits: { maxContentCharacters: 1000, maxItems: 10, maxRecentTurns: 10 },
      });

      assert.equal(result.status, "projected");
      if (result.status === "projected") {
        assert.equal(result.context.items[0].itemId, summary.itemId);
        assert.equal(result.context.items[1].itemId, active.itemId);
        assert.equal(result.context.items[2].itemId, msg.itemId);
        assert.equal(result.context.items[3].itemId, clar.itemId);
        assert.equal(result.context.items[4].itemId, conf.itemId);
      }
    });

    it("omits session summary if it does not fit, without evicting recent turns", () => {
      const summary = createItem({
        kind: "session_summary",
        sequence: 1,
        text: "Summary".repeat(10),
      });
      const msg = createItem({
        kind: "user_message",
        turnId: TURN_1,
        sequence: 2,
        text: "Small Msg",
      });

      const result = projectConversationContext({
        sessionId: SESSION_ID,
        items: [summary, msg],
        limits: { maxContentCharacters: 20, maxItems: 10, maxRecentTurns: 10 }, // Msg fits, summary does not
      });

      assert.equal(result.status, "projected");
      if (result.status === "projected") {
        assert.equal(result.context.items.length, 1);
        assert.equal(result.context.items[0].itemId, msg.itemId);
        assert.deepEqual(result.context.warnings, ["session_summary_omitted"]);
      }
    });
  });
  describe("Included and Omitted Arrays", () => {
    it("matches projected items and omitted items exactly", () => {
      const items = [
        createItem({ turnId: TURN_1, sequence: 1 }),
        createItem({ turnId: TURN_2, sequence: 2, text: "A".repeat(100) }), // omitted
        createItem({ turnId: TURN_3, sequence: 3 }),
      ];

      const result = projectConversationContext({
        sessionId: SESSION_ID,
        items,
        limits: { maxContentCharacters: 50, maxItems: 10, maxRecentTurns: 10 },
      });

      assert.equal(result.status, "projected");
      if (result.status === "projected") {
        assert.deepEqual(result.context.includedItemIds, [items[2].itemId]);
        assert.deepEqual(result.context.omittedItemIds, [items[0].itemId, items[1].itemId]);
        assert.deepEqual(result.context.includedTurnIds, [TURN_3]);
        assert.deepEqual(result.context.omittedTurnIds, [TURN_1, TURN_2]);
      }
    });
  });

  describe("Truncated flag", () => {
    it("is true only when valid items are omitted", () => {
      const items = [createItem({ turnId: TURN_1, sequence: 1 })];

      const r1 = projectConversationContext({
        sessionId: SESSION_ID,
        items,
        limits: DEFAULT_LIMITS,
      });
      assert.equal(r1.status, "projected");
      if (r1.status === "projected") assert.equal(r1.context.truncated, false);

      const r2 = projectConversationContext({
        sessionId: SESSION_ID,
        items,
        limits: { maxContentCharacters: 0, maxItems: 0, maxRecentTurns: 0 },
      });
      assert.equal(r2.status, "projected");
      if (r2.status === "projected") assert.equal(r2.context.truncated, true);
    });
  });

  describe("Warning generation and ordering", () => {
    it("generates warnings in the correct deterministic order", () => {
      const turn1 = createItem({ turnId: TURN_1, sequence: 1, text: "A" });
      const turn2 = createItem({ turnId: TURN_2, sequence: 2, text: "B".repeat(50) }); // Fails character budget
      const summary = createItem({ kind: "session_summary", sequence: 3, text: "C".repeat(100) }); // Fails character budget

      const result = projectConversationContext({
        sessionId: SESSION_ID,
        items: [turn1, turn2, summary],
        limits: { maxContentCharacters: 10, maxItems: 10, maxRecentTurns: 10 },
      });

      assert.equal(result.status, "projected");
      if (result.status === "projected") {
        assert.deepEqual(result.context.warnings, [
          "history_limited_by_character_budget",
          "latest_turn_exceeds_available_budget",
          "session_summary_omitted",
          "empty_context",
        ]);
      }
    });
  });

  describe("Metadata preservation", () => {
    it("preserves optional metadata exactly and does not count it towards size", () => {
      const metadata = { foo: "bar", nested: { val: 42 } };
      const item = createItem({ turnId: TURN_1, sequence: 1, metadata, text: "A" });

      const result = projectConversationContext({
        sessionId: SESSION_ID,
        items: [item],
        limits: { maxContentCharacters: 10, maxItems: 10, maxRecentTurns: 10 },
      });

      assert.equal(result.status, "projected");
      if (result.status === "projected") {
        assert.deepEqual(result.context.items[0].metadata, metadata);
        assert.equal(result.context.contentCharacters, 1);
      }
    });
  });

  describe("Latest message helpers", () => {
    it("getLatestAssistantMessage finds the correct item", () => {
      const items = [
        createItem({ kind: "user_message", sequence: 1 }),
        createItem({ kind: "assistant_message", sequence: 2, text: "Old" }),
        createItem({
          kind: "assistant_message",
          sequence: 3,
          text: "New",
          sessionId: "session-2" as SessionId,
        }),
      ];

      const msg1 = getLatestAssistantMessage(items);
      assert.equal(msg1?.text, "New");

      const msg2 = getLatestAssistantMessage(items, SESSION_ID);
      assert.equal(msg2?.text, "Old");

      const msg3 = getLatestAssistantMessage([], SESSION_ID);
      assert.equal(msg3, undefined);
    });

    it("getLatestUserMessage finds the correct item", () => {
      const items = [
        createItem({ kind: "assistant_message", sequence: 1 }),
        createItem({ kind: "user_message", sequence: 2, text: "Old" }),
        createItem({
          kind: "user_message",
          sequence: 3,
          text: "New",
          sessionId: "session-2" as SessionId,
        }),
      ];

      const msg1 = getLatestUserMessage(items);
      assert.equal(msg1?.text, "New");

      const msg2 = getLatestUserMessage(items, SESSION_ID);
      assert.equal(msg2?.text, "Old");
    });
  });

  describe("Immutability", () => {
    it("does not mutate inputs", () => {
      const item = createItem({ turnId: TURN_1, sequence: 1 });
      const items = Object.freeze([Object.freeze(item)]);
      const limits = Object.freeze({ ...DEFAULT_LIMITS });
      const input = Object.freeze({ sessionId: SESSION_ID, items, limits });

      const result = projectConversationContext(input);
      assert.equal(result.status, "projected");
    });

    it("isolates original items from mutation", () => {
      const item = createItem({ turnId: TURN_1, sequence: 1, text: "Original" });
      const result = projectConversationContext({
        sessionId: SESSION_ID,
        items: [item],
        limits: DEFAULT_LIMITS,
      });

      assert.equal(result.status, "projected");

      // Mutate the original item
      (item as any).text = "Mutated";

      if (result.status === "projected") {
        assert.equal(result.context.items[0].text, "Original");
        assert.notEqual(result.context.items[0], item); // Must not be the exact same object reference
      }
    });

    it("isolates nested original metadata from mutation", () => {
      const originalMetadata = { nested: { count: 1 } };
      const item = createItem({ turnId: TURN_1, sequence: 1, metadata: originalMetadata });

      const result = projectConversationContext({
        sessionId: SESSION_ID,
        items: [item],
        limits: DEFAULT_LIMITS,
      });

      assert.equal(result.status, "projected");

      // Mutate the original nested metadata
      originalMetadata.nested.count = 2;

      if (result.status === "projected") {
        const returnedMetadata = result.context.items[0].metadata as any;
        assert.equal(returnedMetadata.nested.count, 1);
        assert.notEqual(returnedMetadata.nested, originalMetadata.nested); // Must not share references
      }
    });

    it("returns isolated arrays and frozen nested metadata", () => {
      const originalMetadata = { arr: [1, 2] };
      const item = createItem({ turnId: TURN_1, sequence: 1, metadata: originalMetadata });
      const itemsArray = [item];

      const result = projectConversationContext({
        sessionId: SESSION_ID,
        items: itemsArray,
        limits: DEFAULT_LIMITS,
      });

      assert.equal(result.status, "projected");

      if (result.status === "projected") {
        // Returned arrays should be frozen (strict mode makes this throw, but node:assert/strict handles it nicely with assert.throws)
        assert.throws(() => {
          (result.context.items as any).push(createItem({}));
        }, TypeError);

        assert.throws(() => {
          (result.context.includedItemIds as any).push("newId");
        }, TypeError);

        // Returned metadata should be frozen
        assert.throws(() => {
          (result.context.items[0].metadata as any).arr.push(3);
        }, TypeError);

        // Assert that the original objects were not frozen as a side-effect (we clone, then freeze the clone)
        originalMetadata.arr.push(3); // Should not throw
        assert.equal(originalMetadata.arr.length, 3);
        assert.equal((result.context.items[0].metadata as any).arr.length, 2);
      }
    });
  });
});
