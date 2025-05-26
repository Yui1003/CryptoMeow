import express, { type Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import bcrypt from "bcrypt";
import session from "express-session";
import multer from "multer";
import path from "path";
import fs from "fs";
import { insertUserSchema, insertDepositSchema, insertWithdrawalSchema, insertGameHistorySchema } from "@shared/schema";
import { z } from "zod";

declare module 'express-session' {
  interface SessionData {
    userId?: number;
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Ensure uploads directory exists
  const uploadsDir = path.join(process.cwd(), 'uploads');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  // Multer configuration for file uploads
  const storage_multer = multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, uploadsDir);
    },
    filename: function (req, file, cb) {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      cb(null, 'receipt-' + uniqueSuffix + path.extname(file.originalname));
    }
  });

  const upload = multer({ 
    storage: storage_multer,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: function (req, file, cb) {
      if (file.mimetype.startsWith('image/')) {
        cb(null, true);
      } else {
        cb(new Error('Only image files are allowed!'));
      }
    }
  });

  // Serve uploaded files
  app.use('/uploads', express.static(uploadsDir));

  // Session middleware
  app.use(session({
    secret: process.env.SESSION_SECRET || 'cryptomeow-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false, maxAge: 24 * 60 * 60 * 1000 } // 24 hours
  }));

  // Auth middleware
  const requireAuth = async (req: any, res: any, next: any) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "Authentication required" });
    }

    // Check if user is banned
    const user = await storage.getUser(req.session.userId);
    if (!user || user.isBanned) {
      req.session.destroy(() => {});
      return res.status(403).json({ message: "Account is banned" });
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
  app.post("/api/deposits", requireAuth, upload.single('receipt'), async (req, res) => {
    try {
      const { amount, paymentMethod } = req.body;

      if (!req.file) {
        return res.status(400).json({ message: "Receipt file is required" });
      }

      const receiptUrl = `/uploads/${req.file.filename}`;

      const depositData = {
        amount,
        paymentMethod,
        receiptUrl
      };

      const deposit = await storage.createDeposit({
        ...depositData,
        userId: req.session.userId!
      });

      res.json(deposit);
    } catch (error) {
      console.error("Deposit error:", error);
      if (error instanceof multer.MulterError) {
        if (error.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({ message: "File too large. Maximum size is 5MB." });
        }
        return res.status(400).json({ message: "File upload error: " + error.message });
      }
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

      // Validate account info JSON
      try {
        JSON.parse(withdrawalData.accountInfo);
      } catch (e) {
        return res.status(400).json({ message: "Invalid account information format" });
      }

      // Only create withdrawal request - don't deduct funds yet
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

  app.get("/api/withdrawals/user", requireAuth, async (req, res) => {
    try {
      const withdrawals = await storage.getUserWithdrawals(req.session.userId!);
      res.json(withdrawals);
    } catch (error) {
      console.error("Get user withdrawals error:", error);
      res.status(500).json({ message: "Failed to get withdrawal history" });
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

  app.patch("/api/withdrawals/:id/status", requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body;

      if (!["approved", "rejected"].includes(status)) {
        return res.status(400).json({ message: "Invalid status" });
      }

      const withdrawal = await storage.getWithdrawal(parseInt(id));
      if (!withdrawal) {
        return res.status(404).json({ message: "Withdrawal not found" });
      }

      if (withdrawal.status !== "pending") {
        return res.status(400).json({ message: "Withdrawal already processed" });
      }

      if (status === "approved") {
        // Deduct funds when approved
        const user = await storage.getUser(withdrawal.userId);
        if (!user) {
          return res.status(404).json({ message: "User not found" });
        }

        const amount = parseFloat(withdrawal.amount);
        if (parseFloat(user.balance) < amount) {
          return res.status(400).json({ message: "User has insufficient balance" });
        }

        const newBalance = (parseFloat(user.balance) - amount).toFixed(2);
        await storage.updateUserBalance(withdrawal.userId, newBalance);
      }
      // If rejected, no balance changes needed since funds were never deducted

      await storage.updateWithdrawalStatus(parseInt(id), status);
      res.json({ message: "Withdrawal status updated" });
    } catch (error) {
      console.error("Update withdrawal status error:", error);
      res.status(500).json({ message: "Failed to update withdrawal status" });
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
      // Calculate balance change: if win amount > bet amount, player profits (win - bet)
      // If win amount = 0, player loses their bet (-bet)
      // If win amount > 0 but < bet amount, player gets partial return (win - bet)
      const balanceChange = winAmount - betAmount;
      const newBalance = (parseFloat(user.balance) + balanceChange).toFixed(2);
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

      // If banning a user, invalidate their session immediately
      if (banned) {
        // Store banned user sessions to invalidate them
        const store = req.sessionStore;
        if (store && store.all) {
          store.all((err: any, sessions: any) => {
            if (!err && sessions) {
              Object.keys(sessions).forEach((sessionId) => {
                const session = sessions[sessionId];
                if (session && session.userId === parseInt(id)) {
                  store.destroy(sessionId, () => {});
                }
              });
            }
          });
        }
      }

      res.json({ message: "User ban status updated" });
    } catch (error) {
      console.error("Ban user error:", error);
      res.status(500).json({ message: "Failed to update user ban status" });
    }
  });

  app.post("/api/admin/add-meow", requireAdmin, async (req, res) => {
    try {
      const { userId, amount } = req.body;

      const user = await storage.getUser(userId || req.session.userId!);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const currentMeow = parseFloat(user.meowBalance);
      const newMeowBalance = (currentMeow + parseFloat(amount)).toFixed(8);

      await storage.updateUserBalance(userId || req.session.userId!, user.balance, newMeowBalance);

      res.json({ 
        message: "MEOW balance updated", 
        newBalance: newMeowBalance 
      });
    } catch (error) {
      console.error("Add MEOW error:", error);
      res.status(500).json({ message: "Failed to add MEOW" });
    }
  });

  // Farm routes
  app.get("/api/farm/data", requireAuth, async (req, res) => {
    try {
      const farmData = await storage.getFarmData(req.session.userId!);
      res.json(farmData);
    } catch (error) {
      console.error("Get farm data error:", error);
      res.status(500).json({ message: "Failed to get farm data" });
    }
  });

  app.post("/api/farm/buy-cat", requireAuth, async (req, res) => {
    try {
      const { catId } = req.body;

      const CAT_TYPES: Record<string, any> = {
        "basic": { baseProduction: 0.001, cost: 0.1 },
        "farm": { baseProduction: 0.002, cost: 0.25 },
        "business": { baseProduction: 0.005, cost: 0.75 },
        "ninja": { baseProduction: 0.008, cost: 1.5 },
        "cyber": { baseProduction: 0.015, cost: 3.0 },
        "golden": { baseProduction: 0.05, cost: 10.0 }
      };

      const catType = CAT_TYPES[catId];
      if (!catType) {
        return res.status(400).json({ message: "Invalid cat type" });
      }

      const user = await storage.getUser(req.session.userId!);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const userMeow = parseFloat(user.meowBalance);
      if (userMeow < catType.cost) {
        return res.status(400).json({ message: "Insufficient $MEOW balance" });
      }

      // Deduct cost and buy cat
      const newMeowBalance = (userMeow - catType.cost).toFixed(8);
      await storage.updateUserBalance(req.session.userId!, user.balance, newMeowBalance);

      const farmCat = await storage.createFarmCat({
        userId: req.session.userId!,
        catId,
        production: catType.baseProduction
      });

      res.json(farmCat);
    } catch (error) {
      console.error("Buy cat error:", error);
      res.status(500).json({ message: "Failed to buy cat" });
    }
  });

  // Upgrade cat
  app.post("/api/farm/upgrade-cat", requireAuth, async (req, res) => {
    try {
      const { farmCatId } = req.body;
      const userId = req.session.userId!;

      const catId = typeof farmCatId === 'string' ? parseInt(farmCatId) : farmCatId;
      
      if (isNaN(catId)) {
        return res.status(400).json({ message: "Invalid farm cat ID" });
      }

      const farmCat = await storage.getFarmCat(catId);
      if (!farmCat || farmCat.userId !== userId) {
        return res.status(404).json({ message: "Cat not found" });
      }

      const upgradeCost = 0.1 * Math.pow(1.5, farmCat.level);

      const user = await storage.getUser(req.session.userId!);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const userMeow = parseFloat(user.meowBalance);
      if (userMeow < upgradeCost) {
        return res.status(400).json({ message: "Insufficient $MEOW balance" });
      }

      // Deduct cost and upgrade cat
      const newMeowBalance = (userMeow - upgradeCost).toFixed(8);
      await storage.updateUserBalance(req.session.userId!, user.balance, newMeowBalance);

      const newLevel = farmCat.level + 1;
      const newProduction = parseFloat(farmCat.production) * 1.2; // 20% increase per level

      await storage.upgradeFarmCat(catId, newLevel, newProduction);

      res.json({ message: "Cat upgraded successfully" });
    } catch (error) {
      console.error("Upgrade cat error:", error);
      res.status(500).json({ message: "Failed to upgrade cat" });
    }
  });

  // Rename cat
  app.post("/api/farm/rename-cat", requireAuth, async (req, res) => {
    try {
      const { farmCatId, name } = req.body;
      const userId = req.session.userId!;

      console.log("Rename cat request:", { farmCatId, name, userId, type: typeof farmCatId });

      if (farmCatId === undefined || farmCatId === null || farmCatId === '') {
        console.log("Missing farm cat ID");
        return res.status(400).json({ message: "Farm cat ID is required" });
      }

      if (!name || name.trim().length === 0) {
        return res.status(400).json({ message: "Name cannot be empty" });
      }

      if (name.length > 20) {
        return res.status(400).json({ message: "Name too long (max 20 characters)" });
      }

      let catId: number;
      if (typeof farmCatId === 'string') {
        catId = parseInt(farmCatId, 10);
      } else if (typeof farmCatId === 'number') {
        catId = farmCatId;
      } else {
        console.log("Invalid farmCatId type:", typeof farmCatId, farmCatId);
        return res.status(400).json({ message: "Invalid farm cat ID format" });
      }
      
      if (isNaN(catId) || catId < 0) {
        console.log("Invalid cat ID after conversion:", { farmCatId, catId });
        return res.status(400).json({ message: "Invalid farm cat ID" });
      }

      const farmCat = await storage.getFarmCat(catId);
      if (!farmCat) {
        console.log("Cat not found:", { catId });
        return res.status(404).json({ message: "Cat not found" });
      }

      if (farmCat.userId !== userId) {
        console.log("Unauthorized access:", { farmCat, userId, catId });
        return res.status(403).json({ message: "Unauthorized" });
      }

      await storage.renameCat(catId, name.trim());

      res.json({ message: "Cat renamed successfully" });
    } catch (error) {
      console.error("Rename cat error:", error);
      res.status(500).json({ message: "Failed to rename cat" });
    }
  });

  // Pet cat
  app.post("/api/farm/pet-cat", requireAuth, async (req, res) => {
    try {
      const { farmCatId } = req.body;
      const userId = req.session.userId!;

      console.log("Pet cat request:", { farmCatId, userId, type: typeof farmCatId });

      if (farmCatId === undefined || farmCatId === null || farmCatId === '') {
        console.log("Missing farm cat ID");
        return res.status(400).json({ message: "Farm cat ID is required" });
      }

      let catId: number;
      if (typeof farmCatId === 'string') {
        catId = parseInt(farmCatId, 10);
      } else if (typeof farmCatId === 'number') {
        catId = farmCatId;
      } else {
        console.log("Invalid farmCatId type:", typeof farmCatId, farmCatId);
        return res.status(400).json({ message: "Invalid farm cat ID format" });
      }
      
      if (isNaN(catId) || catId < 0) {
        console.log("Invalid cat ID after conversion:", { farmCatId, catId });
        return res.status(400).json({ message: "Invalid farm cat ID" });
      }

      const farmCat = await storage.getFarmCat(catId);
      if (!farmCat) {
        console.log("Cat not found:", { catId });
        return res.status(404).json({ message: "Cat not found" });
      }

      if (farmCat.userId !== userId) {
        console.log("Unauthorized access:", { farmCat, userId, catId });
        return res.status(403).json({ message: "Unauthorized" });
      }

      // Increase happiness (max 100)
      const currentHappiness = farmCat.happiness === null || farmCat.happiness === undefined ? 50 : farmCat.happiness;
      const newHappiness = Math.min(100, currentHappiness + 10);

      await storage.updateCatHappiness(catId, newHappiness);

      res.json({ message: "Cat petted successfully", happiness: newHappiness });
    } catch (error) {
      console.error("Pet cat error:", error);
      res.status(500).json({ message: "Failed to pet cat" });
    }
  });

  // Claim farm rewards
  app.post("/api/farm/claim", requireAuth, async (req, res) => {
    try {
      const farmData = await storage.getFarmData(req.session.userId!);
      
      if (!farmData.cats || farmData.cats.length === 0) {
        return res.status(400).json({ message: "No cats to claim from" });
      }

      // Calculate total unclaimed rewards
      const now = new Date();
      let totalUnclaimed = 0;

      farmData.cats.forEach((cat: any) => {
        const timeSinceLastClaim = (now.getTime() - new Date(cat.lastClaim).getTime()) / (1000 * 60 * 60); // hours
        const rewards = parseFloat(cat.production) * timeSinceLastClaim;
        totalUnclaimed += rewards;
      });

      if (totalUnclaimed <= 0) {
        return res.status(400).json({ message: "No rewards to claim" });
      }

      // Update user MEOW balance
      const user = await storage.getUser(req.session.userId!);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const newMeowBalance = (parseFloat(user.meowBalance) + totalUnclaimed).toFixed(8);
      await storage.updateUserBalance(req.session.userId!, user.balance, newMeowBalance);

      // Update last claim time for all cats
      await storage.claimFarmRewards(req.session.userId!);

      res.json({ 
        claimed: totalUnclaimed.toFixed(8),
        newBalance: newMeowBalance 
      });
    } catch (error) {
      console.error("Claim rewards error:", error);
      res.status(500).json({ message: "Failed to claim rewards" });
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