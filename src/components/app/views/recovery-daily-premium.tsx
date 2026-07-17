import {
  Activity,
  ArrowRight,
  CalendarDays,
  ChevronRight,
  CircleAlert,
  Moon,
  Plus,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import { useMemo, type CSSProperties } from "react";
import { useStore } from "@/lib/store";
import type { FatigueLevel, RecoveryCheckIn, SleepEntry } from "@/lib/types";
import {
  DataQualityBadge,
  PremiumCard,
  SectionHeader,
  StatusBadge,
  type DataQualityDetails,
} from "@/components/app/premium-ui";

const MUSCLES = [
  "chest",
  "back",
  "shoulders",
  "biceps",
  "triceps",
  "quads",
  "hamstrings",
  "glutes",
  "calves",
  "core",
] as const;

const levelLabel: Record<FatigueLevel, string> = {
  fresh: "Fresh",
  moderate: "Moderate",
  fatigued: "Fatigued",
  very: "Very fatigued",
};

interface RecoveryDailyPremiumProps {
  onLogCheckIn: () => void;
  onLogSleep: () => void;
  onUpdateFatigue: () => void;
  onDeleteCheckIn: (id: string) => void;
  onDeleteSleep: (id: string) => void;
  onOpenDeepDive: () => void;
}

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);

function sleepContribution(entry?: SleepEntry) {
  if (!entry) return null;
  if (!isFiniteNumber(entry.hours) || !isFiniteNumber(entry.quality)) return null;
  return Math.min(100, (entry.hours / 8) * 50 + entry.quality * 5);
}

function checkInContribution(entry?: RecoveryCheckIn) {
  if (!entry) return null;
  if (
    !isFiniteNumber(entry.energy) ||
    !isFiniteNumber(entry.soreness) ||
    !isFiniteNumber(entry.stress) ||
    !isFiniteNumber(entry.motivation)
  )
    return null;
  return (entry.energy + (10 - entry.soreness) + (10 - entry.stress) + entry.motivation) * 2.5;
}

export function calculateRecoveryDailyReadiness(sleep?: SleepEntry, checkIn?: RecoveryCheckIn) {
  const sleepScore = sleepContribution(sleep);
  const checkInScore = checkInContribution(checkIn);
  const scores = [sleepScore, checkInScore].filter((value): value is number => value != null);
  return {
    score: scores.length
      ? Math.round(scores.reduce((sum, value) => sum + value, 0) / scores.length)
      : null,
    sleepScore,
    checkInScore,
    parts: scores.length,
  };
}

const formatDate = (time: number) =>
  new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(
    new Date(time),
  );

const formatTime = (time: number) =>
  new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" }).format(new Date(time));

