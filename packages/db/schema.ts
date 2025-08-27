import {
  pgTable,
  text,
  timestamp,
  uuid,
  primaryKey,
  pgEnum,
  jsonb,
  integer,
  unique,
  boolean,
} from "drizzle-orm/pg-core";

// Enum for membership roles
export const membershipRoleEnum = pgEnum("membership_role", ["admin", "editor", "viewer"]);

// Enum for CRM providers
export const crmProviderEnum = pgEnum("crm_provider", ["hubspot", "salesforce"]);

// Enum for connection status
export const connectionStatusEnum = pgEnum("connection_status", [
  "active",
  "expired",
  "revoked",
  "error",
]);

// Enum for sync status
export const syncStatusEnum = pgEnum("sync_status", ["pending", "running", "completed", "failed"]);

export const organizations = pgTable("organizations", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const users = pgTable("users", {
  id: uuid("id").primaryKey(), // Will match Supabase auth.users.id
  email: text("email").notNull().unique(),
  name: text("name"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const memberships = pgTable(
  "memberships",
  {
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: membershipRoleEnum("role").notNull().default("viewer"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.orgId, table.userId] }),
  }),
);

// OAuth connections for CRMs
export const oauthConnections = pgTable(
  "oauth_connections",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    provider: crmProviderEnum("provider").notNull(),
    instanceBaseUrl: text("instance_base_url"), // For Salesforce instances
    accessTokenCipher: text("access_token_cipher").notNull(), // Encrypted
    refreshTokenCipher: text("refresh_token_cipher"), // Encrypted
    scope: text("scope"),
    expiresAt: timestamp("expires_at"),
    status: connectionStatusEnum("status").notNull().default("active"),
    lastSyncedAt: timestamp("last_synced_at"),
    cursor: text("cursor"), // For incremental sync
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    orgProviderUnique: unique().on(table.orgId, table.provider),
  }),
);

// Sync run history
export const syncRuns = pgTable("sync_runs", {
  id: uuid("id").defaultRandom().primaryKey(),
  orgId: uuid("org_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  provider: crmProviderEnum("provider").notNull(),
  startedAt: timestamp("started_at").defaultNow().notNull(),
  finishedAt: timestamp("finished_at"),
  status: syncStatusEnum("status").notNull().default("pending"),
  countsJson: jsonb("counts_json"), // {contacts: 100, companies: 50, deals: 20}
  errorText: text("error_text"),
});

// Raw CRM data staging
export const rawObjects = pgTable("raw_objects", {
  id: uuid("id").defaultRandom().primaryKey(),
  orgId: uuid("org_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  provider: crmProviderEnum("provider").notNull(),
  objectType: text("object_type").notNull(), // contact, company, deal, etc
  externalId: text("external_id").notNull(),
  payloadJson: jsonb("payload_json").notNull(),
  systemModstamp: timestamp("system_modstamp"),
  firstSeenAt: timestamp("first_seen_at").defaultNow().notNull(),
  lastSeenAt: timestamp("last_seen_at").defaultNow().notNull(),
});

// Normalized tables
export const people = pgTable(
  "people",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    externalId: text("external_id").notNull(),
    provider: crmProviderEnum("provider").notNull(),
    email: text("email"),
    firstName: text("first_name"),
    lastName: text("last_name"),
    companyId: uuid("company_id"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    orgProviderExternalUnique: unique().on(table.orgId, table.provider, table.externalId),
  }),
);

export const companies = pgTable(
  "companies",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    externalId: text("external_id").notNull(),
    provider: crmProviderEnum("provider").notNull(),
    name: text("name").notNull(),
    domain: text("domain"),
    industry: text("industry"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    orgProviderExternalUnique: unique().on(table.orgId, table.provider, table.externalId),
  }),
);

export const opportunities = pgTable(
  "opportunities",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    externalId: text("external_id").notNull(),
    provider: crmProviderEnum("provider").notNull(),
    name: text("name").notNull(),
    companyId: uuid("company_id"),
    amount: integer("amount"), // Store as cents to avoid float issues
    stage: text("stage"),
    status: text("status"), // open, won, lost
    closeDate: timestamp("close_date"),
    source: text("source"), // Marketing source/campaign
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    orgProviderExternalUnique: unique().on(table.orgId, table.provider, table.externalId),
  }),
);

// Program mapping tables
export const programs = pgTable("programs", {
  id: uuid("id").defaultRandom().primaryKey(),
  orgId: uuid("org_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  color: text("color").default("#000000"),
  active: boolean("active").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Enum for rule types
export const ruleTypeEnum = pgEnum("rule_type", [
  "contains",
  "equals",
  "regex",
  "starts_with",
  "ends_with",
]);

export const programRules = pgTable("program_rules", {
  id: uuid("id").defaultRandom().primaryKey(),
  orgId: uuid("org_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  programId: uuid("program_id")
    .notNull()
    .references(() => programs.id, { onDelete: "cascade" }),
  ruleType: ruleTypeEnum("rule_type").notNull(),
  field: text("field").notNull(), // source, name, campaign, etc
  pattern: text("pattern").notNull(),
  enabled: boolean("enabled").default(true),
  priority: integer("priority").default(0), // Higher priority wins
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const recordPrograms = pgTable(
  "record_programs",
  {
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    recordType: text("record_type").notNull(), // opportunity, person, company
    recordId: uuid("record_id").notNull(),
    programId: uuid("program_id")
      .notNull()
      .references(() => programs.id, { onDelete: "cascade" }),
    confidence: integer("confidence").default(100), // 0-100
    assignedAt: timestamp("assigned_at").defaultNow().notNull(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.orgId, table.recordType, table.recordId] }),
  }),
);
