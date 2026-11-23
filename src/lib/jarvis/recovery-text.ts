import type { AppState } from "../types";
import type { LocalJarvisCommand } from "./text-commands";

const ratingFields = ["energy", "soreness", "stress", "motivation"] as const;
type RatingField = (typeof ratingFields)[number];

export interface RecoveryDraft {
  day: string;
  field: RatingField;
  ratings: Partial<Record<RatingField, number>>;
}

const ratingWords = [
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
const ratingValue = `(?:a )?(\\d+|${ratingWords.join("|")})(?:\\s*(?:/|out of)\\s*(5|five|10|ten))?`;
const namedRating = new RegExp(
  `^(?:my )?(${ratingFields.join("|")})(?: is| was| at) ${ratingValue}(?: today)?$`,
);
const followUpRating = new RegExp(`^${ratingValue}$`);

export function latestRecoveryCheckInToday(state: AppState, now: Date) {
  const day = now.toDateString();
  return state.recoveryCheckIns
    .filter(
      (item) => item.createdAt <= now.getTime() && new Date(item.createdAt).toDateString() === day,
    )
    .sort((a, b) => b.createdAt - a.createdAt)[0];
}

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
  draft?: RecoveryDraft,
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

  const day = now.toDateString();
  const pending = draft?.day === day ? draft : undefined;
  const rating = namedRating.exec(text);
  const followUp = pending ? followUpRating.exec(text) : null;
  const field = rating ? (rating[1] as RatingField) : followUp ? pending?.field : undefined;
  const reported = rating?.[2] ?? followUp?.[1];
  if (field && reported) {
    const value = /^\d/.test(reported) ? Number(reported) : ratingWords.indexOf(reported);
    const scale = rating?.[3] ?? followUp?.[2];
    const max = scale === "5" || scale === "five" ? 5 : 10;
    const ratings = { ...pending?.ratings };
    if (value <= 0 || value > max) {
      return {
        reply: `Rate ${field} from 1 to ${max}.`,
        nextContext: { recovery: { day, field, ratings } },
      };
    }
    const scaled = value * (10 / max);
    if (latestRecoveryCheckInToday(state, now)) {
      return { tool: "updateDailyCheckIn", args: { patch: { [field]: scaled } } };
    }
    ratings[field] = scaled;
    const nextField = ratingFields.find((key) => ratings[key] === undefined);
    if (!nextField) return { tool: "logDailyCheckIn", args: ratings };
    return {
      reply: `You reported ${field} at ${scaled}/10. How would you rate ${nextField} from 1 to 10?`,
      nextContext: { recovery: { day, field: nextField, ratings } },
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
    return {
      reply: "How strong is the soreness on a scale of 1 to 10?",
      nextContext: { recovery: { day, field: "soreness", ratings: pending?.ratings ?? {} } },
    };
  }
}