export function RecoveryDailyPremiumView({
  onLogCheckIn,
  onLogSleep,
  onUpdateFatigue,
  onDeleteCheckIn,
  onDeleteSleep,
  onOpenDeepDive,
}: RecoveryDailyPremiumProps) {
  const { state } = useStore();
  const lastSleep = state.sleepEntries[state.sleepEntries.length - 1];
  const lastCheck = state.recoveryCheckIns[state.recoveryCheckIns.length - 1];
  const readiness = calculateRecoveryDailyReadiness(lastSleep, lastCheck);
  const score = readiness.score;
  const visualScore = Math.min(100, Math.max(0, score ?? 0));
  const sleepInvalid = !!lastSleep && readiness.sleepScore == null;
  const checkInvalid = !!lastCheck && readiness.checkInScore == null;
  const sleepStale =
    readiness.sleepScore != null && Date.now() - lastSleep!.createdAt > 48 * 60 * 60 * 1_000;
  const checkStale =
    readiness.checkInScore != null && Date.now() - lastCheck!.createdAt > 36 * 60 * 60 * 1_000;
  const quality: DataQualityDetails =
    sleepInvalid || checkInvalid
      ? {
          state: "unavailable",
          confidence: "low",
          reason: "Latest recovery values are invalid",
        }
      : sleepStale || checkStale
        ? {
            state: "stale",
            confidence: readiness.parts === 2 ? "medium" : "low",
            sourceCount: readiness.parts,
            reason: "One or more readiness contributors need a current entry",
          }
        : readiness.parts === 2
          ? { state: "ready", confidence: "high", sourceCount: 2 }
          : readiness.parts === 1
            ? {
                state: "partial",
                confidence: "medium",
                sourceCount: 1,
                reason: "One of two readiness contributors is usable",
              }
            : { state: "needs_more_data", confidence: "low", sourceCount: 0 };

  const recommendation =
    score == null
      ? "Add sleep or a daily check-in to get a recommendation."
      : sleepStale || checkStale
        ? "Your latest usable entries are older, so update them before relying on today's score."
        : score >= 75
          ? "Great recovery — train hard today."
          : score >= 60
            ? "Solid recovery — follow your normal training plan."
            : score >= 40
              ? "Consider reducing training volume or intensity by about 20%."
              : "Prioritize rest, mobility, or light cardio today.";
  const status =
    score == null
      ? "Readiness unavailable"
      : score >= 75
        ? "High readiness"
        : score >= 60
          ? "Solid readiness"
          : score >= 40
            ? "Reduced readiness"
            : "Low readiness";

  const validWeekSleep = useMemo(
    () =>
      state.sleepEntries.filter(
        (entry) =>
          entry.createdAt > Date.now() - 7 * 86_400_000 &&
          isFiniteNumber(entry.hours) &&
          isFiniteNumber(entry.quality),
      ),
    [state.sleepEntries],
  );
  const averageSleep = validWeekSleep.length
    ? validWeekSleep.reduce((sum, entry) => sum + entry.hours, 0) / validWeekSleep.length
    : null;
  const sleepGoal = isFiniteNumber(state.profile.sleepGoalH) ? state.profile.sleepGoalH : null;
  const loggedMuscles = MUSCLES.filter((muscle) => state.muscleFatigue[muscle] != null);
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayActivity = [
    ...state.sleepEntries.map((entry) => ({ ...entry, kind: "Sleep" as const })),
    ...state.recoveryCheckIns.map((entry) => ({ ...entry, kind: "Check-in" as const })),
  ]
    .filter((entry) => entry.createdAt >= todayStart.getTime())
    .sort((a, b) => b.createdAt - a.createdAt);
  const supplements = state.supplementLogs
    .filter((entry) => entry.createdAt >= todayStart.getTime())
    .sort((a, b) => b.createdAt - a.createdAt);
  const routine = state.userGoalsProfile.supplementRoutine ?? [];

  const nextAction = !lastSleep
    ? {
        title: "Log last night’s sleep",
        detail: "Sleep hours and quality will add one readiness contributor.",
        action: onLogSleep,
        label: "Log sleep",
      }
    : sleepInvalid
      ? {
          title: "Replace the invalid sleep entry",
          detail: "The latest sleep record cannot be used in readiness.",
          action: onLogSleep,
          label: "Log sleep",
        }
      : sleepStale
        ? {
            title: "Update stale sleep data",
            detail: "Log a current night before relying on today's readiness.",
            action: onLogSleep,
            label: "Log sleep",
          }
        : !lastCheck
          ? {
              title: "Complete today’s check-in",
              detail: "Energy, soreness, stress, and motivation complete the daily picture.",
              action: onLogCheckIn,
              label: "Check in",
            }
          : checkInvalid
            ? {
                title: "Replace the incomplete check-in",
                detail: "All four check-in values are required for readiness.",
                action: onLogCheckIn,
                label: "Check in",
              }
            : checkStale
              ? {
                  title: "Update your recovery check-in",
                  detail: "Add current energy, soreness, stress, and motivation values.",
                  action: onLogCheckIn,
                  label: "Check in",
                }
              : {
                  title: "Review today’s plan",
                  detail: recommendation,
                  action: onOpenDeepDive,
                  label: "Open analysis",
                };

  const todayLabel = new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
  }).format(new Date());

  return (
    <div className="recovery-daily-premium">
      <header className="recovery-daily-header">
        <div>
          <p className="eyebrow">Recovery daily</p>
          <h1>Recovery</h1>
          <p>Readiness inputs, body status, and a practical plan for today.</p>
        </div>
        <div className="recovery-day-context" aria-label={`Current day: ${todayLabel}`}>
          <CalendarDays size={16} aria-hidden="true" />
          <span>{todayLabel}</span>
        </div>
      </header>

      <main className="recovery-daily-main">
        <PremiumCard className="recovery-readiness-hero" as="section">
          <div className="recovery-readiness-hero__ambient" aria-hidden="true" />
          <div className="recovery-readiness-copy">
            <div className="recovery-hero-heading">
              <div>
                <p className="eyebrow">Today’s readiness</p>
                <h2>{status}</h2>
              </div>
              <DataQualityBadge quality={quality} compact />
            </div>
            <p className="recovery-recommendation">{recommendation}</p>
            <p className="recovery-formula-note">
              Current calculation averages the latest usable sleep score and latest complete
              check-in score. Missing inputs are excluded, never treated as zero.
            </p>
            <div className="recovery-hero-actions">
              <button type="button" className="recovery-primary-action" onClick={onLogCheckIn}>
                <Plus size={17} aria-hidden="true" /> Daily check-in
              </button>
              <button type="button" className="recovery-secondary-action" onClick={onLogSleep}>
                <Moon size={17} aria-hidden="true" /> Log sleep
              </button>
            </div>
          </div>
          <div
            className="recovery-readiness-ring"
            style={{ "--readiness": `${visualScore * 3.6}deg` } as CSSProperties}
            role={score == null ? "img" : "progressbar"}
            aria-label={score == null ? "Readiness unavailable" : `Readiness ${score} percent`}
            aria-valuemin={score == null ? undefined : 0}
            aria-valuemax={score == null ? undefined : 100}
            aria-valuenow={score == null ? undefined : visualScore}
          >
            <span>
              <strong>{score == null ? "—" : score}</strong>
              {score != null && <small>%</small>}
            </span>
          </div>
        </PremiumCard>

        <section className="recovery-contributors" aria-labelledby="recovery-contributors-title">
          <SectionHeader
            eyebrow="Measured inputs"
            title="Readiness contributors"
            description="Exact latest values and whether each source is included in today’s score."
          />
          <div className="recovery-contributor-grid">
            <ContributorCard
              type="sleep"
              entry={lastSleep}
              score={readiness.sleepScore}
              invalid={sleepInvalid}
              stale={sleepStale}
              onLog={onLogSleep}
              onDelete={lastSleep ? () => onDeleteSleep(lastSleep.id) : undefined}
            />
            <ContributorCard
              type="check"
              entry={lastCheck}
              score={readiness.checkInScore}
              invalid={checkInvalid}
              stale={checkStale}
              onLog={onLogCheckIn}
              onDelete={lastCheck ? () => onDeleteCheckIn(lastCheck.id) : undefined}
            />
          </div>
        </section>

        <PremiumCard className="recovery-next-step" as="section">
          <span className="recovery-next-step__icon">
            <ShieldCheck size={20} aria-hidden="true" />
          </span>
          <div>
            <p className="eyebrow">Today’s next step</p>
            <h2>{nextAction.title}</h2>
            <p>{nextAction.detail}</p>
          </div>
          <button type="button" onClick={nextAction.action}>
            {nextAction.label} <ChevronRight size={15} aria-hidden="true" />
          </button>
        </PremiumCard>

        <section className="recovery-sleep-summary" aria-labelledby="recovery-sleep-title">
          <SectionHeader
            eyebrow="Sleep"
            title="Rest record"
            description="Seven-day averages use logged nights only; unlogged nights are not counted as zero."
          />
          <div className="recovery-metric-grid">
            <PremiumCard>
              <span>Latest sleep</span>
              <strong>{lastSleep && !sleepInvalid ? `${lastSleep.hours} h` : "—"}</strong>
              <small>
                {lastSleep && !sleepInvalid
                  ? `Quality ${lastSleep.quality}/10 · ${formatDate(lastSleep.createdAt)}`
                  : sleepInvalid
                    ? "Latest entry is invalid"
                    : "Not logged"}
              </small>
            </PremiumCard>
            <PremiumCard>
              <span>7-day average</span>
              <strong>{averageSleep == null ? "—" : `${averageSleep.toFixed(1)} h`}</strong>
              <small>
                {validWeekSleep.length
                  ? `${validWeekSleep.length} logged ${validWeekSleep.length === 1 ? "night" : "nights"}`
                  : "No usable nights"}
              </small>
            </PremiumCard>
            <PremiumCard>
              <span>Sleep goal</span>
              <strong>{sleepGoal == null ? "—" : `${sleepGoal} h`}</strong>
              <small>
                {sleepGoal == null
                  ? "Goal unavailable"
                  : sleepGoal === 0
                    ? "Explicit zero-hour goal"
                    : "Profile target"}
              </small>
            </PremiumCard>
          </div>
        </section>

        <section className="recovery-body-section" aria-labelledby="recovery-body-title">
          <SectionHeader
            eyebrow="Body status"
            title="Muscle fatigue"
            description={
              loggedMuscles.length
                ? `${loggedMuscles.length} of ${MUSCLES.length} muscle groups have an explicit status.`
                : "No muscle status is logged. Missing status is not labeled fresh."
            }
            action={
              <button type="button" className="recovery-text-action" onClick={onUpdateFatigue}>
                Update all
              </button>
            }
          />
          <PremiumCard className="recovery-muscle-grid">
            {MUSCLES.map((muscle) => {
              const level = state.muscleFatigue[muscle];
              return (
                <div key={muscle} data-level={level ?? "missing"}>
                  <span>{muscle.charAt(0).toUpperCase() + muscle.slice(1)}</span>
                  <strong>{level ? levelLabel[level] : "Not logged"}</strong>
                </div>
              );
            })}
          </PremiumCard>
        </section>

        <section className="recovery-activity-section" aria-labelledby="recovery-activity-title">
          <SectionHeader
            eyebrow="Today’s record"
            title="Today’s activity"
            description="Sleep and check-ins saved today, ordered by time."
          />
          {todayActivity.length ? (
            <PremiumCard className="recovery-activity-list">
              {todayActivity.map((entry) => (
                <div key={`${entry.kind}-${entry.id}`}>
                  <span className="recovery-activity-icon">
                    {entry.kind === "Sleep" ? (
                      <Moon size={15} aria-hidden="true" />
                    ) : (
                      <Activity size={15} aria-hidden="true" />
                    )}
                  </span>
                  <div>
                    <strong>{entry.kind}</strong>
                    <small>{formatTime(entry.createdAt)}</small>
                  </div>
                </div>
              ))}
            </PremiumCard>
          ) : (
            <PremiumCard className="recovery-empty-row">
              <CircleAlert size={18} aria-hidden="true" />
              <div>
                <strong>No recovery activity today</strong>
                <p>Older entries can still contribute to readiness and remain dated above.</p>
              </div>
            </PremiumCard>
          )}
        </section>

        <div className="recovery-support-grid">
          <PremiumCard as="section" className="recovery-support-card">
            <p className="eyebrow">Supplements today</p>
            <h2>{supplements.length ? `${supplements.length} logged` : "None logged"}</h2>
            {supplements.length ? (
              <ul>
                {supplements.map((entry) => (
                  <li key={entry.id}>
                    <span>{entry.name}</span>
                    <strong>{entry.dose || "Taken"}</strong>
                  </li>
                ))}
              </ul>
            ) : (
              <p>Supplement logging remains available through the current Jarvis action flow.</p>
            )}
            {routine.length > 0 && <small>Routine: {routine.join(", ")}</small>}
          </PremiumCard>
          <PremiumCard as="section" className="recovery-support-card">
            <p className="eyebrow">Not connected</p>
            <h2>Wearable signals</h2>
            <StatusBadge tone="neutral">Planned</StatusBadge>
            <p>
              Apple Watch and Whoop data are not connected, so no HRV, resting heart rate, or strain
              values are fabricated here.
            </p>
          </PremiumCard>
        </div>

        <PremiumCard as="section" className="recovery-deep-dive-access">
          <div>
            <p className="eyebrow">Recovery analysis</p>
            <h2>Explore the underlying history</h2>
            <p>Open the existing Deep Dive for Health, Sleep, Body, and Insights.</p>
          </div>
          <button type="button" onClick={onOpenDeepDive}>
            Open Deep Dive <ArrowRight size={16} aria-hidden="true" />
          </button>
        </PremiumCard>
      </main>
    </div>
  );
}

