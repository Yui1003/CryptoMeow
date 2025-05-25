-- CryptoMeow MySQL Database Setup for XAMPP
-- Run this in phpMyAdmin or MySQL command line

CREATE DATABASE IF NOT EXISTS cryptomeow;
USE cryptomeow;

-- Users table
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    balance DECIMAL(15,8) DEFAULT 1000.00000000,
    meow_balance DECIMAL(15,8) DEFAULT 1.00000000,
    is_admin BOOLEAN DEFAULT FALSE,
    is_banned BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Deposits table
CREATE TABLE deposits (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    amount DECIMAL(15,8) NOT NULL,
    status VARCHAR(50) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Withdrawals table
CREATE TABLE withdrawals (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    amount DECIMAL(15,8) NOT NULL,
    status VARCHAR(50) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Game history table
CREATE TABLE game_history (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    game_type VARCHAR(50) NOT NULL,
    bet_amount DECIMAL(15,8) NOT NULL,
    win_amount DECIMAL(15,8) DEFAULT 0,
    result TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Farm cats table
CREATE TABLE IF NOT EXISTS farm_cats (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    cat_id VARCHAR(50) NOT NULL,
    level INT DEFAULT 1,
    production DECIMAL(15,8) NOT NULL,
    last_claim TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Jackpot table
CREATE TABLE jackpot (
    id INT AUTO_INCREMENT PRIMARY KEY,
    amount DECIMAL(15,8) DEFAULT 0.10000000,
    last_winner_id INT,
    last_won_at TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (last_winner_id) REFERENCES users(id)
);

-- Jackpot table
CREATE TABLE jackpot (
    id INT AUTO_INCREMENT PRIMARY KEY,
    amount DECIMAL(15,8) DEFAULT 0.10000000,
    last_winner_id INT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (last_winner_id) REFERENCES users(id)
);

-- Insert admin user (password: admin1234)
INSERT INTO users (username, password, balance, meow_balance, is_admin) 
VALUES ('admin', '$2b$10$rGJ3gI7YcUKOHJKmOQwjXuq8c1ZhQjWgO9XKpP8jY9MNdQ7Zs3QXS', 10000.00, 100.00000000, TRUE)
ON DUPLICATE KEY UPDATE meow_balance = 100.00000000;

-- Insert initial jackpot
INSERT INTO jackpot (amount) VALUES (0.10000000);

-- Create indexes for better performance
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_deposits_user_id ON deposits(user_id);
CREATE INDEX idx_withdrawals_user_id ON withdrawals(user_id);
CREATE INDEX idx_game_history_user_id ON game_history(user_id);