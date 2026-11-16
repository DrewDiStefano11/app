import type { AppState } from "../types";
import type { LocalJarvisCommand } from "./text-commands";

function startOfWeek(now: Date) {
  const date = new Date(now);
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() - ((date.getDay() + 6) % 7));
  return date.getTime();
}

export function queryRecoveryText(
  text: string,
  state: AppState,
  now: Date,
): LocalJarvisCommand | undefined {
  if (/^show (?:my )?recovery check[- ]ins this week$/.test(text)) {
    const cutoff = startOfWeek(now);
    const entries = [...state.recoveryCheckIns]
      .filter((item) => item.createdAt >= cutoff && item.createdAt <= now.getTime())
      .sort((a, b) => b.createdAt - a.createdAt);
    return {
      reply: entries.length
        ? entries
            .slice(0, 14)
            .map(
              (item) =>
                `${new Date(item.createdAt).toLocaleDateString()}: energy ${item.energy}/10, soreness ${item.soreness}/10, stress ${item.stress}/10, motivation ${item.motivation}/10.`,
            )
            .join("\n")
        : "There are no recorded recovery check-ins this week.",
    };
  }

  const rating =
    /^(?:my )?(energy|soreness|stress|motivation)(?: is| was| at) (\d+|one|two|three|four|five|six|seven|eight|nine|ten)(?:\s*(?:\/|out of)\s*(5|five|10|ten))?(?: today)?$/.exec(
      text,
    );
  if (rating) {
    const field = rating[1];
    const words = [
      "zero",
      "one",
      "two",
      "three",
      "four",
      "five",
      "six",
      "seven",
      "eight",
      "nine",
      "ten",
    ];
    const value = /^\d/.test(rating[2]) ? Number(rating[2]) : words.indexOf(rating[2]);
    const max = rating[3] === "5" || rating[3] === "five" ? 5 : 10;
    if (value <= 0 || value > max) return { reply: `Rate ${field} from 1 to ${max}.` };
    const scaled = value * (10 / max);
    if (
      state.recoveryCheckIns.some(
        (item) => new Date(item.createdAt).toDateString() === now.toDateString(),
      )
    ) {
      return { tool: "updateDailyCheckIn", args: { patch: { [field]: scaled } } };
    }
    return {
      reply: `You reported ${field} at ${scaled}/10. To save a full check-in, include all four ratings: energy, soreness, stress, and motivation.`,
    };
  }

  const checkIn =
    /^(?:log (?:my )?(?:daily )?check[- ]in[: ]+)?energy (\d+),? soreness (\d+),? stress (\d+),? (?:and )?motivation (\d+)$/.exec(
      text,
    );
  if (checkIn) {
    return {
      tool: "logDailyCheckIn",
      args: {
        energy: Number(checkIn[1]),
        soreness: Number(checkIn[2]),
        stress: Number(checkIn[3]),
        motivation: Number(checkIn[4]),
      },
    };
  }
  if (/^i(?:'m| am) (?:very |really )?sore(?: from yesterday)?$/.test(text)) {
    return { reply: "How strong is the soreness on a scale of 1 to 10?" };
  }
}
