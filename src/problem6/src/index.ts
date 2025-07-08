import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';

import { RedisService } from './services/redis';
import { RateLimiterService } from './services/rateLimiter';
import { SSEService } from './services/sse';
import { AppConfig, ScoreUpdateRequest, ScoreAction } from './types';

// Load environment variables
dotenv.config();

// Application configuration
const config: AppConfig = {
  port: parseInt(process.env.PORT || '3000'),
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD,
  },
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '1000'),
    maxPoints: parseInt(process.env.RATE_LIMIT_POINTS || '10'),
  },
  leaderboard: {
    topCount: parseInt(process.env.LEADERBOARD_TOP_COUNT || '10'),
    keyName: process.env.LEADERBOARD_KEY || 'leaderboard',
  },
};

// Initialize services
const redisService = new RedisService(config.redis, config.leaderboard.keyName);
const rateLimiterService = new RateLimiterService(redisService.getClient(), config.rateLimit);
const sseService = new SSEService();

// Create Express app
const app = express();

// Middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      connectSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
}));
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files
app.use(express.static(path.join(__dirname, '../public')));

// Routes

/**
 * Health check endpoint
 */
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    services: {
      redis: 'connected',
      sse: `${sseService.getClientCount()} clients`,
    },
  });
});

/**
 * Get leaderboard
 */
app.get('/api/leaderboard', async (req, res) => {
  try {
    const count = parseInt(req.query.count as string) || config.leaderboard.topCount;
    const leaderboard = await redisService.getTopUsers(count);
    const totalUsers = await redisService.getTotalUsers();

    res.json({
      success: true,
      data: {
        leaderboard,
        totalUsers,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch leaderboard',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * Get user score and rank
 */
app.get('/api/user/:userId/score', async (req, res) => {
  try {
    const { userId } = req.params;
    const userScore = await redisService.getUserScore(userId);

    if (!userScore) {
      return res.status(404).json({
        success: false,
        error: 'User not found in leaderboard',
      });
    }

    res.json({
      success: true,
      data: userScore,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch user score',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * Update user score (with rate limiting)
 */
app.post('/api/user/score', async (req, res) => {
  try {
    const { userId, username, action }: ScoreUpdateRequest = req.body;

    // Validation
    if (!userId || !username) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: userId, username',
      });
    }

    // Check rate limit (each request counts as 1 action, regardless of points)
    const rateLimitResult = await rateLimiterService.checkRateLimit(userId, 1);
    if (!rateLimitResult.allowed) {
      return res.status(429).json({
        success: false,
        error: 'Rate limit exceeded. Too many score update attempts.',
        details: 'You can only make 10 score updates per second.',
        rateLimitInfo: {
          remainingActions: rateLimitResult.remainingPoints,
          resetTime: rateLimitResult.resetTime,
        },
      });
    }

    // Update score
    const updatedScore = await redisService.updateUserScore(userId, username, 1);

    // Get updated leaderboard
    const leaderboard = await redisService.getTopUsers(config.leaderboard.topCount);

    // Broadcast updates via SSE
    sseService.broadcastUserScoreUpdate(updatedScore);
    sseService.broadcastLeaderboardUpdate(leaderboard);

    res.json({
      success: true,
      data: {
        userScore: updatedScore,
        action: action || ScoreAction.COMPLETE_TASK,
        rateLimitInfo: {
          remainingActions: rateLimitResult.remainingPoints,
          resetTime: rateLimitResult.resetTime,
        },
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to update user score',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * Get rate limit status for a user
 */
app.get('/api/user/:userId/rate-limit', async (req, res) => {
  try {
    const { userId } = req.params;
    const rateLimitStatus = await rateLimiterService.getRateLimitStatus(userId);

    res.json({
      success: true,
      data: rateLimitStatus,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to get rate limit status',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * Server-Sent Events endpoint for real-time updates
 */
app.get('/api/events', (req, res) => {
  const clientId = req.query.clientId as string || uuidv4();
  sseService.addClient(clientId, res);
  
  // Send initial leaderboard data
  redisService.getTopUsers(config.leaderboard.topCount)
    .then(leaderboard => {
      sseService.broadcastLeaderboardUpdate(leaderboard);
    })
    .catch(error => {
      console.error('Failed to send initial leaderboard:', error);
    });
});

/**
 * Configuration endpoint
 */
app.get('/api/config', (req, res) => {
  res.json({
    success: true,
    data: {
      rateLimit: rateLimiterService.getConfig(),
      leaderboard: {
        topCount: config.leaderboard.topCount,
      },
      sse: {
        connectedClients: sseService.getClientCount(),
      },
    },
  });
});

/**
 * Update configuration (development only)
 */
app.post('/api/config', (req, res) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(403).json({
      success: false,
      error: 'Configuration updates not allowed in production',
    });
  }

  try {
    const { rateLimit } = req.body;
    
    if (rateLimit) {
      rateLimiterService.updateConfig(rateLimit);
    }

    res.json({
      success: true,
      message: 'Configuration updated successfully',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to update configuration',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * Clear leaderboard (development only)
 */
app.delete('/api/leaderboard', async (req, res) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(403).json({
      success: false,
      error: 'Leaderboard clearing not allowed in production',
    });
  }

  try {
    await redisService.clearLeaderboard();
    sseService.broadcastSystemMessage('Leaderboard cleared');
    
    res.json({
      success: true,
      message: 'Leaderboard cleared successfully',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to clear leaderboard',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * Root endpoint - serve main application
 */
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Error handling middleware
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    details: process.env.NODE_ENV === 'development' ? err.message : undefined,
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
  });
});

// Start server
const server = app.listen(config.port, () => {
  console.log(`🚀 Scoreboard server running on port ${config.port}`);
  console.log(`📊 Dashboard: http://localhost:${config.port}/`);
  console.log(`🔥 SSE Events: http://localhost:${config.port}/api/events`);
  console.log(`📈 Leaderboard: http://localhost:${config.port}/api/leaderboard`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...');
  
  sseService.closeAllConnections();
  redisService.close();
  
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully...');
  
  sseService.closeAllConnections();
  redisService.close();
  
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

export default app; 