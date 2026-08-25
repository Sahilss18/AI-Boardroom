import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import fs from 'fs';

// Load .env from root workspace
let envPath = path.resolve(__dirname, '../../../.env');
if (!fs.existsSync(envPath)) {
  envPath = path.resolve(__dirname, '../../../../.env');
}
dotenv.config({ path: envPath });

const config = {
  host: process.env.MYSQL_HOST || 'localhost',
  port: parseInt(process.env.MYSQL_PORT || '3306', 10),
  user: process.env.MYSQL_USER || 'reflection_user',
  password: process.env.MYSQL_PASSWORD || 'reflection_password',
  database: process.env.MYSQL_DATABASE || 'reflection_ai',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
};

export const pool = mysql.createPool(config);

export async function checkConnection(): Promise<boolean> {
  try {
    const conn = await pool.getConnection();
    conn.release();
    return true;
  } catch (error) {
    console.error('MySQL Connection Error:', error);
    return false;
  }
}
