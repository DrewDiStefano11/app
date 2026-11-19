import { useSyncExternalStore } from "react";
import { getWhoopSnapshot, subscribeToWhoopChanges } from "@/lib/whoop/browser";

const emptySnapshot = () => null;

export function useWhoopSnapshot() {
  return useSyncExternalStore(subscribeToWhoopChanges, getWhoopSnapshot, emptySnapshot);
}
