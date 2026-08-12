# Messaging Platform - Backend API

A real-time messaging platform built with Node.js as a learning project.

## Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js 5
- **Database**: MongoDB (via Mongoose 9)
- **Cache/PubSub**: Redis
- **Authentication**: JWT + bcryptjs
- **Containerization**: Docker + Docker Compose

## Getting Started

### Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) installed

### Run the application

```bash
# Start all services (API, MongoDB, Redis)
docker-compose up --build

# Run in background
docker-compose up -d

# View logs
docker-compose logs -f api-server
```

The API will be available at `http://localhost:3000`

### Run locally (without Docker)

```bash
# Install dependencies
npm install

# Start with hot-reload
npm start
```

> Note: You'll need MongoDB and Redis running locally.

## Environment Variables

Copy `.env.example` to `.env` and configure:

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | `3000` |
| `LOG_LEVEL` | Logging level (debug, info, warn, error) | `debug` |
| `SERVICE_NAME` | Service identifier for logs | `api-server` |
| `DB_URL` | MongoDB connection string | `mongodb://mongodb:27017/messaging-platform` |
| `REDIS_URL` | Redis connection string | `redis://redis:6379` |
| `JWT_SECRET` | Secret key for JWT signing | (required) |

## API Endpoints

### Authentication

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/api/auth/register` | Create a new account | No |
| POST | `/api/auth/login` | Login and get JWT token | No |

### Register

```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com", "password": "MyPass123!"}'
```

**Response (201):**
```json
{
  "message": "User registered successfully",
  "user": {
    "id": "...",
    "email": "user@example.com",
    "displayName": "user"
  },
  "token": "eyJhbG..."
}
```

### Login

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com", "password": "MyPass123!"}'
```

**Response (200):**
```json
{
  "message": "Login successful",
  "user": {
    "id": "...",
    "email": "user@example.com",
    "displayName": "user"
  },
  "token": "eyJhbG..."
}
```

## Project Structure

```
backend/
├── app.js                    # Application entry point
├── Dockerfile                # Docker image definition
├── docker-compose.yml        # Multi-service orchestration
├── .env                      # Environment variables (not in git)
├── .env.example              # Template for env variables
├── src/
│   ├── config/
│   │   ├── database.js       # MongoDB connection + pooling
│   │   ├── redis.js          # Redis client setup
│   │   └── env.js            # Environment validation
│   ├── controllers/
│   │   └── authController.js # Auth request handlers
│   ├── middleware/
│   │   ├── auth.js           # JWT middleware (HTTP)
│   │   ├── socketAuth.js     # JWT middleware (WebSocket)
│   │   └── errorHandler.js   # Global error handler
│   ├── models/
│   │   └── User.js           # User Mongoose schema
│   ├── routes/
│   │   └── auth.js           # Auth route definitions
│   ├── services/
│   │   └── authService.js    # Auth business logic
│   └── utils/
│       ├── errors.js         # Custom error classes
│       ├── logger.js         # Structured JSON logger
│       └── validators.js     # Input validation functions
└── tests/
    ├── unit/
    ├── property/
    └── integration/
```

## Error Handling

All errors return a consistent JSON format:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Description of what went wrong",
    "details": { "field": "email" }
  },
  "correlationId": "uuid",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

| HTTP Status | Error Code | Description |
|-------------|-----------|-------------|
| 400 | `VALIDATION_ERROR` | Invalid input |
| 401 | `UNAUTHORIZED` | Authentication failed |
| 409 | `CONFLICT` | Resource already exists |
| 429 | `RATE_LIMITED` | Too many attempts |
| 500 | `INTERNAL_ERROR` | Unexpected server error |

## Security Features

- **Password hashing**: bcryptjs with 10 salt rounds
- **Strong passwords required**: uppercase, lowercase, number, special character
- **JWT tokens**: 24h for registration, 60m for login
- **Account lockout**: 5 failed attempts → 30 min lock
- **Rate limiting**: Redis-based attempt tracking with 15 min window
- **Indistinguishable errors**: Same message for wrong email or wrong password

## Learning Progress

- [x] Phase 1: Project setup + Docker
- [x] Phase 2: Authentication system
- [ ] Phase 3: User profiles & contacts
- [ ] Phase 4: Messaging core
- [ ] Phase 5: Real-time WebSocket layer
- [ ] Phase 6: File sharing & reactions
- [ ] Phase 7: Notifications & documentation
- [ ] Phase 8: Resilience & scalability
