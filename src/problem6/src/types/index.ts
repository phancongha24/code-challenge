export interface UserScore {
  userId: string;
  username: string;
  score: number;
  lastUpdated: string;
}

export interface LeaderboardEntry extends UserScore {
  rank: number;
}

export interface RateLimitConfig {
  windowMs: number;  // Time window in milliseconds
  maxPoints: number; // Maximum points allowed in the window
  keyGenerator?: (userId: string) => string;
}

export interface RateLimitResult {
  allowed: boolean;
  remainingPoints: number;
  resetTime: number;
}

export interface SSEMessage {
  id?: string;
  event?: string;
  data: any;
  retry?: number;
}

export interface ScoreUpdateRequest {
  userId: string;
  username: string;
  action?: string;
}

export interface RedisConfig {
  host: string;
  port: number;
  password?: string;
  db?: number;
}

export interface AppConfig {
  port: number;
  redis: RedisConfig;
  rateLimit: RateLimitConfig;
  leaderboard: {
    topCount: number;
    keyName: string;
  };
}

export enum ScoreAction {
  COMPLETE_TASK = 'complete_task',
}

export enum SSEEventType {
  LEADERBOARD_UPDATE = 'leaderboard_update',
  USER_SCORE_UPDATE = 'user_score_update',
  SYSTEM_MESSAGE = 'system_message'
} 