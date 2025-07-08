# Configuration Guide

## Environment Variables

The application uses the following environment variables:

### Server Configuration
- `PORT` - Server port (default: 3000)
- `NODE_ENV` - Environment mode (development/production)

### Redis Configuration
- `REDIS_HOST` - Redis server host (default: localhost)
- `REDIS_PORT` - Redis server port (default: 6379)
- `REDIS_PASSWORD` - Redis authentication password (optional)
- `REDIS_DB` - Redis database number (default: 0)

### Rate Limiting Configuration
- `RATE_LIMIT_WINDOW_MS` - Time window in milliseconds (default: 1000)
- `RATE_LIMIT_POINTS` - Maximum actions per window (default: 10)

### Leaderboard Configuration
- `LEADERBOARD_TOP_COUNT` - Number of top users to display (default: 10)
- `LEADERBOARD_KEY` - Redis key for leaderboard (default: leaderboard)

## Example .env File

```env
# Server Configuration
PORT=3000
NODE_ENV=development

# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0

# Rate Limiting Configuration
RATE_LIMIT_WINDOW_MS=1000
RATE_LIMIT_POINTS=10

# Leaderboard Configuration
LEADERBOARD_TOP_COUNT=10
LEADERBOARD_KEY=leaderboard
```

## Docker Environment Variables

When using Docker Compose, set these in the `docker-compose.yml` file:

```yaml
environment:
  - NODE_ENV=production
  - REDIS_HOST=redis
  - REDIS_PORT=6379
  - PORT=3000
  - RATE_LIMIT_POINTS=10
  - RATE_LIMIT_WINDOW_MS=1000
```

## Runtime Configuration

Some settings can be modified at runtime through the API:

- Rate limiting parameters (development mode only)
- Leaderboard display count
- SSE connection settings 