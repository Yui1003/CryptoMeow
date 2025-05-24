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
}

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

  async createDeposit(deposit: InsertDeposit & { userId: number }): Promise<Deposit> {
    const id = this.data.currentDepositId++;
    const newDeposit: Deposit = {
      ...deposit,
      id,
      status: "pending",
      receiptUrl: null,
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

  async createWithdrawal(withdrawal: InsertWithdrawal & { userId: number }): Promise<Withdrawal> {
    const id = this.data.currentWithdrawalId++;
    const newWithdrawal: Withdrawal = {
      ...withdrawal,
      id,
      status: "pending",
      createdAt: new Date(),
    };
    this.data.withdrawals.push(newWithdrawal);
    this.saveData();
    return newWithdrawal;
  }

  async getWithdrawals(): Promise<Withdrawal[]> {
    return this.data.withdrawals.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
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
      const jackpotIncrease = betAmount * 0.01; // 1% of losses go to jackpot
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
}