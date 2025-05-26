import { users, deposits, withdrawals, gameHistory, jackpot, farmCats, type User, type InsertUser, type Deposit, type InsertDeposit, type Withdrawal, type InsertWithdrawal, type GameHistory, type InsertGameHistory, type Jackpot, type FarmCat } from "@shared/schema";
import { db } from "../mysql-connection";
import { eq, desc } from "drizzle-orm";
import bcrypt from "bcrypt";

export class MySQLStorage {
  async getUser(id: number): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
    return result[0];
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.username, username)).limit(1);
    return result[0];
  }

  async createUser(user: InsertUser): Promise<User> {
    const hashedPassword = await bcrypt.hash(user.password, 10);
    const result = await db.insert(users).values({
      ...user,
      password: hashedPassword,
      balance: "1000.00",
      meowBalance: "0.00000000",
      isAdmin: false,
      isBanned: false,
    });

    const newUser = await this.getUser(result[0].insertId);
    if (!newUser) throw new Error("Failed to create user");
    return newUser;
  }

  async updateUserBalance(userId: number, balance: string, meowBalance?: string): Promise<void> {
    const updateData: any = { balance };
    if (meowBalance !== undefined) {
      updateData.meowBalance = meowBalance;
    }
    await db.update(users).set(updateData).where(eq(users.id, userId));
  }

  async createDeposit(deposit: InsertDeposit & { userId: number }): Promise<Deposit> {
    const result = await db.insert(deposits).values({
      ...deposit,
      status: "pending",
      receiptUrl: null,
    });

    const newDeposit = await db.select().from(deposits).where(eq(deposits.id, result[0].insertId)).limit(1);
    return newDeposit[0];
  }

  async getDeposits(): Promise<Deposit[]> {
    return await db.select().from(deposits).orderBy(desc(deposits.createdAt));
  }

  async updateDepositStatus(id: number, status: string): Promise<void> {
    await db.update(deposits).set({ status }).where(eq(deposits.id, id));

    if (status === "approved") {
      const deposit = await db.select().from(deposits).where(eq(deposits.id, id)).limit(1);
      if (deposit[0]) {
        const user = await this.getUser(deposit[0].userId);
        if (user) {
          const newBalance = (parseFloat(user.balance) + parseFloat(deposit[0].amount)).toFixed(2);
          await this.updateUserBalance(deposit[0].userId, newBalance);
        }
      }
    }
  }

  async createWithdrawal(withdrawal: InsertWithdrawal & { userId: number }): Promise<Withdrawal> {
    const result = await db.insert(withdrawals).values({
      ...withdrawal,
      status: "pending",
    });

    const newWithdrawal = await db.select().from(withdrawals).where(eq(withdrawals.id, result[0].insertId)).limit(1);
    return newWithdrawal[0];
  }

  async getWithdrawals(): Promise<Withdrawal[]> {
    return await db.select().from(withdrawals).orderBy(desc(withdrawals.createdAt));
  }

  async updateWithdrawalStatus(id: number, status: string): Promise<void> {
    await db.update(withdrawals).set({ status }).where(eq(withdrawals.id, id));
  }

  async createGameHistory(game: InsertGameHistory & { userId: number }): Promise<GameHistory> {
    const result = await db.insert(gameHistory).values({
      ...game,
      winAmount: game.winAmount || "0.00",
      meowWon: game.meowWon || "0.00000000",
      result: game.result || null,
    });

    // Update jackpot based on losses
    if (parseFloat(game.winAmount || "0") === 0) {
      const currentJackpot = await this.getJackpot();
      // 1 MEOW per 7000 coins lost (1/7000 = 0.00014286 MEOW per coin)
      const jackpotIncrease = parseFloat(game.betAmount) * 0.00014286;
      const newAmount = (parseFloat(currentJackpot.amount) + jackpotIncrease).toFixed(8);
      await this.updateJackpot(newAmount);
    }

    const newGame = await db.select().from(gameHistory).where(eq(gameHistory.id, result[0].insertId)).limit(1);
    return newGame[0];
  }

  async getGameHistory(userId?: number): Promise<GameHistory[]> {
    if (userId) {
      return await db.select().from(gameHistory).where(eq(gameHistory.userId, userId)).orderBy(desc(gameHistory.createdAt));
    }
    return await db.select().from(gameHistory).orderBy(desc(gameHistory.createdAt));
  }

  async getJackpot(): Promise<Jackpot> {
    const result = await db.select().from(jackpot).limit(1);
    if (result.length === 0) {
      // Create initial jackpot if none exists
      await db.insert(jackpot).values({
        amount: "0.10000000",
        lastWinnerId: null,
        lastWonAt: null,
      });
      return await this.getJackpot();
    }
    return result[0];
  }

  async updateJackpot(amount: string, winnerId?: number): Promise<void> {
    const updateData: any = { amount, updatedAt: new Date() };
    if (winnerId) {
      updateData.lastWinnerId = winnerId;
      updateData.lastWonAt = new Date();
    }
    await db.update(jackpot).set(updateData).where(eq(jackpot.id, 1));
  }

  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users).orderBy(desc(users.createdAt));
  }

  async banUser(userId: number, banned: boolean): Promise<void> {
    await db.update(users).set({ isBanned: banned }).where(eq(users.id, userId));
  }

  async getFarmData(userId: number): Promise<any> {
    const cats = await db.select().from(farmCats).where(eq(farmCats.userId, userId));

    let totalProduction = 0;
    let unclaimedMeow = 0;

    const now = new Date();

    const catsWithRewards = cats.map(cat => {
      const timeSinceLastClaim = (now.getTime() - new Date(cat.lastClaim).getTime()) / (1000 * 60 * 60); // hours
      const rewards = parseFloat(cat.production) * timeSinceLastClaim;
      totalProduction += parseFloat(cat.production);
      unclaimedMeow += rewards;

      return {
        id: cat.id.toString(),
        catId: cat.catId,
        level: cat.level,
        lastClaim: cat.lastClaim.toISOString(),
        production: parseFloat(cat.production)
      };
    });

    return {
      cats: catsWithRewards,
      totalProduction,
      unclaimedMeow: unclaimedMeow.toFixed(8)
    };
  }

  async createFarmCat(data: { userId: number; catId: string; production: number }): Promise<any> {
    const result = await db.insert(farmCats).values({
      userId: data.userId,
      catId: data.catId,
      level: 1,
      production: data.production.toString(),
      lastClaim: new Date(),
    });

    const newCat = await db.select().from(farmCats).where(eq(farmCats.id, result[0].insertId)).limit(1);
    return newCat[0];
  }

  async getFarmCat(id: number): Promise<any> {
    const result = await db.select().from(farmCats).where(eq(farmCats.id, id)).limit(1);
    return result[0];
  }

  async upgradeFarmCat(id: number, level: number, production: number): Promise<void> {
    await db.update(farmCats).set({
      level,
      production: production.toString()
    }).where(eq(farmCats.id, id));
  }

  async claimFarmRewards(userId: number): Promise<void> {
    const now = new Date();
    await db.update(farmCats).set({
      lastClaim: now
    }).where(eq(farmCats.userId, userId));
  }
}