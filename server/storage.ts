import { users, deposits, withdrawals, gameHistory, jackpot, farmCats, type User, type InsertUser, type Deposit, type InsertDeposit, type Withdrawal, type InsertWithdrawal, type GameHistory, type InsertGameHistory, type Jackpot } from "@shared/schema";
import { FileStorage } from "./fileStorage";
import bcrypt from "bcrypt";

export interface IStorage {
  init(): Promise<void>;
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUserBalance(userId: number, balance: string, meowBalance?: string): Promise<void>;

  createDeposit(deposit: InsertDeposit & { userId: number }): Promise<Deposit>;
  getDeposits(): Promise<Deposit[]>;
  updateDepositStatus(id: number, status: string): Promise<void>;

  createWithdrawal(withdrawal: InsertWithdrawal & { userId: number }): Promise<Withdrawal>;
  getWithdrawal(id: number): Promise<Withdrawal | undefined>;
  getWithdrawals(): Promise<Withdrawal[]>;
  getUserWithdrawals(userId: number): Promise<Withdrawal[]>;
  updateWithdrawalStatus(id: number, status: string): Promise<void>;

  createGameHistory(game: InsertGameHistory & { userId: number }): Promise<GameHistory>;
  getGameHistory(userId?: number): Promise<GameHistory[]>;

  getJackpot(): Promise<Jackpot>;
  updateJackpot(amount: string, winnerId?: number): Promise<void>;

  getAllUsers(): Promise<User[]>;
  banUser(userId: number, banned: boolean): Promise<void>;

  getFarmData(userId: number): Promise<any>;
  createFarmCat(data: { userId: number; catId: string; production: number }): Promise<any>;
  getFarmCat(id: number): Promise<any>;
  upgradeFarmCat(id: number, level: number, production: number): Promise<void>;
  claimFarmRewards(userId: number): Promise<void>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private deposits: Map<number, Deposit>;
  private withdrawals: Map<number, Withdrawal>;
  private gameHistoryEntries: Map<number, GameHistory>;
  private jackpotData: Jackpot;
  private currentUserId: number;
  private currentDepositId: number;
  private currentWithdrawalId: number;
  private currentGameHistoryId: number;

  constructor() {
    this.users = new Map();
    this.deposits = new Map();
    this.withdrawals = new Map();
    this.gameHistoryEntries = new Map();
    this.currentUserId = 1;
    this.currentDepositId = 1;
    this.currentWithdrawalId = 1;
    this.currentGameHistoryId = 1;

    // Initialize jackpot
    this.jackpotData = {
      id: 1,
      amount: "0.10000000",
      lastWinnerId: null,
      lastWonAt: null,
      updatedAt: new Date(),
    };

    // Create admin user
    this.initializeAdminUser();
  }

  async init(): Promise<void> {
    // MemStorage initialization is done in constructor
    return Promise.resolve();
  }

