import { pgTable, text, serial, timestamp, integer, boolean } from "drizzle-orm/pg-core";

export const ordersTable = pgTable("orders", {
  id: serial("id").primaryKey(),
  planType: text("plan_type").notNull(), // "premium" | "sharing"
  paymentMethod: text("payment_method").notNull(), // "bank" | "crypto"
  amount: integer("amount").notNull(), // in PKR or USD cents
  currency: text("currency").notNull().default("PKR"),
  status: text("status").notNull().default("pending"), // pending | approved | rejected
  buyerName: text("buyer_name").notNull(),
  buyerContact: text("buyer_contact").notNull(), // phone/email
  txnRef: text("txn_ref"), // bank txn id or crypto txn hash
  screenshotUrl: text("screenshot_url"),
  generatedCode: text("generated_code"),
  maxUsers: integer("max_users").notNull().default(1), // 1 for premium, N for sharing
  adminNote: text("admin_note"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at"),
});

export type Order = typeof ordersTable.$inferSelect;
