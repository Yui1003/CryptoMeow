import fs from 'fs';
import path from 'path';
import { users, deposits, withdrawals, gameHistory, jackpot, type User, type InsertUser, type Deposit, type InsertDeposit, type Withdrawal, type InsertWithdrawal, type GameHistory, type InsertGameHistory, type Jackpot } from "@shared/schema";
import bcrypt from "bcrypt";

interface StorageData {
  users: User[];
  deposits: Deposit[];
  withdrawals: Withdrawal[];
  gameHistory: GameHistory[];
  jackpot: Jackpot;
  currentUserId: number;
  currentDepositId: number;
  currentWithdrawalId: number;
  currentGameHistoryId: number;
  farmCats: FarmCat[];
  currentFarmCatId: number;
}

interface FarmCat {
  id: number;
  userId: number;
  catId: string;
  level: number;
  production: number;
  lastClaim: Date;
  createdAt: Date;
  happiness: number;
  name?: string;
}

const CAT_TYPES = [
  { id: "basic", baseProduction: 0.001 },
  { id: "farm", baseProduction: 0.002 },
  { id: "business", baseProduction: 0.005 },
  { id: "ninja", baseProduction: 0.008 },
  { id: "cyber", baseProduction: 0.015 },
  { id: "golden", baseProduction: 0.05 }
];

export class FileStorage {
  private dataFile: string;
  private data!: StorageData;

  constructor() {
    this.dataFile = path.join(process.cwd(), 'casino-data.json');
    this.loadData();
  }

  private loadData() {
    try {
      if (fs.existsSync(this.dataFile)) {
        const fileContent = fs.readFileSync(this.dataFile, 'utf8');
        this.data = JSON.parse(fileContent);
        // Convert date strings back to Date objects
        this.data.users.forEach(user => {
          user.createdAt = new Date(user.createdAt);
        });
        this.data.deposits.forEach(deposit => {
          deposit.createdAt = new Date(deposit.createdAt);
        });
        this.data.withdrawals.forEach(withdrawal => {
          withdrawal.createdAt = new Date(withdrawal.createdAt);
        });
        this.data.gameHistory.forEach(game => {
          game.createdAt = new Date(game.createdAt);
        });
        if (this.data.jackpot.lastWonAt) {
          this.data.jackpot.lastWonAt = new Date(this.data.jackpot.lastWonAt);
        }
        this.data.jackpot.updatedAt = new Date(this.data.jackpot.updatedAt);

        if (this.data.farmCats) {
          this.data.farmCats.forEach(cat => {
            cat.lastClaim = new Date(cat.lastClaim);
            cat.createdAt = new Date(cat.createdAt);
          });
        } else {
          this.data.farmCats = [];
          this.data.currentFarmCatId = 1;
        }
      } else {
        this.data = {
          users: [],
          deposits: [],
          withdrawals: [],
          gameHistory: [],
          jackpot: {
            id: 1,
            amount: "0.10000000",
            lastWinnerId: null,
            lastWonAt: null,
            updatedAt: new Date(),
          },
          currentUserId: 1,
          currentDepositId: 1,
          currentWithdrawalId: 1,
          currentGameHistoryId: 1,
          farmCats: [],
          currentFarmCatId: 1,
        };
        this.initializeAdminUser();
      }
    } catch (error) {
      console.error('Error loading data:', error);
      this.data = {
        users: [],
        deposits: [],
        withdrawals: [],
        gameHistory: [],
        jackpot: {
          id: 1,
          amount: "0.10000000",
          lastWinnerId: null,
          lastWonAt: null,
          updatedAt: new Date(),
        },
        currentUserId: 1,
        currentDepositId: 1,
        currentWithdrawalId: 1,
        currentGameHistoryId: 1,
        farmCats: [],
        currentFarmCatId: 1,
      };
      this.initializeAdminUser();
    }
  }

  private async initializeAdminUser() {
    const adminExists = this.data.users.find(user => user.username === "admin");
    if (!adminExists) {
      const hashedPassword = await bcrypt.hash("admin1234", 10);
      const adminUser: User = {
        id: this.data.currentUserId++,
        username: "admin",
        password: hashedPassword,
        balance: "10000.00",
        meowBalance: "1.00000000",
        isAdmin: true,
        isBanned: false,
        createdAt: new Date(),
      };
      this.data.users.push(adminUser);
      this.saveData();
    }
  }