  private async initializeAdminUser() {
    const hashedPassword = await bcrypt.hash("admin1234", 10);
    const adminUser: User = {
      id: this.currentUserId++,
      username: "admin",
      password: hashedPassword,
      balance: "10000.00",
      meowBalance: "1.00000000",
      isAdmin: true,
      isBanned: false,
      createdAt: new Date(),
    };
    this.users.set(adminUser.id, adminUser);
  }

  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const hashedPassword = await bcrypt.hash(insertUser.password, 10);
    const id = this.currentUserId++;
    const user: User = { 
      ...insertUser, 
      id, 
      password: hashedPassword,
      balance: "1000.00",
      meowBalance: "0.00000000",
      isAdmin: false,
      isBanned: false,
      createdAt: new Date(),
    };
    this.users.set(id, user);
    return user;
  }

  async updateUserBalance(userId: number, balance: string, meowBalance?: string): Promise<void> {
    const user = this.users.get(userId);
    if (user) {
      user.balance = balance;
      if (meowBalance !== undefined) {
        user.meowBalance = meowBalance;
      }
      this.users.set(userId, user);
    }
  }

  async createDeposit(deposit: InsertDeposit & { userId: number; receiptUrl?: string }): Promise<Deposit> {
    const id = this.currentDepositId++;
    const newDeposit: Deposit = {
      ...deposit,
      id,
      status: "pending",
      receiptUrl: deposit.receiptUrl || null,
      createdAt: new Date(),
    };
    this.deposits.set(id, newDeposit);
    return newDeposit;
  }

  async getDeposits(): Promise<Deposit[]> {
    return Array.from(this.deposits.values()).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async updateDepositStatus(id: number, status: string): Promise<void> {
    const deposit = this.deposits.get(id);
    if (deposit) {
      deposit.status = status;
      this.deposits.set(id, deposit);

      // If approved, update user balance
      if (status === "approved") {
        const user = this.users.get(deposit.userId);
        if (user) {
          const newBalance = (parseFloat(user.balance) + parseFloat(deposit.amount)).toFixed(2);
          await this.updateUserBalance(deposit.userId, newBalance);
        }
      }
    }
  }

  async createWithdrawal(withdrawal: InsertWithdrawal & { userId: number; platform: string; accountInfo: string }): Promise<Withdrawal> {
    const id = this.currentWithdrawalId++;
    const newWithdrawal: Withdrawal = {
      ...withdrawal,
      id,
      platform: withdrawal.platform,
      accountInfo: withdrawal.accountInfo,
      status: "pending",
      createdAt: new Date(),
    };
    this.withdrawals.set(id, newWithdrawal);
    return newWithdrawal;
  }

  async getWithdrawal(id: number): Promise<Withdrawal | undefined> {
    return this.withdrawals.get(id);
  }

  async getWithdrawals(): Promise<Withdrawal[]> {
    return Array.from(this.withdrawals.values()).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async getUserWithdrawals(userId: number): Promise<Withdrawal[]> {
    return Array.from(this.withdrawals.values())
      .filter(withdrawal => withdrawal.userId === userId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async updateWithdrawalStatus(id: number, status: string): Promise<void> {
    const withdrawal = this.withdrawals.get(id);
    if (withdrawal) {
      withdrawal.status = status;
      this.withdrawals.set(id, withdrawal);
    }
  }

  async createGameHistory(game: InsertGameHistory & { userId: number }): Promise<GameHistory> {
    const id = this.currentGameHistoryId++;
    const newGame: GameHistory = {
      ...game,
      id,
      winAmount: game.winAmount || "0.00",
      meowWon: game.meowWon || "0.00000000",
      result: game.result || null,
      createdAt: new Date(),
    };
    this.gameHistoryEntries.set(id, newGame);

    // Update jackpot based on losses
    if (parseFloat(game.winAmount || "0") === 0) {
      const currentJackpot = parseFloat(this.jackpotData.amount);
      const betAmount = parseFloat(game.betAmount);
      const jackpotIncrease = betAmount * 0.01; // 1% of losses go to jackpot
      this.jackpotData.amount = (currentJackpot + jackpotIncrease).toFixed(8);
      this.jackpotData.updatedAt = new Date();
    }

    return newGame;
  }

  async getGameHistory(userId?: number): Promise<GameHistory[]> {
    const history = Array.from(this.gameHistoryEntries.values());
    if (userId) {
      return history.filter(game => game.userId === userId).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    }
    return history.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async getJackpot(): Promise<Jackpot> {
    return this.jackpotData;
  }

  async updateJackpot(amount: string, winnerId?: number): Promise<void> {
    this.jackpotData.amount = amount;
    if (winnerId) {
      this.jackpotData.lastWinnerId = winnerId;
      this.jackpotData.lastWonAt = new Date();
    }
    this.jackpotData.updatedAt = new Date();
  }

  async getAllUsers(): Promise<User[]> {
    return Array.from(this.users.values()).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async banUser(userId: number, banned: boolean): Promise<void> {
    const user = this.users.get(userId);
    if (user) {
      user.isBanned = banned;
      this.users.set(userId, user);
    }
  }

  async getFarmData(userId: number): Promise<any> {
    return {
      cats: [],
      totalProduction: 0,
      unclaimedMeow: "0.00000000"
    };
  }

  async createFarmCat(data: { userId: number; catId: string; production: number }): Promise<any> {
    return null;
  }

  async getFarmCat(id: number): Promise<any> {
    return null;
  }

  async upgradeFarmCat(id: number, level: number, production: number): Promise<void> {
    // Placeholder implementation
  }

  async claimFarmRewards(userId: number): Promise<void> {
    // Placeholder implementation
  }
}

export const storage = new FileStorage();