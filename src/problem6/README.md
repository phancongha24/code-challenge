# Problem 6: Real-Time Scoreboard System Architecture

## Overview

A real-time scoreboard system built with Express.js, Redis, and Server-Sent Events (SSE) that provides live updates for
the top 10 users' scores with built-in rate limiting to prevent malicious score manipulation.

## Architecture Specification

### System Components

1. **API Server** - Express.js application handling HTTP requests and SSE connections
2. **Redis Database** - Used for both scoreboard storage (sorted sets) and rate limiting
3. **Rate Limiter** - Sliding window algorithm implementation using Redis
4. **SSE Service** - Real-time updates to connected clients
5. **Web Interface** - Simple UI for interaction and configuration

### Core Features

- **Real-time Leaderboard**: Top 10 users displayed with live updates
- **Server-Sent Events**: Live updates without WebSocket complexity
- **Rate Limiting**: Sliding window algorithm to prevent abuse

## Software Requirements Implementation

### 1. Scoreboard with Top 10 Users (Redis Sorted Set)

**Implementation**: Redis `ZSET` (sorted set) for efficient ranking operations

```typescript
// Redis operations used:
-ZADD
:
Add / update
user
scores
- ZREVRANGE
:
Get
top
N
users
- ZRANK / ZREVRANK
:
Get
user
rank
- ZINCRBY
:
Increment
user
score
- ZCARD
:
Get
total
users
count
```

**Benefits**:

- O(log N) complexity for score updates
- O(log N + M) complexity for range queries
- Automatic sorting by score
- Efficient memory usage

### 2. Live Updates (Server-Sent Events)

**Implementation**: Custom SSE service handling multiple client connections

```typescript
// SSE message format:
event: leaderboard_update
data: {
    "leaderboard"
:
    [...], "timestamp"
:
    "2024-01-01T00:00:00Z"
}

event: user_score_update
data: {
    "userScore"
:
    {...
    }
,
    "timestamp"
:
    "2024-01-01T00:00:00Z"
}
```

**Benefits**:

- Simpler than WebSocket for one-way communication
- Built-in reconnection in browsers
- HTTP-based, works with existing infrastructure
- No need for WebSocket libraries

### 3. User Actions and Score Updates

**Implementation**: RESTful API endpoint with validation

```http
POST /api/user/score
Content-Type: application/json

{
  "userId": "user123",
  "username": "john_doe",
  "points": 10,
  "action": "complete_task"
}
```

**Validation**:

- Required fields validation
- Points must be positive number
- Rate limiting applied per user
- Action type validation

### 4. Rate Limiting (Sliding Window Algorithm)

**Implementation**: Redis-based sliding window with sorted sets

**Configuration**:

- Default: 10 actions per 1 second per user (each POST request = 1 action)
- Rate limiting is based on number of requests, not score points
- Configurable via environment variables
- Fail-open strategy for Redis failures

## Technical Architecture

### System Flow

```
[User Action] → [API Server] → [Rate Limiter] → [Redis Scoreboard] → [SSE Broadcast]
                     ↓
[Client Browser] ← [SSE Stream] ← [SSE Service] ← [Updated Leaderboard]
```

### Data Flow

1. **User Action**: User completes an action that awards points
2. **API Request**: Client sends POST request to `/api/user/score`
3. **Rate Limiting**: System checks if user hasn't exceeded rate limit
4. **Score Update**: If allowed, update user score in Redis sorted set
5. **Broadcast**: Send real-time updates to all connected clients via SSE
6. **UI Update**: Client receives SSE event and updates leaderboard display

### Redis Data Structure

```
Key: "leaderboard" (ZSET)
├── Member: "user123" → Score: 150
├── Member: "user456" → Score: 142
└── Member: "user789" → Score: 138

Key: "user:user123" (HASH)
├── username: "john_doe"
└── lastUpdated: "2024-01-01T00:00:00Z"

Key: "rate_limit:user123" (ZSET)
├── Member: "1704067200000-0.123" → Score: 1704067200000
└── Member: "1704067200500-0.456" → Score: 1704067200500
```