  private saveData() {
    try {
      fs.writeFileSync(this.dataFile, JSON.stringify(this.data, null, 2));
    } catch (error) {
      console.error('Error saving data:', error);
    }
  }

  async getUser(id: number): Promise<User | undefined> {
    return this.data.users.find(user => user.id === id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return this.data.users.find(user => user.username === username);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const hashedPassword = await bcrypt.hash(insertUser.password, 10);
    const id = this.data.currentUserId++;
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
    this.data.users.push(user);
    this.saveData();
    return user;
  }

  async updateUserBalance(userId: number, balance: string, meowBalance?: string): Promise<void> {
    const user = this.data.users.find(u => u.id === userId);
    if (user) {
      user.balance = balance;
      if (meowBalance !== undefined) {
        user.meowBalance = meowBalance;
      }
      this.saveData();
    }
  }

  async createDeposit(deposit: InsertDeposit & { userId: number; receiptUrl?: string }): Promise<Deposit> {
    const id = this.data.currentDepositId++;
    const newDeposit: Deposit = {
      ...deposit,
      id,
      status: "pending",
      receiptUrl: deposit.receiptUrl || null,
      createdAt: new Date(),
    };
    this.data.deposits.push(newDeposit);
    this.saveData();
    return newDeposit;
  }

  async getDeposits(): Promise<Deposit[]> {
    return this.data.deposits.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async updateDepositStatus(id: number, status: string): Promise<void> {
    const deposit = this.data.deposits.find(d => d.id === id);
    if (deposit) {
      deposit.status = status;

      // If approved, update user balance
      if (status === "approved") {
        const user = this.data.users.find(u => u.id === deposit.userId);
        if (user) {
          const newBalance = (parseFloat(user.balance) + parseFloat(deposit.amount)).toFixed(2);
          await this.updateUserBalance(deposit.userId, newBalance);
        }
      }
      this.saveData();
    }
  }

  async createWithdrawal(withdrawal: InsertWithdrawal & { userId: number; platform: string; accountInfo: string }): Promise<Withdrawal> {
    const id = this.data.currentWithdrawalId++;
    const newWithdrawal: Withdrawal = {
      ...withdrawal,
      id,
      platform: withdrawal.platform,
      accountInfo: withdrawal.accountInfo,
      status: "pending",
      createdAt: new Date(),
    };
    this.data.withdrawals.push(newWithdrawal);
    this.saveData();
    return newWithdrawal;
  }

  async getWithdrawal(id: number): Promise<Withdrawal | undefined> {
    return this.data.withdrawals.find(w => w.id === id);
  }

  async getWithdrawals(): Promise<Withdrawal[]> {
    return this.data.withdrawals.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async getUserWithdrawals(userId: number): Promise<Withdrawal[]> {
    return this.data.withdrawals
      .filter(withdrawal => withdrawal.userId === userId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async updateWithdrawalStatus(id: number, status: string): Promise<void> {
    const withdrawal = this.data.withdrawals.find(w => w.id === id);
    if (withdrawal) {
      withdrawal.status = status;
      this.saveData();
    }
  }

  async createGameHistory(game: InsertGameHistory & { userId: number }): Promise<GameHistory> {
    const id = this.data.currentGameHistoryId++;
    const newGame: GameHistory = {
      ...game,
      id,
      winAmount: game.winAmount || "0.00",
      meowWon: game.meowWon || "0.00000000",
      result: game.result || null,
      createdAt: new Date(),
    };
    this.data.gameHistory.push(newGame);

    // Update jackpot based on losses
    if (parseFloat(game.winAmount || "0") === 0) {
      const currentJackpot = parseFloat(this.data.jackpot.amount);
      const betAmount = parseFloat(game.betAmount);
      // 1 MEOW per 7000 coins lost (1/7000 = 0.00014286 MEOW per coin)
      const jackpotIncrease = betAmount * 0.00014286;
      this.data.jackpot.amount = (currentJackpot + jackpotIncrease).toFixed(8);
      this.data.jackpot.updatedAt = new Date();
    }

    this.saveData();
    return newGame;
  }

  async getGameHistory(userId?: number): Promise<GameHistory[]> {
    if (userId) {
      return this.data.gameHistory.filter(game => game.userId === userId).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    }
    return this.data.gameHistory.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async getJackpot(): Promise<Jackpot> {
    return this.data.jackpot;
  }

  async updateJackpot(amount: string, winnerId?: number): Promise<void> {
    this.data.jackpot.amount = amount;
    if (winnerId) {
      this.data.jackpot.lastWinnerId = winnerId;
      this.data.jackpot.lastWonAt = new Date();
    }
    this.data.jackpot.updatedAt = new Date();
    this.saveData();
  }

  async getAllUsers(): Promise<User[]> {
    return this.data.users.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async banUser(userId: number, banned: boolean): Promise<void> {
    const user = this.data.users.find(u => u.id === userId);
    if (user) {
      user.isBanned = banned;
      this.saveData();
    }
  }

  async getFarmData(userId: number): Promise<any> {
    if (!this.data.farmCats) {
      this.data.farmCats = [];
    }
    const userCats = this.data.farmCats.filter(cat => cat.userId === userId);

    let totalProduction = 0;
    let unclaimedMeow = 0;
    const now = new Date();

    const catsWithProduction = this.data.farmCats
      .filter(cat => cat.userId === userId)
      .map(cat => {
        const timeSinceLastClaim = (now.getTime() - new Date(cat.lastClaim).getTime()) / (1000 * 60 * 60); // hours
        const baseRewards = parseFloat(cat.production) * timeSinceLastClaim;

        // Apply happiness multiplier (50% base = 1x, 100% = 1.5x, 0% = 0.5x)
        const happiness = cat.happiness || 50;
        const happinessMultiplier = 0.5 + (happiness / 100);
        const rewards = baseRewards * happinessMultiplier;

        totalProduction += parseFloat(cat.production) * happinessMultiplier;
        unclaimedMeow += rewards;

        return {
          id: cat.id.toString(),
          catId: cat.catId,
          level: cat.level,
          lastClaim: cat.lastClaim.toISOString(),
          production: parseFloat(cat.production) * happinessMultiplier,
          happiness: cat.happiness || 50,
          name: cat.name || null
        };
      });

    return {
      cats: catsWithProduction,
      totalProduction,
      unclaimedMeow: unclaimedMeow.toFixed(8)
    };
  }

  async createFarmCat(data: { userId: number; catId: string; production: number }): Promise<any> {
    if (!this.data.farmCats) {
      this.data.farmCats = [];
    }
    if (!this.data.currentFarmCatId) {
      this.data.currentFarmCatId = 1;
    }

    const id = this.data.currentFarmCatId++;
    const now = new Date();

    const farmCat: FarmCat = {
      id,
      userId: data.userId,
      catId: data.catId,
      level: 1,
      production: data.production,
      lastClaim: now,
      createdAt: now,
      happiness: 50,
    };

    this.data.farmCats.push(farmCat);
    this.saveData();
    return farmCat;
  }

  async getFarmCat(id: number): Promise<any> {
    return this.data.farmCats.find(cat => cat.id === id) || null;
  }

  async upgradeFarmCat(id: number, level: number, production: number): Promise<void> {
    const catIndex = this.data.farmCats.findIndex(cat => cat.id === id);
    if (catIndex !== -1) {
      this.data.farmCats[catIndex].level = level;
      this.data.farmCats[catIndex].production = production;
      this.saveData();
    }
  }

  async claimFarmRewards(userId: number): Promise<void> {
    const now = new Date();
    this.data.farmCats.forEach(cat => {
      if (cat.userId === userId) {
        cat.lastClaim = now;
      }
    });
    this.saveData();
  }

  async updateCatHappiness(catId: number, happiness: number): Promise<void> {
    const catIndex = this.data.farmCats.findIndex(cat => cat.id === catId);
    if (catIndex !== -1) {
      this.data.farmCats[catIndex].happiness = happiness;
      this.saveData();
    }
  }


  async getFarmCat(catId: number): Promise<FarmCat | null> {
    return this.data.farmCats.find(cat => cat.id === catId) || null;
  }
}