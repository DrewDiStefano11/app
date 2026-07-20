import type { JsonValue, SessionId, TurnId } from "../contracts/runtime-contracts";

export type ConversationContextItemKind =
  | "session_summary"
  | "active_context"
  | "user_message"
  | "assistant_message"
  | "tool_result_summary"
  | "pending_clarification"
  | "pending_confirmation";

export interface ConversationContextItem {
  readonly itemId: string;
  readonly sessionId: SessionId;
  readonly turnId?: TurnId;
  readonly sequence: number;
  readonly kind: ConversationContextItemKind;
  readonly text: string;
  readonly metadata?: Readonly<Record<string, JsonValue>>;
}

export interface ConversationContextLimits {
  readonly maxContentCharacters: number;
  readonly maxItems: number;
  readonly maxRecentTurns: number;
}

export type ConversationContextWarningCode =
  | "history_limited_by_character_budget"
  | "history_limited_by_item_budget"
  | "history_limited_by_turn_count"
  | "latest_turn_exceeds_available_budget"
  | "session_summary_omitted"
  | "empty_context";

export type ConversationContextInvalidReasonCode =
  | "invalid_limits"
  | "duplicate_item_id"
  | "duplicate_sequence"
  | "session_mismatch"
  | "invalid_item_id"
  | "invalid_item_text"
  | "invalid_item_sequence"
  | "missing_turn_id"
  | "multiple_session_summaries"
  | "multiple_pending_clarifications"
  | "multiple_pending_confirmations";

export interface ProjectedConversationContext {
  readonly sessionId: SessionId;
  readonly items: readonly ConversationContextItem[];
  readonly includedItemIds: readonly string[];
  readonly omittedItemIds: readonly string[];
  readonly includedTurnIds: readonly TurnId[];
  readonly omittedTurnIds: readonly TurnId[];
  readonly contentCharacters: number;
  readonly includedTurnCount: number;
  readonly truncated: boolean;
  readonly warnings: readonly ConversationContextWarningCode[];
  readonly projectionVersion: string;
}

export interface ConversationContextProjectedResult {
  readonly status: "projected";
  readonly context: ProjectedConversationContext;
}

export interface ConversationContextInsufficientBudgetResult {
  readonly status: "insufficient_budget";
  readonly reasonCode: "required_context_exceeds_budget";
  readonly safeMessage: string;
  readonly requiredCharacters: number;
  readonly requiredItems: number;
  readonly projectionVersion: string;
}

export interface ConversationContextInvalidResult {
  readonly status: "invalid_input";
  readonly reasonCode: ConversationContextInvalidReasonCode;
  readonly safeMessage: string;
  readonly projectionVersion: string;
}

export type ConversationContextProjectionResult =
  | ConversationContextProjectedResult
  | ConversationContextInsufficientBudgetResult
  | ConversationContextInvalidResult;

export interface ConversationContextProjectionInput {
  readonly sessionId: SessionId;
  readonly items: readonly ConversationContextItem[];
  readonly limits: ConversationContextLimits;
}

const PROJECTION_VERSION = "conversation-context-v1";

