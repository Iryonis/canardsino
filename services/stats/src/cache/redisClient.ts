import { createClient, RedisClientType } from 'redis';

const REDIS_URL = process.env.REDIS_URL || 'redis://redis:6379';
const STATS_CACHE_TTL = 3600; // 1 hour

class RedisCache {
  private client: RedisClientType | null = null;
  private connecting: Promise<void> | null = null;

  async connect(): Promise<void> {
    if (this.client?.isOpen) return;
    if (this.connecting) return this.connecting;

    this.connecting = (async () => {
      try {
        console.log('🔌 Connecting to Redis:', REDIS_URL);
        
        this.client = createClient({ url: REDIS_URL });
        
        this.client.on('error', (err) => {
          console.error('❌ Redis error:', err);
        });

        this.client.on('connect', () => {
          console.log('✅ Redis connected');
        });

        await this.client.connect();
      } catch (error) {
        console.error('❌ Failed to connect to Redis:', error);
        this.client = null;
        throw error;
      } finally {
        this.connecting = null;
      }
    })();

    return this.connecting;
  }

  async getUserStats(userId: string): Promise<any | null> {
    try {
      await this.connect();
      if (!this.client?.isOpen) return null;

      const key = `stats:user:${userId}`;
      const data = await this.client.get(key);
      
      if (data) {
        console.log(`✅ Cache hit for userId: ${userId}`);
        return JSON.parse(data);
      }
      
      console.log(`⚠️ Cache miss for userId: ${userId}`);
      return null;
    } catch (error) {
      console.error('Error getting from cache:', error);
      return null;
    }
  }

  async setUserStats(userId: string, stats: any): Promise<void> {
    try {
      await this.connect();
      if (!this.client?.isOpen) return;

      const key = `stats:user:${userId}`;
      await this.client.setEx(key, STATS_CACHE_TTL, JSON.stringify(stats));
      console.log(`✅ Cached stats for userId: ${userId}`);
    } catch (error) {
      console.error('Error setting cache:', error);
    }
  }

  async invalidateUserStats(userId: string): Promise<void> {
    try {
      await this.connect();
      if (!this.client?.isOpen) return;

      const key = `stats:user:${userId}`;
      await this.client.del(key);
      console.log(`🗑️ Invalidated cache for userId: ${userId}`);
    } catch (error) {
      console.error('Error invalidating cache:', error);
    }
  }

  async disconnect(): Promise<void> {
    try {
      if (this.client?.isOpen) {
        await this.client.quit();
        console.log('✅ Disconnected from Redis');
      }
    } catch (error) {
      console.error('❌ Error disconnecting from Redis:', error);
    }
  }
}

export const redisCache = new RedisCache();