## Installation and Setup

### Prerequisites

- Node.js 16+
- Docker and Docker Compose
- Redis 7+ (or use Docker)

### Quick Start with Docker

```bash
# Clone and navigate to project
cd src/problem6

# Build and start services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

### Manual Setup

```bash
# Navigate to project
cd src/problem6

# Install dependencies
npm install

# Start Redis (if not using Docker)
redis-server

# Start development server
npm run dev

# Or build and start production
npm run build
npm start
```

### Environment Variables

```env
# Server Configuration
PORT=3000
NODE_ENV=development

# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# Rate Limiting Configuration
RATE_LIMIT_WINDOW_MS=1000
RATE_LIMIT_POINTS=10

# Leaderboard Configuration
LEADERBOARD_TOP_COUNT=10
LEADERBOARD_KEY=leaderboard
```

## API Endpoints

### Core Endpoints

| Method | Endpoint                       | Description                        |
|--------|--------------------------------|------------------------------------|
| GET    | `/api/leaderboard`             | Get top N users                    |
| GET    | `/api/user/:userId/score`      | Get user score and rank            |
| POST   | `/api/user/score`              | Update user score                  |
| GET    | `/api/user/:userId/rate-limit` | Get rate limit status              |
| GET    | `/api/events`                  | SSE endpoint for real-time updates |

### Configuration Endpoints

| Method | Endpoint           | Description                     |
|--------|--------------------|---------------------------------|
| GET    | `/api/config`      | Get system configuration        |
| POST   | `/api/config`      | Update configuration (dev only) |
| DELETE | `/api/leaderboard` | Clear leaderboard (dev only)    |

## Usage Examples

### Update User Score

```bash
curl -X POST http://localhost:3000/api/user/score \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user123",
    "username": "john_doe",
    "points": 10,
    "action": "complete_task"
  }'
```

### Get Leaderboard

```bash
curl http://localhost:3000/api/leaderboard?count=5
```

### Connect to SSE Stream

```javascript
const eventSource = new EventSource('/api/events');

eventSource.addEventListener('leaderboard_update', (event) => {
    const data = JSON.parse(event.data);
    console.log('Leaderboard updated:', data.leaderboard);
});

eventSource.addEventListener('user_score_update', (event) => {
    const data = JSON.parse(event.data);
    console.log('User score updated:', data.userScore);
});
```

## Configuration

### Rate Limiting Configuration

```typescript
interface RateLimitConfig {
    windowMs: number;    // Time window in milliseconds (default: 1000)
    maxPoints: number;   // Max actions per window (default: 10)
}
```

**Important**: Rate limiting is based on number of actions (requests), not score points:
- Each POST request to `/api/user/score` counts as 1 action
- Score points (1-50) are separate from rate limiting
- This prevents confusion between request frequency and score values

### Redis Configuration

```typescript
interface RedisConfig {
    host: string;        // Redis host (default: localhost)
    port: number;        // Redis port (default: 6379)
    password?: string;   // Redis password (optional)
    db?: number;         // Redis database number (default: 0)
}
```

## Performance Characteristics

### Redis Operations Complexity

| Operation        | Complexity   | Description                     |
|------------------|--------------|---------------------------------|
| Score Update     | O(log N)     | Update user score in sorted set |
| Get Top N        | O(log N + M) | Get top M users from N total    |
| Get User Rank    | O(log N)     | Get user's rank in leaderboard  |
| Rate Limit Check | O(log N)     | Check rate limit window         |

## Security Features

### Input Validation

- Required field validation
- Type checking for all inputs
- Positive number validation for points
- Username sanitization

### Rate Limiting

- Per-user rate limiting
- Sliding window algorithm
- Configurable limits
- Fail-open strategy
