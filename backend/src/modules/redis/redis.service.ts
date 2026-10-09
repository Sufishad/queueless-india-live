import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import Redis from 'ioredis';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client!: Redis;
  private readonly scriptCache = new Map<string, string>();

  onModuleInit() {
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
    this.client = new Redis(redisUrl, {
      maxRetriesPerRequest: 3,
      enableReadyCheck: true,
      retryStrategy: (times) => {
        const delay = Math.min(times * 200, 2000);
        return delay;
      },
      lazyConnect: true,
    });

    this.client.connect().catch((err) => {
      this.logger.warn(`Redis initial connection postponed/failed: ${err.message}`);
    });

    this.client.on('connect', () => {
      this.logger.log('Redis client connected successfully');
    });

    this.client.on('error', (err) => {
      this.logger.error(`Redis connection error: ${err.message}`);
    });
  }

  async onModuleDestroy() {
    if (this.client) {
      await this.client.quit();
      this.logger.log('Redis connection closed gracefully');
    }
  }

  getClient(): Redis {
    return this.client;
  }

  async get(key: string): Promise<string | null> {
    return this.client.get(key);
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<string> {
    if (ttlSeconds && ttlSeconds > 0) {
      return this.client.set(key, value, 'EX', ttlSeconds);
    }
    return this.client.set(key, value);
  }

  async incr(key: string): Promise<number> {
    return this.client.incr(key);
  }

  async expire(key: string, seconds: number): Promise<number> {
    return this.client.expire(key, seconds);
  }

  async ttl(key: string): Promise<number> {
    return this.client.ttl(key);
  }

  async del(key: string): Promise<number> {
    return this.client.del(key);
  }

  /**
   * Loads a Lua script from the scripts folder and executes it on Redis.
   * Caches the script in memory to avoid repeated filesystem disk reads.
   */
  async executeScript<T = any>(
    scriptName: string,
    keys: string[],
    args: (string | number)[],
  ): Promise<T> {
    const normalizedName = scriptName.endsWith('.lua') ? scriptName : `${scriptName}.lua`;
    let scriptContent = this.scriptCache.get(normalizedName);

    if (!scriptContent) {
      const candidates = [
        path.resolve(process.cwd(), 'scripts', normalizedName),
        path.resolve(process.cwd(), 'backend', 'scripts', normalizedName),
        path.resolve(__dirname, '../../../scripts', normalizedName),
        path.resolve(__dirname, '../../../../scripts', normalizedName),
      ];

      for (const candidate of candidates) {
        if (fs.existsSync(candidate)) {
          scriptContent = fs.readFileSync(candidate, 'utf-8');
          break;
        }
      }

      if (!scriptContent) {
        throw new Error(`Lua script "${normalizedName}" not found in scripts directories.`);
      }

      this.scriptCache.set(normalizedName, scriptContent);
    }

    return (await this.client.eval(
      scriptContent,
      keys.length,
      ...keys,
      ...args.map(String),
    )) as T;
  }
}
