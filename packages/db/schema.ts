import { pgTable, serial, text, timestamp, integer, boolean, uuid } from "drizzle-orm/pg-core";

export const organizations = pgTable("organizations", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: text("email").notNull().unique(),
  name: text("name"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const memberships = pgTable("memberships", {
  orgId: uuid("org_id").notNull(),
  userId: uuid("user_id").notNull(),
  role: text("role").notNull(),
});