export function projectConversationContext(
  input: ConversationContextProjectionInput,
): ConversationContextProjectionResult {
  const { sessionId, limits, items: originalItems } = input;

  const limitsValid = checkLimits(limits);
  if (!limitsValid) {
    return createInvalidResult("invalid_limits", "The conversation-context limits are invalid.");
  }

  const sortedItems = [...originalItems].sort((a, b) => a.sequence - b.sequence);

  const invalidReason = validateItems(sortedItems, sessionId);
  if (invalidReason) {
    return invalidReason;
  }

  const {
    sessionSummary,
    activeContexts,
    historyItems,
    pendingClarification,
    pendingConfirmation,
  } = categorizeItems(sortedItems);

  const requiredItems = [
    ...activeContexts,
    ...(pendingClarification ? [pendingClarification] : []),
    ...(pendingConfirmation ? [pendingConfirmation] : []),
  ];

  const requiredCharacterCount = calculateCharacters(requiredItems);
  const requiredItemCount = requiredItems.length;

  if (requiredCharacterCount > limits.maxContentCharacters || requiredItemCount > limits.maxItems) {
    return {
      status: "insufficient_budget",
      reasonCode: "required_context_exceeds_budget",
      safeMessage: "Required conversation context exceeds the supplied limits.",
      requiredCharacters: requiredCharacterCount,
      requiredItems: requiredItemCount,
      projectionVersion: PROJECTION_VERSION,
    };
  }

  let remainingCharacters = limits.maxContentCharacters - requiredCharacterCount;
  let remainingItems = limits.maxItems - requiredItemCount;

  const turnGroupsMap = new Map<string, ConversationContextItem[]>();
  for (const item of historyItems) {
    const turnId = item.turnId as string;
    let group = turnGroupsMap.get(turnId);
    if (!group) {
      group = [];
      turnGroupsMap.set(turnId, group);
    }
    group.push(item);
  }

  const turns = Array.from(turnGroupsMap.values());
  turns.sort((a, b) => {
    // Both sequences are lowest in their groups since items were already sorted by sequence.
    return a[0].sequence - b[0].sequence;
  });

  const selectedTurns: ConversationContextItem[][] = [];
  const omittedTurnIds: TurnId[] = [];
  const includedTurnIds: TurnId[] = [];

  let historyCharacterWarning = false;
  let historyItemWarning = false;
  let historyTurnWarning = false;
  let latestTurnWarning = false;

  let stoppedSelectingTurns = false;

  // Newest to oldest iteration
  for (let i = turns.length - 1; i >= 0; i--) {
    const turn = turns[i];
    const turnTurnId = turn[0].turnId as TurnId;

    if (stoppedSelectingTurns) {
      omittedTurnIds.push(turnTurnId);
      continue;
    }

    const turnCharacters = calculateCharacters(turn);
    const turnItems = turn.length;

    if (turnCharacters > remainingCharacters) {
      stoppedSelectingTurns = true;
      historyCharacterWarning = true;
      if (i === turns.length - 1) latestTurnWarning = true;
      omittedTurnIds.push(turnTurnId);
      continue;
    }

    if (turnItems > remainingItems) {
      stoppedSelectingTurns = true;
      historyItemWarning = true;
      if (i === turns.length - 1) latestTurnWarning = true;
      omittedTurnIds.push(turnTurnId);
      continue;
    }

    if (selectedTurns.length >= limits.maxRecentTurns) {
      stoppedSelectingTurns = true;
      historyTurnWarning = true;
      omittedTurnIds.push(turnTurnId);
      continue;
    }

    selectedTurns.unshift(turn);
    remainingCharacters -= turnCharacters;
    remainingItems -= turnItems;
    includedTurnIds.unshift(turnTurnId);
  }

  let sessionSummaryIncluded = false;
  let sessionSummaryWarning = false;

  if (sessionSummary) {
    const summaryCharacters = calculateCharacters([sessionSummary]);
    if (summaryCharacters <= remainingCharacters && 1 <= remainingItems) {
      sessionSummaryIncluded = true;
    } else {
      sessionSummaryWarning = true;
    }
  }

  const finalItems: ConversationContextItem[] = [];
  if (sessionSummaryIncluded && sessionSummary) {
    finalItems.push(sessionSummary);
  }

  finalItems.push(...activeContexts);

  for (const turn of selectedTurns) {
    finalItems.push(...turn);
  }

  if (pendingClarification) {
    finalItems.push(pendingClarification);
  }
  if (pendingConfirmation) {
    finalItems.push(pendingConfirmation);
  }

  const omittedItems: ConversationContextItem[] = [];
  if (!sessionSummaryIncluded && sessionSummary) {
    omittedItems.push(sessionSummary);
  }
  for (let i = 0; i < turns.length; i++) {
    if (!includedTurnIds.includes(turns[i][0].turnId as TurnId)) {
      omittedItems.push(...turns[i]);
    }
  }

  omittedItems.sort((a, b) => a.sequence - b.sequence);
  omittedTurnIds.sort((aId, bId) => {
    // Re-establish chronological order for omitted turn IDs based on their lowest sequence.
    const aTurn = turns.find((t) => t[0].turnId === aId)!;
    const bTurn = turns.find((t) => t[0].turnId === bId)!;
    return aTurn[0].sequence - bTurn[0].sequence;
  });

  const includedItemIds = finalItems.map((item) => item.itemId);
  const omittedItemIds = omittedItems.map((item) => item.itemId);
  const totalCharacters = calculateCharacters(finalItems);
  const truncated = omittedItems.length > 0;

  const warnings: ConversationContextWarningCode[] = [];
  if (historyCharacterWarning) warnings.push("history_limited_by_character_budget");
  if (historyItemWarning) warnings.push("history_limited_by_item_budget");
  if (historyTurnWarning) warnings.push("history_limited_by_turn_count");
  if (latestTurnWarning) warnings.push("latest_turn_exceeds_available_budget");
  if (sessionSummaryWarning) warnings.push("session_summary_omitted");
  if (finalItems.length === 0) warnings.push("empty_context");

  return {
    status: "projected",
    context: {
      sessionId,
      items: finalItems,
      includedItemIds,
      omittedItemIds,
      includedTurnIds,
      omittedTurnIds,
      contentCharacters: totalCharacters,
      includedTurnCount: selectedTurns.length,
      truncated,
      warnings,
      projectionVersion: PROJECTION_VERSION,
    },
  };
}

function checkLimits(limits: ConversationContextLimits): boolean {
  if (
    !Number.isSafeInteger(limits.maxContentCharacters) ||
    limits.maxContentCharacters < 0 ||
    limits.maxContentCharacters > 100000
  )
    return false;
  if (!Number.isSafeInteger(limits.maxItems) || limits.maxItems < 0 || limits.maxItems > 500)
    return false;
  if (
    !Number.isSafeInteger(limits.maxRecentTurns) ||
    limits.maxRecentTurns < 0 ||
    limits.maxRecentTurns > 100
  )
    return false;

  return true;
}

