import { useSyncExternalStore } from "react";
import { getWhoopSnapshot, getWhoopRefreshing, subscribeToWhoopChanges } from "@/lib/whoop/browser";

const emptySnapshot = () => null;

export function useWhoopSnapshot() {
  return useSyncExternalStore(subscribeToWhoopChanges, getWhoopSnapshot, emptySnapshot);
}

const notRefreshing = () => false;
export function useWhoopRefreshing() {
  return useSyncExternalStore(subscribeToWhoopChanges, getWhoopRefreshing, notRefreshing);
}