function ContributorCard({
  type,
  entry,
  score,
  invalid,
  stale,
  onLog,
  onDelete,
}: {
  type: "sleep" | "check";
  entry?: SleepEntry | RecoveryCheckIn;
  score: number | null;
  invalid: boolean;
  stale: boolean;
  onLog: () => void;
  onDelete?: () => void;
}) {
  const isSleep = type === "sleep";
  return (
    <PremiumCard className="recovery-contributor-card" as="article">
      <div className="recovery-contributor-card__heading">
        <span className="recovery-contributor-icon">
          {isSleep ? (
            <Moon size={17} aria-hidden="true" />
          ) : (
            <Activity size={17} aria-hidden="true" />
          )}
        </span>
        <div>
          <p className="eyebrow">{isSleep ? "Sleep" : "Daily check-in"}</p>
          <h3>{score == null ? "Not included" : `${Math.round(score)} point contribution`}</h3>
        </div>
        <StatusBadge
          tone={invalid ? "danger" : stale ? "caution" : score != null ? "success" : "neutral"}
        >
          {invalid ? "Invalid" : stale ? "Stale" : score != null ? "Included" : "Missing"}
        </StatusBadge>
      </div>
      {entry ? (
        isSleep ? (
          <div className="recovery-contributor-values">
            <span>
              <small>Hours</small>
              <strong>
                {isFiniteNumber((entry as SleepEntry).hours) ? (entry as SleepEntry).hours : "—"}
              </strong>
            </span>
            <span>
              <small>Quality</small>
              <strong>
                {isFiniteNumber((entry as SleepEntry).quality)
                  ? `${(entry as SleepEntry).quality}/10`
                  : "—"}
              </strong>
            </span>
          </div>
        ) : (
          <div className="recovery-contributor-values recovery-contributor-values--four">
            <span>
              <small>Energy</small>
              <strong>
                {isFiniteNumber((entry as RecoveryCheckIn).energy)
                  ? (entry as RecoveryCheckIn).energy
                  : "—"}
              </strong>
            </span>
            <span>
              <small>Soreness</small>
              <strong>
                {isFiniteNumber((entry as RecoveryCheckIn).soreness)
                  ? (entry as RecoveryCheckIn).soreness
                  : "—"}
              </strong>
            </span>
            <span>
              <small>Stress</small>
              <strong>
                {isFiniteNumber((entry as RecoveryCheckIn).stress)
                  ? (entry as RecoveryCheckIn).stress
                  : "—"}
              </strong>
            </span>
            <span>
              <small>Motivation</small>
              <strong>
                {isFiniteNumber((entry as RecoveryCheckIn).motivation)
                  ? (entry as RecoveryCheckIn).motivation
                  : "—"}
              </strong>
            </span>
          </div>
        )
      ) : (
        <p className="recovery-contributor-empty">
          No {isSleep ? "sleep entry" : "check-in"} is available.
        </p>
      )}
      {entry && (
        <p className="recovery-contributor-date">
          Latest record · {formatDate(entry.createdAt)} at {formatTime(entry.createdAt)}
        </p>
      )}
      <div className="recovery-contributor-actions">
        <button type="button" onClick={onLog}>
          {entry ? "Log new" : "Add entry"}
        </button>
        {onDelete && (
          <button
            type="button"
            className="recovery-delete-action"
            onClick={onDelete}
            aria-label={`Delete latest ${isSleep ? "sleep entry" : "check-in"}`}
          >
            <Trash2 size={15} aria-hidden="true" /> Delete
          </button>
        )}
      </div>
    </PremiumCard>
  );
}