function createInvalidResult(
  reasonCode: ConversationContextInvalidReasonCode,
  safeMessage: string,
): ConversationContextInvalidResult {
  return {
    status: "invalid_input",
    reasonCode,
    safeMessage,
    projectionVersion: PROJECTION_VERSION,
  };
}

function validateItems(
  items: readonly ConversationContextItem[],
  expectedSessionId: SessionId,
): ConversationContextInvalidResult | null {
  for (const item of items) {
    if (!isValidString(item.itemId, 128)) {
      return createInvalidResult(
        "invalid_item_id",
        "A conversation item has an invalid identifier.",
      );
    }
  }

  const seenIds = new Set<string>();
  for (const item of items) {
    if (seenIds.has(item.itemId)) {
      return createInvalidResult(
        "duplicate_item_id",
        "Conversation items must have unique identifiers.",
      );
    }
    seenIds.add(item.itemId);
  }

  for (const item of items) {
    if (!Number.isSafeInteger(item.sequence) || item.sequence <= 0) {
      return createInvalidResult(
        "invalid_item_sequence",
        "A conversation item has an invalid sequence.",
      );
    }
  }

  const seenSequences = new Set<number>();
  for (const item of items) {
    if (seenSequences.has(item.sequence)) {
      return createInvalidResult(
        "duplicate_sequence",
        "Conversation items must have unique sequences.",
      );
    }
    seenSequences.add(item.sequence);
  }

  for (const item of items) {
    if (!isValidString(item.text, 16384)) {
      return createInvalidResult("invalid_item_text", "A conversation item has invalid text.");
    }
  }

  for (const item of items) {
    if (item.sessionId !== expectedSessionId) {
      return createInvalidResult(
        "session_mismatch",
        "A conversation item belongs to a different session.",
      );
    }
  }

  for (const item of items) {
    const requiresTurnId =
      item.kind === "user_message" ||
      item.kind === "assistant_message" ||
      item.kind === "tool_result_summary";

    if (requiresTurnId && !item.turnId) {
      return createInvalidResult(
        "missing_turn_id",
        "A conversation item is missing a required turn identifier.",
      );
    }
  }

  let numSessionSummaries = 0;
  let numClarifications = 0;
  let numConfirmations = 0;

  for (const item of items) {
    if (item.kind === "session_summary") numSessionSummaries++;
    if (item.kind === "pending_clarification") numClarifications++;
    if (item.kind === "pending_confirmation") numConfirmations++;
  }

  if (numSessionSummaries > 1) {
    return createInvalidResult(
      "multiple_session_summaries",
      "Only one session summary may be provided.",
    );
  }
  if (numClarifications > 1) {
    return createInvalidResult(
      "multiple_pending_clarifications",
      "Only one pending clarification may be provided.",
    );
  }
  if (numConfirmations > 1) {
    return createInvalidResult(
      "multiple_pending_confirmations",
      "Only one pending confirmation may be provided.",
    );
  }

  return null;
}

function isValidString(str: string, maxLength: number): boolean {
  if (typeof str !== "string") return false;
  if (str.length === 0 || str.trim().length === 0) return false;
  if (str.length > maxLength) return false;
  return true;
}

function calculateCharacters(items: readonly ConversationContextItem[]): number {
  let count = 0;
  for (const item of items) {
    count += item.text.length;
  }
  return count;
}

function categorizeItems(items: readonly ConversationContextItem[]) {
  let sessionSummary: ConversationContextItem | undefined;
  const activeContexts: ConversationContextItem[] = [];
  const historyItems: ConversationContextItem[] = [];
  let pendingClarification: ConversationContextItem | undefined;
  let pendingConfirmation: ConversationContextItem | undefined;

  for (const item of items) {
    switch (item.kind) {
      case "session_summary":
        sessionSummary = item;
        break;
      case "active_context":
        activeContexts.push(item);
        break;
      case "user_message":
      case "assistant_message":
      case "tool_result_summary":
        historyItems.push(item);
        break;
      case "pending_clarification":
        pendingClarification = item;
        break;
      case "pending_confirmation":
        pendingConfirmation = item;
        break;
    }
  }

  return {
    sessionSummary,
    activeContexts,
    historyItems,
    pendingClarification,
    pendingConfirmation,
  };
}

export function getLatestAssistantMessage(
  items: readonly ConversationContextItem[],
  sessionId?: SessionId,
): ConversationContextItem | undefined {
  return getLatestMessageOfKind(items, "assistant_message", sessionId);
}

export function getLatestUserMessage(
  items: readonly ConversationContextItem[],
  sessionId?: SessionId,
): ConversationContextItem | undefined {
  return getLatestMessageOfKind(items, "user_message", sessionId);
}

function getLatestMessageOfKind(
  items: readonly ConversationContextItem[],
  kind: ConversationContextItemKind,
  sessionId?: SessionId,
): ConversationContextItem | undefined {
  let latestMessage: ConversationContextItem | undefined;

  for (const item of items) {
    if (item.kind !== kind) continue;
    if (sessionId && item.sessionId !== sessionId) continue;

    if (!latestMessage || item.sequence > latestMessage.sequence) {
      latestMessage = item;
    }
  }

  return latestMessage;
}
