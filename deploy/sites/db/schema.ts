import { sqliteTable, text, integer, index } from "drizzle-orm/sqlite-core";
export const futureSessions = sqliteTable(
  "future_sessions",
  {
    id: text("id").primaryKey(),
    experienceVersion: text("experience_version").notNull(),
    decisionSequence: text("decision_sequence").notNull(),
    activeInterventions: text("active_interventions").notNull(),
    triggeredInterdependencies: text("triggered_interdependencies").notNull(),
    revisedDecision: text("revised_decision"),
    finalReflection: text("final_reflection").notNull(),
    generatedFutureMessage: text("generated_future_message").notNull(),
    consentToStore: integer("consent_to_store").notNull(),
    createdAt: integer("created_at").notNull(),
    expiresAt: integer("expires_at").notNull(),
    deletionHash: text("deletion_hash").notNull(),
  },
  (t) => [index("future_sessions_expiry").on(t.expiresAt)],
);

export const experienceRuns = sqliteTable(
  "experience_runs",
  {
    id: text("id").primaryKey(),
    capabilityHash: text("capability_hash").notNull(),
    revision: integer("revision").notNull(),
    startedAt: integer("started_at").notNull(),
    elapsedSeconds: integer("elapsed_seconds").notNull(),
    state: text("state").notNull(),
    status: text("status").notNull(),
    mode: text("mode").notNull(),
    guided: integer("guided").notNull(),
    activeInterventions: text("active_interventions").notNull(),
    finalMessage: text("final_message").notNull(),
    reason: text("reason").notNull(),
    consentToStore: integer("consent_to_store").notNull(),
    updatedAt: integer("updated_at").notNull(),
    expiresAt: integer("expires_at").notNull(),
  },
  (t) => [
    index("experience_runs_updated").on(t.updatedAt),
    index("experience_runs_expiry").on(t.expiresAt),
  ],
);
