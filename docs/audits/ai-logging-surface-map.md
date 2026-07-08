# AI Logging Surface Map

## 1. Existing AI-related files/functions/components
*   `src/lib/ai.functions.ts`: Server functions for interacting with AI providers (Groq, Gemini), including schemas for chat and text/image estimations.
*   `src/components/app/jarvis/`: Contains AI UI components like `jarvis-panel.tsx` (chat interface), `confirm-card.tsx` (approval UI for AI actions), `activity-view.tsx`, and `settings-card.tsx`.
*   `src/lib/jarvis/tools.ts`: Defines tools that the AI can call to perform actions or fetch data.
*   `src/components/app/ai-insight.tsx`: Component to display AI-generated insights.
*   `src/lib/types.ts`: Contains AI-related types and settings like `JarvisSettings`, `AiMessage`, `DataSource`, `ProvenanceSource`, `DataProvenance`, and `SourceMeta`.
*   `src/lib/fitcore-data.ts`: Contains functions for creating AI data provenance (`createJarvisProvenance`, `createAiEstimateProvenance`).

## 2. Surfaces where the user can enter/log information
*   **Quick Popups (`src/components/app/popups/quick-popups.tsx`)**: Check-ins (energy, soreness, stress, motivation), Meal Logging (macros, calories, type), Weigh-ins (bodyweight).
*   **Active Workout (`src/components/app/active-workout.tsx`)**: Sets, reps, weight, completion status, exercise notes, modifiers.
*   **Jarvis Panel (`src/components/app/jarvis/jarvis-panel.tsx`)**: Free-form text input for chat, which could be interpreted as logs.
*   **Settings/Profile (`src/components/app/views/settings.tsx`)**: User profile, goals, days per week, training age.

## 3. Areas where AI may need to interpret user input in the future
*   **Free-form Text Chat**: Interpreting conversational inputs like "I ate a huge burger" or "My back is killing me today" into structured meal logs or recovery check-ins.
*   **Image Analysis**: Interpreting photos of food to estimate calories and macronutrients.
*   **Workout Summaries**: Parsing unstructured text summaries of workouts ("I did 3 sets of 10 squats at 135lbs") into structured `WorkoutExercise` and `SetEntry` objects.
*   **Notes Fields**: Analyzing user notes in check-ins or workouts to derive implicit metrics or warnings (e.g., detecting pain from workout notes).

## 4. Current risks around AI incorrectly logging metrics
*   **Hallucinated Macros/Volumes**: AI may hallucinate incorrect nutritional values for meals or impossible weights/reps for exercises, corrupting analytical trends like Total Volume or Daily Calories.
*   **Scale Misinterpretation**: AI might improperly map a user's natural language sentiment (e.g., "I feel okay") to the 1-10 scales for `energy`, `soreness`, `stress`, or `motivation` in `RecoveryCheckIn`.
*   **Duplicate Entries**: AI could log a meal or workout that the user already logged manually if it fails to verify existing logs before creating new ones.
*   **Destructive Edits**: AI might overwrite or delete manually confirmed data if it interprets a query as an edit or clear instruction.
*   **Missing Validation**: Without strict runtime boundaries, AI might log negative values, missing required fields (like `id` or `createdAt`), or strings where numbers are expected.

## 5. Future safe AI logging tasks grouped by exact file scope
*   **`src/lib/jarvis/tools.ts`**:
    *   Implement strict Zod validation on all tool inputs to ensure numbers are within reasonable bounds (e.g., positive reps, realistic bodyweights).
    *   Add dry-run capabilities to tools to return proposed changes without committing them to the store.
*   **`src/components/app/jarvis/confirm-card.tsx`**:
    *   Enhance the UI to allow users to manually edit AI-generated fields (like calories or reps) before explicitly approving the log.
*   **`src/lib/ai.functions.ts`**:
    *   Refine system prompts and `estimateInputSchema` to mandate step-by-step reasoning before outputting structured JSON to reduce hallucinations.

## 6. Work that should wait until state/schema/storage work is explicitly planned
*   Adding entirely new entity types (e.g., `vo2_max_log`, `blood_panel`) that do not exist in `AppState` or `FitCoreLogType`.
*   Altering the core `DataProvenance` schema to support complex branching, undo history, or multi-agent confidence scoring.
*   Changing how the global store (`src/lib/store.tsx`) saves and loads `fitcore.v1` data.
*   Implementing complex multi-modal chat history persistence across sessions (beyond the simple `aiMessages` array).
