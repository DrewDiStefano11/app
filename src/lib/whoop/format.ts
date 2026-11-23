export function measuredNumber(value: number | null | undefined, unit = "") {
  return value == null ? "Unavailable" : `${value}${unit}`;
}

export function sleepDuration(ms: number | null | undefined) {
  if (ms == null) return "Unavailable";
  const minutes = Math.round(ms / 60000);
  return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
}
