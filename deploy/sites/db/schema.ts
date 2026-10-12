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
