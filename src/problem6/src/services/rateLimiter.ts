import {RedisClientType} from 'redis';
import {RateLimitConfig, RateLimitResult} from '../types';

export class RateLimiterService {
    private redis: RedisClientType;
    private config: RateLimitConfig;

    constructor(redis: RedisClientType, config: RateLimitConfig) {
        this.redis = redis;
        this.config = config;
    }

    /**
     * Check if user can perform action (sliding window rate limiting)
     * @param userId - User ID
     * @param actions - Number of actions to perform (typically 1 per request)
     * @returns Rate limit result
     */
    async checkRateLimit(userId: string, actions: number = 1): Promise<RateLimitResult> {
        const key = this.getKey(userId);
        const now = Date.now();
        const windowStart = now - this.config.windowMs;

        try {
            // Use Redis pipeline for atomic operations
            const pipeline = this.redis.multi();

            // Remove expired entries from the sorted set
            pipeline.zRemRangeByScore(key, 0, windowStart);

            // Count current entries in the window
            pipeline.zCard(key);

            // Execute pipeline
            const results = await pipeline.exec();

            if (!results) {
                throw new Error('Pipeline execution failed');
            }

            const currentCount = results[1] as number;
            const remainingPoints = Math.max(0, this.config.maxPoints - currentCount);

            if (currentCount + actions > this.config.maxPoints) {
                return {
                    allowed: false,
                    remainingPoints,
                    resetTime: now + this.config.windowMs,
                };
            }

            // Add the current request to the sliding window
            await this.redis.zAdd(key, {
                score: now,
                value: `${now}-${Math.random()}`, // Ensure uniqueness
            });

            // Set expiration for the key (cleanup)
            await this.redis.expire(key, Math.ceil(this.config.windowMs / 1000));

            return {
                allowed: true,
                remainingPoints: remainingPoints - actions,
                resetTime: now + this.config.windowMs,
            };
        } catch (error) {
            console.error('Rate limit check failed:', error);
            // Fail open - allow the request if Redis is down
            return {
                allowed: true,
                remainingPoints: this.config.maxPoints,
                resetTime: now + this.config.windowMs,
            };
        }
    }

    /**
     * Get current rate limit status for a user
     * @param userId - User ID
     * @returns Rate limit result
     */
    async getRateLimitStatus(userId: string): Promise<RateLimitResult> {
        const key = this.getKey(userId);
        const now = Date.now();
        const windowStart = now - this.config.windowMs;

        try {
            // Clean up expired entries and count current ones
            await this.redis.zRemRangeByScore(key, 0, windowStart);
            const currentCount = await this.redis.zCard(key);

            const remainingPoints = Math.max(0, this.config.maxPoints - currentCount);

            return {
                allowed: currentCount < this.config.maxPoints,
                remainingPoints,
                resetTime: now + this.config.windowMs,
            };
        } catch (error) {
            console.error('Failed to get rate limit status:', error);
            return {
                allowed: true,
                remainingPoints: this.config.maxPoints,
                resetTime: now + this.config.windowMs,
            };
        }
    }

    /**
     * Get all rate limit entries for a user (for debugging)
     * @param userId - User ID
     * @returns Array of timestamps
     */
    async getHistory(userId: string): Promise<number[]> {
        const key = this.getKey(userId);
        const now = Date.now();
        const windowStart = now - this.config.windowMs;

        try {
            // Clean up expired entries
            await this.redis.zRemRangeByScore(key, 0, windowStart);

            // Get all entries in the current window
            const entries = await this.redis.zRangeWithScores(key, 0, -1);

            return entries.map(entry => entry.score);
        } catch (error) {
            console.error('Failed to get rate limit history:', error);
            return [];
        }
    }

    /**
     * Update rate limit configuration
     * @param config - New rate limit configuration
     */
    updateConfig(config: Partial<RateLimitConfig>): void {
        this.config = {...this.config, ...config};
    }

    /**
     * Get rate limit configuration
     * @returns Current rate limit configuration
     */
    getConfig(): RateLimitConfig {
        return {...this.config};
    }

    /**
     * Generate Redis key for user rate limiting
     * @param userId - User ID
     * @returns Redis key
     */
    private getKey(userId: string): string {
        if (this.config.keyGenerator) {
            return this.config.keyGenerator(userId);
        }
        return `rate_limit:${userId}`;
    }
} 