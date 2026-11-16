import { MAX_WORKOUT_TEMPLATE_SETS, exerciseById, tracksWorkoutMinutes } from "../data";
import { createActiveWorkout, restTimerAfterSet } from "../active-workout-state";
import { createJarvisProvenance, markProvenanceEdited } from "../fitcore-data";
import { uid } from "../store";
import type { SetEntry, Workout } from "../types";
import { applyWorkoutPersonalRecords, workoutPersonalRecords } from "../workout-personal-records";
import {
  actionKey,
  duplicateResult,
  hasAuditKey,
  pushAudit,
  pushRecoveryActivity,
} from "./action-audit";
import { setValues } from "./action-schemas";
import {
  describeWorkoutSet,
  exerciseName,
  findActiveExercise,
  nextSetRow,
} from "./active-exercise";
import { jarvisScheduledWorkout } from "./scheduled-workout";
import type { ToolHandler } from "./tools";

export function textArg(args: Record<string, unknown>, key: string) {
  const v = args[key];
  return typeof v === "string" && v.trim() ? v.trim() : undefined;
}

export function normalizeSet(input: Record<string, unknown>, completed = true): SetEntry {
  const modifier = [
    "normal",
    "warmup",
    "drop",
    "failure",
    "partials",
    "unilateral",
    "paused",
    "tempo",
  ].includes(String(input.modifier))
    ? (String(input.modifier) as SetEntry["modifier"])
    : "normal";
  return {
    id: String(input.id ?? uid()),
    reps: input.reps == null ? undefined : Number(input.reps),
    weight: input.weight == null ? undefined : Number(input.weight),
    durationMin: input.durationMin == null ? undefined : Number(input.durationMin),
    distanceMi: input.distanceMi == null ? undefined : Number(input.distanceMi),
    modifier,
    completed,
  };
}

