import Redis from 'ioredis';
import { CryptoQuote } from '../types';

const REDIS_URL = process.env.REDIS_URL || 'redis://redis:6379';
const CACHE_KEY = 'crypto:prices';
const CACHE_TTL = parseInt(process.env.CACHE_TTL || '300', 10);

class PriceCache {
  private redis: Redis;

  constructor() {
    this.redis = new Redis(REDIS_URL);

    this.redis.on('connect', () => {
      console.log('Connected to Redis');
    });

    this.redis.on('error', (err) => {
      console.error('Redis error:', err);
    });
  }

  async setQuotes(quotes: CryptoQuote[]): Promise<void> {
    const data = JSON.stringify(quotes);
    await this.redis.setex(CACHE_KEY, CACHE_TTL, data);
    console.log(`Cached ${quotes.length} crypto prices (TTL: ${CACHE_TTL}s)`);
  }

  async getQuotes(): Promise<CryptoQuote[] | null> {
    const data = await this.redis.get(CACHE_KEY);
    if (!data) return null;

    try {
      return JSON.parse(data) as CryptoQuote[];
    } catch {
      return null;
    }
  }

  async getQuote(symbol: string): Promise<CryptoQuote | null> {
    const quotes = await this.getQuotes();
    if (!quotes) return null;

    return quotes.find(q => q.symbol.toUpperCase() === symbol.toUpperCase()) || null;
  }

  async isStale(): Promise<boolean> {
    const ttl = await this.redis.ttl(CACHE_KEY);
    return ttl <= 0;
  }

  async disconnect(): Promise<void> {
    await this.redis.quit();
  }
}

export const priceCache = new PriceCache();
