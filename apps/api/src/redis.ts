import { createClient } from 'redis';
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

const redisHost = process.env.REDIS_HOST || 'localhost';
const redisPort = process.env.REDIS_PORT || '6379';

class RedisAdapter {
  private client: any = null;
  private memoryDb: Map<string, string> = new Map();
  private isConnected = false;

  constructor() {
    this.init();
  }

  private async init() {
    try {
      this.client = createClient({
        url: `redis://${redisHost}:${redisPort}`
      });

      this.client.on('error', (err: any) => {
        if (this.isConnected) {
          console.warn('Redis client error. Falling back to local memory storage.', err.message);
          this.isConnected = false;
        }
      });

      await this.client.connect();
      this.isConnected = true;
      console.log(`Connected to Redis successfully on ${redisHost}:${redisPort}`);
    } catch (err: any) {
      console.warn(`Redis connection failed (${err.message}). Using in-memory store fallback.`);
      this.client = null;
      this.isConnected = false;
    }
  }

  public async get(key: string): Promise<string | null> {
    if (this.isConnected && this.client) {
      try {
        return await this.client.get(key);
      } catch (err) {
        return this.memoryDb.get(key) || null;
      }
    }
    return this.memoryDb.get(key) || null;
  }

  public async set(key: string, value: string, expireSeconds?: number): Promise<void> {
    if (this.isConnected && this.client) {
      try {
        if (expireSeconds) {
          await this.client.set(key, value, { EX: expireSeconds });
        } else {
          await this.client.set(key, value);
        }
        return;
      } catch (err) {
        // Fallback to memory
      }
    }
    this.memoryDb.set(key, value);
    if (expireSeconds) {
      setTimeout(() => this.memoryDb.delete(key), expireSeconds * 1000);
    }
  }

  public async del(key: string): Promise<void> {
    if (this.isConnected && this.client) {
      try {
        await this.client.del(key);
        return;
      } catch (err) {
        // Fallback
      }
    }
    this.memoryDb.delete(key);
  }
}

export const redis = new RedisAdapter();
export default redis;
