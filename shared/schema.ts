import { mysqlTable, text, int, boolean, decimal, timestamp, bigint } from "drizzle-orm/mysql-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = mysqlTable("users", {
  id: int("id").primaryKey().autoincrement(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  balance: decimal("balance", { precision: 12, scale: 2 }).notNull().default("1000.00"),
  meowBalance: decimal("meow_balance", { precision: 12, scale: 8 }).notNull().default("0.00000000"),
  isAdmin: boolean("is_admin").notNull().default(false),
  isBanned: boolean("is_banned").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const deposits = mysqlTable("deposits", {
  id: int("id").primaryKey().autoincrement(),
  userId: int("user_id").notNull(),
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  paymentMethod: text("payment_method").notNull(),
  receiptUrl: text("receipt_url"),
  status: text("status").notNull().default("pending"), // pending, approved, rejected
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const withdrawals = mysqlTable("withdrawals", {
  id: int("id").primaryKey().autoincrement(),
  userId: int("user_id").notNull(),
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  platform: text("platform").notNull(), // gcash, maya, bank_transfer, etc.
  accountInfo: text("account_info").notNull(), // JSON string with platform-specific info
  status: text("status").notNull().default("pending"), // pending, approved, rejected
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const gameHistory = mysqlTable("game_history", {
  id: int("id").primaryKey().autoincrement(),
  userId: int("user_id").notNull(),
  gameType: text("game_type").notNull(),
  betAmount: decimal("bet_amount", { precision: 12, scale: 2 }).notNull(),
  winAmount: decimal("win_amount", { precision: 12, scale: 2 }).notNull().default("0.00"),
  meowWon: decimal("meow_won", { precision: 12, scale: 8 }).notNull().default("0.00000000"),
  serverSeed: text("server_seed").notNull(),
  clientSeed: text("client_seed").notNull(),
  nonce: bigint("nonce", { mode: 'number' }).notNull(),
  result: text("result"), // JSON string of game result
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const jackpot = mysqlTable("jackpot", {
  id: int("id").primaryKey().autoincrement(),
  amount: decimal("amount", { precision: 12, scale: 8 }).notNull().default("0.10000000"),
  lastWinnerId: int("last_winner_id"),
  lastWonAt: timestamp("last_won_at"),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const farmCats = mysqlTable("farm_cats", {
  id: int("id").primaryKey().autoincrement(),
  userId: int("user_id").notNull(),
  catId: text("cat_id").notNull(), // References cat type
  level: int("level").notNull().default(1),
  production: decimal("production", { precision: 12, scale: 8 }).notNull(),
  lastClaim: timestamp("last_claim").notNull().defaultNow(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export const insertDepositSchema = z.object({
  amount: z.string().min(1, "Amount is required"),
  paymentMethod: z.string().min(1, "Payment method is required"),
  receiptUrl: z.string().optional(),
});

export const insertWithdrawalSchema = z.object({
  amount: z.string().min(1, "Amount is required"),
  platform: z.string().min(1, "Platform is required"),
  accountInfo: z.string().min(1, "Account information is required"),
});

export const insertGameHistorySchema = createInsertSchema(gameHistory).pick({
  gameType: true,
  betAmount: true,
  winAmount: true,
  meowWon: true,
  serverSeed: true,
  clientSeed: true,
  nonce: true,
  result: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertDeposit = z.infer<typeof insertDepositSchema>;
export type Deposit = typeof deposits.$inferSelect;
export type InsertWithdrawal = z.infer<typeof insertWithdrawalSchema>;
export type Withdrawal = typeof withdrawals.$inferSelect;
export type InsertGameHistory = z.infer<typeof insertGameHistorySchema>;
export type GameHistory = typeof gameHistory.$inferSelect;
export type Jackpot = typeof jackpot.$inferSelect;
export type FarmCat = typeof farmCats.$inferSelect;