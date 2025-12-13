# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

CoinCoin Casino is a microservices-based online casino platform with cryptocurrency support (Polygon). This is a university project demonstrating modern distributed architecture patterns.

## Architecture

The system uses a microservices architecture with 8 independent services communicating via RabbitMQ:

- **Frontend**: Next.js 16 (React 19) with TypeScript and Tailwind CSS (port 3000)
- **Auth Service**: JWT-based authentication (port 8001)
- **Wallet Service**: Cryptocurrency wallet management with Polygon integration (port 8002)
- **Game Engine**: Roulette game logic with Random.org integration (port 8003)
- **Chat Service**: Server-Sent Events (SSE) for real-time game feed (port 8004)
- **Stats Service**: Server-Sent Events (SSE) for real-time statistics (port 8005)
- **Notifier Service**: Event-based notification handler (port 8006)
- **CoinMarketCap Service**: Crypto price API with Redis caching (port 8007)

All services run in Docker containers orchestrated by Docker Compose, with NGINX as the reverse proxy on port 80.

**Infrastructure**:
- MongoDB (port 27017) - Each service has its own database
- Redis (port 6379) - Caching and session storage
- RabbitMQ (port 5672, management UI on 15672) - Inter-service messaging

**Service Communication**:
- External requests → NGINX → Microservices
- Microservices ↔ RabbitMQ for async events
- SSE services use special NGINX configuration for long-lived connections

## Development Setup

### Environment Configuration

```bash
# Copy template and configure
cp .env.template .env
```

Required environment variables:
- `MONGO_PASSWORD` - MongoDB admin password
- `JWT_SECRET` / `JWT_REFRESH_SECRET` - JWT signing keys
- `REDIS_PASSWORD` - Redis authentication
- `RABBITMQ_PASSWORD` - RabbitMQ authentication
- `POLYGON_RPC_URL` - Polygon blockchain RPC endpoint
- `CMC_API_KEY` - CoinMarketCap API key
- `RANDOM_ORG_API_KEY` - Random.org API key

### Starting the Application

```bash
# Start all services in development mode
docker-compose -f docker-compose.dev.yml up -d

# View logs for all services
docker-compose -f docker-compose.dev.yml logs -f

# View logs for specific service
docker-compose -f docker-compose.dev.yml logs -f auth

# Stop all services
docker-compose -f docker-compose.dev.yml down

# Stop and remove volumes (full clean)
docker-compose -f docker-compose.dev.yml down -v
```

### MongoDB Initialization

MongoDB is initialized using `scripts/init-mongo.js`, which creates necessary databases for each service. To launch MongoDB separately:

```bash
./scripts/launch-mongo.sh
```

### Service Development

Each microservice follows this structure:
```
services/<service-name>/
├── src/
│   ├── server.ts           # Entry point
│   ├── routes/index.ts     # Route definitions
│   ├── controllers/index.ts # Request handlers
│   └── models/index.ts     # Data models
├── Dockerfile.dev          # Development container
├── Dockerfile.prod         # Production container
└── package.json
```

All services use:
- TypeScript
- Express.js framework
- Nodemon for hot reload in dev mode
- Environment variables via dotenv

**Dev mode features**:
- Source code mounted as volumes for hot reload
- npm packages cached in anonymous volumes
- All ports exposed for direct access

**Running individual service commands**:
```bash
# Enter a service container
docker exec -it coincoincasino-auth-dev sh

# Rebuild a specific service
docker-compose -f docker-compose.dev.yml up -d --build auth

# Restart a service
docker-compose -f docker-compose.dev.yml restart auth
```

### Frontend Development

The frontend is built with Next.js 16 (App Router), React 19, and Tailwind CSS 4.

```bash
# Frontend scripts (inside container or locally)
npm run dev    # Development server with hot reload
npm run build  # Production build
npm run start  # Production server
npm run lint   # ESLint
```

## Key Integration Points

### NGINX Routing

All API routes are proxied through NGINX:
- `/api/auth/*` → Auth Service (8001)
- `/api/wallet/*` → Wallet Service (8002)
- `/api/games/*` → Game Engine (8003)
- `/api/chat/*` → Chat Service SSE (8004)
- `/api/stats/*` → Stats Service SSE (8005)
- `/` → Frontend (3000)

SSE endpoints have special configuration with `proxy_buffering off` and extended timeouts.

### Database Access

Each service connects to its own MongoDB database:
- Auth: `casino_auth`
- Wallet: `casino_wallet`
- Games: `casino_games`
- Chat: `casino_chat`
- Stats: `casino_stats`

Connection string format: `mongodb://casino_admin:${MONGO_PASSWORD}@mongodb:27017`

Direct access to MongoDB:
```bash
docker exec -it coincoincasino-mongodb-dev mongosh -u casino_admin -p ${MONGO_PASSWORD}
```

### RabbitMQ Events

Services communicate via RabbitMQ for async events (game results, balance updates, notifications). Access the management UI at http://localhost:15672 (user: casino_rabbit).

## Game Mechanics

**Roulette**:
- European roulette (37 numbers: 0-36)
- Minimum bet: 2000 CCC (equivalent to $2 USD)
- Random number generation via Random.org API
- Payout rates follow standard European roulette rules (e.g., straight up: 35:1)

**CCC Token**:
- Exchange rate: 1000 CCC = 1 USD (fixed)
- Deposits accepted in ETH/USDC on Polygon network
- Auto-conversion to CCC tokens

## Production Deployment

```bash
docker-compose -f docker-compose.prod.yml up -d
```

Production differences:
- No source volume mounts
- Optimized builds
- Production-ready configurations
- Different container names (no `-dev` suffix)

## Troubleshooting

**Port conflicts**:
```bash
lsof -i :80
lsof -i :27017
# Kill conflicting processes if needed
```

**NGINX not routing**:
```bash
# Test NGINX configuration
docker exec coincoincasino-nginx-dev nginx -t

# Reload NGINX
docker exec coincoincasino-nginx-dev nginx -s reload
```

**Service connection issues**:
- Verify all dependent services are running: `docker-compose ps`
- Check service logs for connection errors
- Ensure `.env` file exists and is properly configured
- Verify network connectivity: `docker network inspect canardsino_casino-network`