export const trainingActions = {
  logExerciseSet: (args, { set, state, confirmed, now = new Date() }) => {
    const active = state.activeWorkout;
    if (!active) return { ok: false, summary: "Start a workout before logging a set." };
    const row = findActiveExercise(state, {
      exerciseId: textArg(args, "exerciseId"),
      exerciseName: textArg(args, "exerciseName"),
      exerciseEntryId: textArg(args, "exerciseEntryId"),
    });
    if (!row) return { ok: false, summary: "Which exercise in your active workout did you mean?" };
    const exercise =
      exerciseById(row.exerciseId) ??
      state.customExercises.find((item) => item.id === row.exerciseId);
    const timed = tracksWorkoutMinutes(exercise);
    if (timed && args.durationMin === undefined)
      return { ok: false, summary: "Enter the completed duration for this exercise." };
    if (args.durationMin !== undefined && args.reps !== undefined)
      return { ok: false, summary: "Review either a timed set or a rep-based set." };
    const modifier = args.modifier as SetEntry["modifier"];
    const prev = nextSetRow(row, modifier);
    const id = prev?.id ?? uid(),
      auditId = uid();
    const recorded: SetEntry = {
      ...normalizeSet({ ...prev, ...args, id, modifier: modifier ?? prev?.modifier }),
      provenance: createJarvisProvenance({ confidence: "high", confirmed, auditId }),
    };
    const name = exerciseName(state, row);
    const measurements =
      recorded.durationMin !== undefined
        ? `${recorded.durationMin} min`
        : recorded.distanceMi !== undefined
          ? `${recorded.distanceMi} mi`
          : `${recorded.weight === undefined ? "" : `${recorded.weight} lb for `}${recorded.reps} reps`;
    const setType =
      recorded.modifier === "warmup"
        ? " warm-up set"
        : recorded.modifier === "unilateral"
          ? " unilateral set"
          : "";
    const summary = `${confirmed ? "Logged" : "Log"} ${name}${setType}: ${measurements}`;
    const sets = prev
      ? row.sets.map((item) => (item.id === id ? recorded : item))
      : [...row.sets, recorded];
    const rest = restTimerAfterSet(active, row, prev, recorded, now.getTime());
    set((current) => ({
      ...current,
      activeWorkout: {
        ...active,
        ...rest,
        exercises: active.exercises.map((item) =>
          item.id === row.id
            ? { ...row, sets, completed: sets.every((entry) => entry.completed) }
            : item,
        ),
      },
    }));
    pushAudit(set, {
      id: auditId,
      tool: "logExerciseSet",
      summary,
      status: "logged",
      entityIds: [id],
      entityKind: "activeSet",
      patch: {
        workoutId: active.id,
        exerciseEntryId: row.id,
        next: recorded,
        ...(rest.restLoggedSetKeys ? { restKey: rest.restLoggedSetKeys.at(-1) } : {}),
        ...(rest.restEndsAt === undefined
          ? {}
          : {
              restEndsAt: rest.restEndsAt,
              ...(active.restEndsAt === undefined ? {} : { previousRestEndsAt: active.restEndsAt }),
            }),
        ...(prev ? { prev } : {}),
        actionKey: actionKey("logExerciseSet", args),
      },
      createdAt: Date.now(),
    });
    return { ok: true, summary, auditId };
  },
  addPlannedExerciseSet: (args, { state, set, confirmed }) => {
    const active = state.activeWorkout;
    const row = findActiveExercise(state, { exerciseEntryId: textArg(args, "exerciseEntryId") });
    if (!active || !row) return { ok: false, summary: "Choose an active exercise to add a set." };
    const plannedCount = row.sets.filter((item) => item.modifier !== "warmup").length;
    if (args.expectedCount !== undefined && plannedCount !== args.expectedCount) {
      return {
        ok: false,
        summary: `This exercise has ${plannedCount} working set rows. Ask to add another set if needed.`,
      };
    }
    if (
      active.exercises.reduce((sum, item) => sum + item.sets.length, 0) >= MAX_WORKOUT_TEMPLATE_SETS
    ) {
      return { ok: false, summary: "This workout already has the maximum number of set rows." };
    }
    const item: SetEntry = { id: uid(), completed: false, modifier: "normal" };
    const auditId = uid();
    const summary = `${confirmed ? "Added" : "Add"} one planned set to ${exerciseName(state, row)}.`;
    set((s) => ({
      ...s,
      activeWorkout: {
        ...active,
        exercises: active.exercises.map((exercise) =>
          exercise.id === row.id
            ? { ...row, completed: false, sets: [...row.sets, item] }
            : exercise,
        ),
      },
    }));
    pushAudit(set, {
      id: auditId,
      tool: "addPlannedExerciseSet",
      summary,
      status: "logged",
      entityKind: "activeSet",
      entityIds: [item.id],
      patch: { workoutId: active.id, exerciseEntryId: row.id, next: item },
      createdAt: Date.now(),
    });
    return { ok: true, summary, auditId };
  },
  updateExerciseSet: (args, { set, state, confirmed }) => {
    const active = state.activeWorkout;
    const setId = String(args.setId);
    const rows = active?.exercises.filter((item) => item.sets.some((entry) => entry.id === setId));
    const row = rows?.length === 1 ? rows[0] : undefined;
    const prev = row?.sets.find((entry) => entry.id === setId && entry.completed);
    if (!active || !row || !prev)
      return { ok: false, summary: "Choose a completed set to correct." };
    const patch = setValues.partial().parse(args.patch);
    const auditId = uid(),
      editedAt = Date.now();
    const provenance = markProvenanceEdited(prev.provenance, {
      editedBy: "user",
      editedAt,
      auditId,
    });
    const next = { ...prev, ...patch, provenance };
    const name = exerciseName(state, row);
    const current = describeWorkoutSet(row, prev);
    const changed = describeWorkoutSet(row, next);
    const modifier =
      prev.modifier === next.modifier
        ? ""
        : ` Modifier: ${prev.modifier ?? "normal"} to ${next.modifier}.`;
    const summary = `${confirmed ? "Corrected" : "Correct"} ${name}, ${current} to ${changed}.${modifier}`;
    set((s) => ({
      ...s,
      activeWorkout: {
        ...active,
        exercises: active.exercises.map((item) =>
          item.id === row.id
            ? { ...row, sets: row.sets.map((entry) => (entry.id === setId ? next : entry)) }
            : item,
        ),
      },
    }));
    pushAudit(set, {
      id: auditId,
      tool: "updateExerciseSet",
      summary,
      status: "logged",
      entityIds: [setId],
      entityKind: "activeSetEdit",
      patch: { prev, next, workoutId: active.id, exerciseEntryId: row.id },
      createdAt: editedAt,
    });
    return { ok: true, summary, auditId };
  },
  deleteExerciseSet: (args, { set, state, confirmed }) => {
    const setId = String(args.setId),
      active = state.activeWorkout;
    const rows = active?.exercises.filter((item) => item.sets.some((entry) => entry.id === setId));
    const row = rows?.length === 1 ? rows[0] : undefined;
    const prev = row?.sets.find((entry) => entry.id === setId);
    if (!active || !row || !prev)
      return { ok: false, summary: "Set unavailable in the active workout." };
    const nextSets = row.sets.filter((item) => item.id !== setId);
    const summary = `${confirmed ? "Removed" : "Remove"} ${exerciseName(state, row)}, ${describeWorkoutSet(row, prev)}.`;
    set((s) => ({
      ...s,
      activeWorkout: {
        ...active,
        exercises: active.exercises.map((item) =>
          item.id === row.id
            ? {
                ...row,
                sets: nextSets,
                completed: nextSets.length > 0 && nextSets.every((entry) => entry.completed),
              }
            : item,
        ),
      },
    }));
    const auditId = uid();
    pushAudit(set, {
      id: auditId,
      tool: "deleteExerciseSet",
      summary,
      status: "logged",
      entityIds: [setId],
      entityKind: "activeSetDelete",
      patch: {
        prev,
        exerciseEntryId: row.id,
        workoutId: active.id,
        index: row.sets.indexOf(prev),
        order: nextSets.map((item) => item.id),
      },
      createdAt: Date.now(),
    });
    return { ok: true, summary, auditId };
  },
  startScheduledWorkout: (args, { set, state, confirmed, now = new Date() }) => {
    if (state.activeWorkout)
      return {
        ok: false,
        summary: `Resume ${state.activeWorkout.name} before starting another workout.`,
      };
    const date = new Date(now);
    const requested = args.weekday as number | undefined;
    if (requested !== undefined && requested !== date.getDay()) {
      if (
        state.personalization.trainingRoutine?.enabled &&
        state.personalization.trainingRoutine.mode === "rotation"
      ) {
        return {
          ok: false,
          summary: "Your routine is a rotation. Ask to start the next scheduled workout.",
        };
      }
      date.setDate(date.getDate() + ((requested - date.getDay() + 7) % 7));
    }
    const scheduled = jarvisScheduledWorkout(state, date);
    if (!scheduled) return { ok: false, summary: "No workout is scheduled for that day." };
    const active = createActiveWorkout(
      scheduled.template,
      scheduled.assignment,
      uid,
      now.getTime(),
    );
    if (!active)
      return { ok: false, summary: "This template exceeds FitCore's allowed number of sets." };
    const auditId = uid(),
      summary = `${confirmed ? "Started" : "Start"} ${active.name}`;
    set((current) => ({ ...current, activeWorkout: active }));
    pushAudit(set, {
      id: auditId,
      tool: "startScheduledWorkout",
      summary,
      status: "logged",
      entityKind: "workoutStart",
      entityIds: [active.id],
      createdAt: now.getTime(),
    });
    return { ok: true, summary, auditId };
  },
  startRestTimer: (args, { set, state, confirmed }) => {
    const active = state.activeWorkout;
    if (!active) return { ok: false, summary: "Start a workout to use the rest timer." };
    const seconds = Number(args.seconds);
    const restEndsAt = Date.now() + seconds * 1_000,
      auditId = uid();
    const summary = `${confirmed ? "Started" : "Start"} a ${seconds}-second rest timer.`;
    set((current) => ({ ...current, activeWorkout: { ...active, restEndsAt } }));
    pushAudit(set, {
      id: auditId,
      tool: "startRestTimer",
      summary,
      status: "logged",
      entityKind: "restTimer",
      entityIds: [active.id],
      createdAt: Date.now(),
      patch: {
        restEndsAt,
        ...(active.restEndsAt === undefined ? {} : { prev: active.restEndsAt }),
      },
    });
    return { ok: true, summary, auditId };
  },
  finishActiveWorkout: (args, { set, state, confirmed }) => {
    const dupeAudit = hasAuditKey(state, "finishActiveWorkout", args);
    if (dupeAudit) return duplicateResult(dupeAudit);
    if (!state.activeWorkout) return { ok: false, summary: "no active workout" };
    if (state.workouts.some((workout) => workout.id === state.activeWorkout?.id)) {
      return {
        ok: false,
        summary:
          "FitCore already has a saved workout with that ID. Review the active workout before saving.",
      };
    }
    if (
      !state.activeWorkout.exercises.some((exercise) => exercise.sets.some((set) => set.completed))
    )
      return { ok: false, summary: "Record at least one completed set before finishing." };
    const auditId = uid();
    const w: Workout = {
      ...state.activeWorkout,
      endedAt: Number(args.endedAt) || Date.now(),
      notes: textArg(args, "notes") ?? state.activeWorkout.notes,
      provenance: createJarvisProvenance({ confidence: "high", confirmed, auditId }),
    };
    delete w.restEndsAt;
    delete w.restLoggedSetKeys;
    const prs = applyWorkoutPersonalRecords(
      state.prs,
      workoutPersonalRecords(w, state.prs),
      uid,
      w.endedAt!,
    );
    set((s) => ({ ...s, activeWorkout: null, workouts: [...s.workouts, w], prs }));
    pushAudit(set, {
      id: auditId,
      tool: "finishActiveWorkout",
      summary: `Finished ${w.name}`,
      status: "logged",
      entityIds: [w.id],
      entityKind: "workout",
      patch: { workout: w, actionKey: actionKey("finishActiveWorkout", args) },
      createdAt: Date.now(),
    });
    if (/(pain|sore|tired|fatigue|tight|sick|poor sleep|low motivation)/i.test(w.notes ?? ""))
      pushRecoveryActivity(set, `Recovery note from workout: ${w.notes}`, w.notes);
    return { ok: true, summary: `Finished ${w.name}`, auditId, data: w };
  },
} satisfies Record<string, ToolHandler>;
