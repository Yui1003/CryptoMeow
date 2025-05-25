// MySQL Database Connection for XAMPP Local Development
import mysql from 'mysql2/promise';
import { drizzle } from 'drizzle-orm/mysql2';
import * as schema from './shared/schema';

// XAMPP MySQL Configuration
const connectionConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '', // Default XAMPP password is empty
  database: process.env.DB_NAME || 'cryptomeow',
  port: parseInt(process.env.DB_PORT || '3306'),
};

// Create MySQL connection
export const connection = mysql.createConnection(connectionConfig);

// Create Drizzle instance
export const db = drizzle(connection, { schema, mode: 'default' });

// Test connection function
export async function testConnection() {
  try {
    await connection.execute('SELECT 1');
    console.log('✅ MySQL connection successful');
    return true;
  } catch (error) {
    console.error('❌ MySQL connection failed:', error);
    return false;
  }
}

// Environment variables for XAMPP setup:
// DB_HOST=localhost
// DB_USER=root  
// DB_PASSWORD=
// DB_NAME=cryptomeow
// DB_PORT=3306