import * as p from "drizzle-orm/pg-core";

export const program_call_stats = p.pgTable("program_call_stats", {
  program_address: p.text().notNull(),
  name: p.text().notNull().default(""),
  description: p.text().notNull().default(""),
  address: p.text().notNull(),
  calls_number: p.integer().notNull().default(0),
}, (t) => [
  p.unique().on(t.program_address, t.address),
  p.unique('unique_callers_per_program').on(t.program_address, t.address)
]);

export const program_stats = p.pgTable("program_stats", {
  program_address: p.text().notNull(),
  calling_programs_count: p.integer().notNull().default(0),
  transaction_references_count: p.integer().notNull().default(0),
}, (t) => [
  p.unique().on(t.program_address)
]);
