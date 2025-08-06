import { pgTable, text, serial, integer, boolean, timestamp, decimal, uuid, jsonb, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const tools = pgTable("tools", {
  id: uuid("id").primaryKey(),
  toolId: integer("tool_id").notNull().unique(),
  name: text("name").notNull(),
  description: text("description"),
  path: text("path"),
  config: jsonb("config"),
  primaryActionLabel: text("primary_action_label"),
  selectiveActionLabel: boolean("selective_action_label").default(false),
  hasSelectiveActions: boolean("has_selective_actions").default(false),
  showWithGreeting: boolean("show_with_greeting").default(false),
  showInToolbox: boolean("show_in_toolbox").default(false),
  sortOrder: integer("sort_order").default(999),
  icon: text("icon"), // Lucide icon name for the tool
  summarizeable: boolean("summarizeable").default(true),
  onClickEventSelectedAircraftEqTrue: text("on_click_event_selected_aircraft_eq_true"), // Event when aircraft is selected
  onClickEventSelectedAircraftEqFalse: text("on_click_event_selected_aircraft_eq_false"), // Event when no aircraft selected
  bypassSelectiveActionWhenAircraftSelected: boolean("bypassselectiveactionwhenaircraftiselected").default(false),
  createdAt: timestamp("created_at").defaultNow()
});

export const tags = pgTable("tags", {
  id: uuid("id").primaryKey(),
  name: text("name").notNull().unique()
});

export const toolTags = pgTable("tool_tags", {
  toolId: uuid("tool_id").references(() => tools.id, { onDelete: 'cascade' }),
  tagId: uuid("tag_id").references(() => tags.id, { onDelete: 'cascade' })
}, (t) => ({
  primaryKey: [t.toolId, t.tagId],
}));

export const highlightedTools = pgTable("highlighted_tools", {
  toolId: uuid("tool_id").references(() => tools.id, { onDelete: 'cascade' }).primaryKey(),
  priority: integer("priority").default(1)
});

export const toolSelectiveActionPrompts = pgTable("tool_selective_action_prompts", {
  id: serial("id").primaryKey(),
  toolId: integer("tool_id").notNull(),
  promptValue: text("prompt_value").notNull(),
  inactiveLabel: text("inactive_label"), // Label to show when action is inactive/disabled
  activeEventHandler: text("active_event_handler"), // Handler function to determine if button should be active
  cssClasses: text("css_classes"), // CSS classes for status-based styling
  createdAt: timestamp("created_at").defaultNow(),
  actionId: serial("action_id"),
  actionLevel: integer("action_level").default(1),
  onClickEvent: text("on_click_event"), // Function name to call when clicked
  allowDoubleClick: boolean("allow_double_click").default(false) // Allow double-click interactions
});

export const roles = pgTable("roles", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const users = pgTable("users", {
  id: text("id").primaryKey(),
  accountId: text("AccountId").default("979492c8-eb25-4c52-973f-6ae037aed999"),
  firstName: text("FirstName"),
  lastName: text("LastName"),
  email: text("email").unique(),
  phone: text("phone").unique(),
  isEmailVerified: boolean("is_email_verified").default(false),
  isPhoneVerified: boolean("is_phone_verified").default(false),
  signUpMethod: text("sign_up_method", { enum: ["EMAIL", "PHONE"] }).notNull(),
  roleId: integer("role_id").references(() => roles.id),
  profilePhoto: text("profile_photo"), // Base64 encoded image
  inputPreference: text("input_preference", { enum: ["VOICE", "KEYBOARD"] }).default("KEYBOARD"),
  
  // Stripe subscription fields
  stripeCustomerId: text("stripe_customer_id"),
  stripeSubscriptionId: text("stripe_subscription_id"),
  subscriptionStatus: text("subscription_status", { enum: ["active", "canceled", "incomplete", "trialing", "past_due"] }),
  subscriptionPlan: text("subscription_plan"),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const conversationHistory = pgTable("conversation_history", {
  id: serial("id").primaryKey(),
  threadId: text("threadid"),
  messageText: text("messagetext"),
  messageType: text("messagetype"),
  createdAt: timestamp("createdat").defaultNow(),
  // Legacy fields for compatibility
  userid: text("userid"),
  userPrompt: text("user_prompt"),
  agentResponse: text("agent_response"),
  timestamp: timestamp("timestamp").defaultNow(),
  rank: integer("rank"),
  toolContext: text("tool_context"),
  sessionId: text("session_id")
});

export const userContacts = pgTable("user_contacts", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id),
  name: text("name").notNull(),
  email: text("email"),
  phone: text("phone"),
  role: text("role"),
  company: text("company"),
  notes: text("notes"),
  rolesByInvitingParty: text("roles_by_inviting_party"),
  invitationStatus: text("invitation_status", { 
    enum: ["Invited", "Accepted", "Declined", "Expired"] 
  }).default("Invited"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

export const conversationSummaries = pgTable("conversation_summaries", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id),
  summary: text("summary").notNull(),
  conversationThreadId: text("conversation_thread_id"), // Links related conversation messages
  messageCount: integer("message_count").default(0),
  toolContext: text("tool_context"), // Which tool generated this conversation
  selectedAircraft: text("selected_aircraft"), // JSON string of selected aircraft data
  createdAt: timestamp("created_at").defaultNow(),
});

export const subscriptionPlans = pgTable("subscription_plans", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  price: integer("price").notNull(), // in cents
  currency: text("currency").default("usd"),
  interval: text("interval", { enum: ["month", "year"] }).notNull(),
  stripePriceId: text("stripe_price_id").notNull(),
  features: text("features").array(),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  email: true,
  phone: true,
  signUpMethod: true,
  roleId: true,
});

export const insertConversationSchema = createInsertSchema(conversationHistory).omit({
  id: true,
  createdAt: true,
});

export const insertContactSchema = createInsertSchema(userContacts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertSummarySchema = createInsertSchema(conversationSummaries).omit({
  id: true,
  createdAt: true,
});

export const insertRoleSchema = createInsertSchema(roles).pick({
  name: true,
  description: true,
});

export type InsertRole = z.infer<typeof insertRoleSchema>;
export type Role = typeof roles.$inferSelect;

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type InsertConversation = z.infer<typeof insertConversationSchema>;
export type ConversationHistory = typeof conversationHistory.$inferSelect;

export type InsertContact = z.infer<typeof insertContactSchema>;
export type UserContact = typeof userContacts.$inferSelect;

export type InsertSummary = z.infer<typeof insertSummarySchema>;
export type ConversationSummary = typeof conversationSummaries.$inferSelect;

export type SubscriptionPlan = typeof subscriptionPlans.$inferSelect;
