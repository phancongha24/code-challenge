import {createClient, RedisClientType} from 'redis';
import {RedisConfig, UserScore, LeaderboardEntry} from '../types';

export class RedisService {
    private client: RedisClientType;
    private leaderboardKey: string;

    constructor(config: RedisConfig, leaderboardKey: string = 'leaderboard') {
        this.client = createClient({
            socket: {
                host: config.host,
                port: config.port,
            },
            password: config.password,
            database: config.db || 0,
        });

        this.leaderboardKey = leaderboardKey;
        this.initialize();
    }

    private async initialize(): Promise<void> {
        try {
            await this.client.connect();
            console.log('Redis connected successfully');
        } catch (error) {
            console.error('Redis connection error:', error);
            throw error;
        }
    }

    async updateUserScore(userId: string, username: string, points: number): Promise<UserScore> {
        try {

            await this.client.hSet(`user:${userId}`, {
                username,
                lastUpdated: new Date().toISOString(),
            });


            const newScore = await this.client.zIncrBy(this.leaderboardKey, points, userId);

            return {
                userId,
                username,
                score: newScore,
                lastUpdated: new Date().toISOString(),
            };
        } catch (error) {
            console.error('Error updating user score:', error);
            throw error;
        }
    }

    async getUserScore(userId: string): Promise<LeaderboardEntry | null> {
        try {
            const score = await this.client.zScore(this.leaderboardKey, userId);
            if (score === null) return null;

            const rank = await this.client.zRevRank(this.leaderboardKey, userId);
            const userMeta = await this.client.hGetAll(`user:${userId}`);

            return {
                userId,
                username: userMeta.username || 'Unknown',
                score,
                rank: rank !== null ? rank + 1 : 0,
                lastUpdated: userMeta.lastUpdated || new Date().toISOString(),
            };
        } catch (error) {
            console.error('Error getting user score:', error);
            throw error;
        }
    }

    async getTopUsers(count: number = 10): Promise<LeaderboardEntry[]> {
        try {

            const results = await this.client.zRangeWithScores(this.leaderboardKey, 0, -1, {REV: true});

            const leaderboard: LeaderboardEntry[] = [];

            for (let i = 0; i < results.length; i++) {
                const result = results[i];
                const userMeta = await this.client.hGetAll(`user:${result.value}`);

                leaderboard.push({
                    userId: result.value,
                    username: userMeta.username || 'Unknown',
                    score: result.score,
                    rank: i + 1,
                    lastUpdated: userMeta.lastUpdated || new Date().toISOString(),
                });
            }

            return leaderboard;
        } catch (error) {
            console.error('Error getting top users:', error);
            throw error;
        }
    }

    async getTotalUsers(): Promise<number> {
        try {
            return await this.client.zCard(this.leaderboardKey);
        } catch (error) {
            console.error('Error getting total users:', error);
            throw error;
        }
    }

    /**
     * Clear entire leaderboard
     * @returns Boolean indicating success
     */
    async clearLeaderboard(): Promise<boolean> {
        try {

            const userIds = await this.client.zRange(this.leaderboardKey, 0, -1);


            for (const userId of userIds) {
                await this.client.del(`user:${userId}`);
            }


            await this.client.del(this.leaderboardKey);
            return true;
        } catch (error) {
            console.error('Error clearing leaderboard:', error);
            throw error;
        }
    }

    async close(): Promise<void> {
        try {
            await this.client.quit();
            console.log('Redis connection closed');
        } catch (error) {
            console.error('Error closing Redis connection:', error);
            throw error;
        }
    }

    getClient(): RedisClientType {
        return this.client;
    }
} 