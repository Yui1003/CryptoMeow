import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import bcrypt from "bcrypt";
import session from "express-session";
import { insertUserSchema, insertDepositSchema, insertWithdrawalSchema, insertGameHistorySchema } from "@shared/schema";
import { z } from "zod";

declare module 'express-session' {
  interface SessionData {
    userId?: number;
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Session middleware
  app.use(session({
    secret: process.env.SESSION_SECRET || 'cryptomeow-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false, maxAge: 24 * 60 * 60 * 1000 } // 24 hours
  }));

  // Auth middleware
  const requireAuth = (req: any, res: any, next: any) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "Authentication required" });
    }
    next();
  };

  const requireAdmin = async (req: any, res: any, next: any) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "Authentication required" });
    }
    
    const user = await storage.getUser(req.session.userId);
    if (!user || !user.isAdmin) {
      return res.status(403).json({ message: "Admin access required" });
    }
    next();
  };

  // Auth routes
  app.post("/api/auth/register", async (req, res) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      
      // Check if username already exists
      const existingUser = await storage.getUserByUsername(userData.username);
      if (existingUser) {
        return res.status(400).json({ message: "Username already exists" });
      }

      const user = await storage.createUser(userData);
      req.session.userId = user.id;
      
      const { password, ...userWithoutPassword } = user;
      res.json({ user: userWithoutPassword });
    } catch (error) {
      console.error("Registration error:", error);
      res.status(400).json({ message: "Invalid registration data" });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const { username, password } = req.body;
      
      const user = await storage.getUserByUsername(username);
      if (!user) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      if (user.isBanned) {
        return res.status(403).json({ message: "Account is banned" });
      }

      const validPassword = await bcrypt.compare(password, user.password);
      if (!validPassword) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      req.session.userId = user.id;
      
      const { password: _, ...userWithoutPassword } = user;
      res.json({ user: userWithoutPassword });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ message: "Login failed" });
    }
  });

  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ message: "Logout failed" });
      }
      res.json({ message: "Logged out successfully" });
    });
  });

  app.get("/api/auth/me", async (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    const user = await storage.getUser(req.session.userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const { password, ...userWithoutPassword } = user;
    res.json({ user: userWithoutPassword });
  });

  // User routes
  app.get("/api/user/balance", requireAuth, async (req, res) => {
    const user = await storage.getUser(req.session.userId!);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    
    res.json({ 
      balance: user.balance, 
      meowBalance: user.meowBalance 
    });
  });

  app.post("/api/user/convert-meow", requireAuth, async (req, res) => {
    try {
      const { meowAmount } = req.body;
      const meowToConvert = parseFloat(meowAmount);
      
      if (meowToConvert <= 0) {
        return res.status(400).json({ message: "Invalid amount" });
      }

      const user = await storage.getUser(req.session.userId!);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const currentMeow = parseFloat(user.meowBalance);
      if (currentMeow < meowToConvert) {
        return res.status(400).json({ message: "Insufficient MEOW balance" });
      }

      const coinsToAdd = meowToConvert * 5000; // 1 MEOW = 5000 coins
      const newBalance = (parseFloat(user.balance) + coinsToAdd).toFixed(2);
      const newMeowBalance = (currentMeow - meowToConvert).toFixed(8);

      await storage.updateUserBalance(req.session.userId!, newBalance, newMeowBalance);
      
      res.json({ 
        balance: newBalance, 
        meowBalance: newMeowBalance,
        converted: coinsToAdd
      });
    } catch (error) {
      console.error("Conversion error:", error);
      res.status(500).json({ message: "Conversion failed" });
    }
  });

  // Deposit routes
  app.post("/api/deposits", requireAuth, async (req, res) => {
    try {
      const depositData = insertDepositSchema.parse(req.body);
      const deposit = await storage.createDeposit({
        ...depositData,
        userId: req.session.userId!
      });
      
      res.json(deposit);
    } catch (error) {
      console.error("Deposit error:", error);
      res.status(400).json({ message: "Invalid deposit data" });
    }
  });

  app.get("/api/deposits", requireAdmin, async (req, res) => {
    try {
      const deposits = await storage.getDeposits();
      res.json(deposits);
    } catch (error) {
      console.error("Get deposits error:", error);
      res.status(500).json({ message: "Failed to get deposits" });
    }
  });

  app.patch("/api/deposits/:id/status", requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body;
      
      if (!["approved", "rejected"].includes(status)) {
        return res.status(400).json({ message: "Invalid status" });
      }

      await storage.updateDepositStatus(parseInt(id), status);
      res.json({ message: "Deposit status updated" });
    } catch (error) {
      console.error("Update deposit status error:", error);
      res.status(500).json({ message: "Failed to update deposit status" });
    }
  });

  // Withdrawal routes
  app.post("/api/withdrawals", requireAuth, async (req, res) => {
    try {
      const withdrawalData = insertWithdrawalSchema.parse(req.body);
      const amount = parseFloat(withdrawalData.amount);
      
      const user = await storage.getUser(req.session.userId!);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      if (parseFloat(user.balance) < amount) {
        return res.status(400).json({ message: "Insufficient balance" });
      }

      // Deduct amount from user balance
      const newBalance = (parseFloat(user.balance) - amount).toFixed(2);
      await storage.updateUserBalance(req.session.userId!, newBalance);

      const withdrawal = await storage.createWithdrawal({
        ...withdrawalData,
        userId: req.session.userId!
      });
      
      res.json(withdrawal);
    } catch (error) {
      console.error("Withdrawal error:", error);
      res.status(400).json({ message: "Invalid withdrawal data" });
    }
  });

  app.get("/api/withdrawals", requireAdmin, async (req, res) => {
    try {
      const withdrawals = await storage.getWithdrawals();
      res.json(withdrawals);
    } catch (error) {
      console.error("Get withdrawals error:", error);
      res.status(500).json({ message: "Failed to get withdrawals" });
    }
  });

  // Game routes
  app.post("/api/games/play", requireAuth, async (req, res) => {
    try {
      const gameData = insertGameHistorySchema.parse(req.body);
      const betAmount = parseFloat(gameData.betAmount);
      
      const user = await storage.getUser(req.session.userId!);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      if (parseFloat(user.balance) < betAmount) {
        return res.status(400).json({ message: "Insufficient balance" });
      }

      // Calculate dynamic jackpot chance (2% base, increases with bet count up to 10% max)
      const userGameHistory = await storage.getGameHistory(req.session.userId!);
      const betCount = userGameHistory.length;
      const baseChance = 0.02; // 2% base
      const maxChance = 0.10; // 10% maximum
      const increasePerBet = 0.001; // 0.1% increase per bet
      
      const jackpotChance = Math.min(baseChance + (betCount * increasePerBet), maxChance);
      const jackpotWin = Math.random() <= jackpotChance;
      let meowWon = "0.00000000";
      
      if (jackpotWin) {
        const jackpot = await storage.getJackpot();
        meowWon = jackpot.amount;
        await storage.updateJackpot("0.10000000", req.session.userId!);
      }

      // Update user balance
      const winAmount = parseFloat(gameData.winAmount || "0");
      const newBalance = (parseFloat(user.balance) - betAmount + winAmount).toFixed(2);
      const newMeowBalance = jackpotWin 
        ? (parseFloat(user.meowBalance) + parseFloat(meowWon)).toFixed(8)
        : user.meowBalance;

      await storage.updateUserBalance(req.session.userId!, newBalance, newMeowBalance);

      // Record game history
      const gameHistory = await storage.createGameHistory({
        ...gameData,
        meowWon,
        userId: req.session.userId!
      });

      res.json({
        ...gameHistory,
        jackpotWin,
        newBalance,
        newMeowBalance
      });
    } catch (error) {
      console.error("Game play error:", error);
      res.status(400).json({ message: "Invalid game data" });
    }
  });

  app.get("/api/games/history", requireAuth, async (req, res) => {
    try {
      const history = await storage.getGameHistory(req.session.userId!);
      res.json(history);
    } catch (error) {
      console.error("Get game history error:", error);
      res.status(500).json({ message: "Failed to get game history" });
    }
  });

  // Jackpot routes
  app.get("/api/jackpot", async (req, res) => {
    try {
      const jackpot = await storage.getJackpot();
      res.json(jackpot);
    } catch (error) {
      console.error("Get jackpot error:", error);
      res.status(500).json({ message: "Failed to get jackpot" });
    }
  });

  // Admin routes
  app.get("/api/admin/users", requireAdmin, async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      const usersWithoutPasswords = users.map(({ password, ...user }) => user);
      res.json(usersWithoutPasswords);
    } catch (error) {
      console.error("Get users error:", error);
      res.status(500).json({ message: "Failed to get users" });
    }
  });

  app.patch("/api/admin/users/:id/ban", requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const { banned } = req.body;
      
      await storage.banUser(parseInt(id), banned);
      res.json({ message: "User ban status updated" });
    } catch (error) {
      console.error("Ban user error:", error);
      res.status(500).json({ message: "Failed to update user ban status" });
    }
  });

  app.get("/api/admin/game-history", requireAdmin, async (req, res) => {
    try {
      const history = await storage.getGameHistory();
      res.json(history);
    } catch (error) {
      console.error("Get admin game history error:", error);
      res.status(500).json({ message: "Failed to get game history" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
