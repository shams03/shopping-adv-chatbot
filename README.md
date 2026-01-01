# Production-Grade LLM-Powered Chat Application

A production-ready chat system with persistent conversations, deterministic memory management, summary-based context compression, rate limiting, and robust error handling.

## 🚀 Quick Start

```bash
# 1. Start Redis
docker start redis-stack  # or: docker run -d --name redis-stack -p 6379:6379 -p 8001:8001 redis/redis-stack:latest

# 2. Backend (Terminal 1)
cd chatbot-backend
npm install
npm run dev  # Runs on http://localhost:3000

# 3. Frontend (Terminal 2)
cd chatbot-frontend
npm install
npm run dev  # Runs on http://localhost:5173
```

Visit `http://localhost:5173` to start chatting!

## Architecture Overview

This application consists of:

- **Backend**: Node.js + TypeScript + Express + PostgreSQL + Redis
- **Frontend**: React + TypeScript + Vite + Tailwind CSS + Framer Motion
- **LLM**: Google Gemini API (abstracted behind service layer)

## Features

-  **Persistent Conversations** - All messages are stored permanently in PostgreSQL
-  **Deterministic Memory Management** - Summary-based context compression
-  **Rate Limiting** - IP-based (20 req/min) and session-based (5 req/min) using Redis✅ **Input Validation** - Backend validation for all inputs
-  **Graceful Error Handling** - User-friendly error messages, no stack traces
-  **Modern Chat UI** - Responsive, accessible, with session persistence

## Memory Strategy

### Core Principles

The system implements a **deterministic memory management strategy** that ensures:

1. **System prompt** is included in EVERY LLM call (immutable, never stored)
2. **Only ONE summary** exists per conversation (never multiple summaries)
3. **Summary NEVER overlaps** with raw messages
4. **Raw messages are immutable** and stored forever
5. **Prompt payloads are NOT persisted** (computed at runtime only)

### Canonical Memory Layout

Every LLM call follows this structure:

```
[ SYSTEM PROMPT ]
[ CONVERSATION SUMMARY (if exists) ]
[ LAST 5 RAW MESSAGES ]
[ CURRENT USER MESSAGE ]
```

### Summarization Rules

#### Initial Summarization

- **Trigger**: If total messages > 20 AND no summary exists
- **Action**: Summarize messages 1 → (N - 5)
- **Result**: Creates summary covering first (N-5) messages, keeps last 5 as raw

#### Re-Summarization

- **Trigger**: If raw window grows > 10 messages (i.e., more than 5 new messages since last summary)
- **Action**: Combine existing summary + new raw messages into updated summary
- **Result**: Replaces old summary (does NOT append), updates `summaryUntil` pointer

### Database Schema

```sql
conversations:
  - id (UUID, primary key)
  - createdAt (timestamp)
  - summary (text, nullable) - Compressed long-term memory
  - summaryUntil (integer, nullable) - Message count up to which summary covers

messages:
  - id (UUID, primary key)
  - conversationId (UUID, foreign key)
  - sender ("user" | "ai")
  - text (text)
  - createdAt (timestamp)
```

### Memory Flow Example

1. **Messages 1-20**: All stored as raw messages
2. **Message 21**:
   - Summary created covering messages 1-16
   - Raw window: messages 17-21 (last 5)
3. **Messages 22-26**: Added to raw window
4. **Message 27**:
   - Re-summarize: combine summary (1-16) + new messages (17-26)
   - New summary covers messages 1-26
   - Raw window: messages 27+ (last 5)

## Rate Limiting

The system implements **layered rate limiting** using Redis:

- **IP-based limit**: 20 requests per minute per IP address
- **Session-based limit**: 5 requests per minute per session
- **Fail-open**: If Redis is unavailable, requests are allowed (availability over strictness)

Rate limit responses include:

- HTTP 429 status code
- Clear error message
- `retryAfter` field (seconds)

## API Endpoints

### POST `/api/v1/chat/message`

Send a message and receive AI reply.

**Request:**

```json
{
  "message": "What is your return policy?",
  "sessionId": "optional-session-id"
}
```

**Response:**

```json
{
  "reply": "We offer a 30-day return window for unused items...",
  "sessionId": "uuid-of-conversation"
}
```

**Rate Limited**: Yes (IP: 20 req/min, Session: 5 req/min)

### GET `/api/v1/chat/history/:sessionId`

Get conversation history.

**Response:**

```json
{
  "messages": [
    {
      "sender": "user",
      "text": "Hello",
      "timestamp": "2024-01-01T12:00:00.000Z"
    },
    {
      "sender": "ai",
      "text": "Hi! How can I help?",
      "timestamp": "2024-01-01T12:00:01.000Z"
    }
  ]
}
```

### GET `/health`

Health check endpoint with Redis status.

**Response:**

```json
{
  "status": "ok",
  "service": "chatbot-api",
  "redis": {
    "connected": true,
    "latency": "2ms",
    "version": "7.4.7"
  },
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

### GET `/debug/redis` (Development Only)

View all rate limit keys in Redis.

**Response:**

```json
{
  "totalKeysInRedis": 2,
  "rateLimitKeys": 2,
  "keys": {
    "rate_limit:ip:::1": {
      "value": "5",
      "ttl": 45,
      "expiresIn": "45 seconds",
      "willExpireAt": "2024-01-01T12:00:45.000Z"
    }
  }
}
```

## Setup & Installation

### Prerequisites

- Node.js 18+
- PostgreSQL database
- Redis server (for rate limiting)
- Google Gemini API key (RPD limit : 20)

### Backend Setup

1. **Navigate to backend directory:**

   ```bash
   cd assignment-chatbot/chatbot-backend
   ```
2. **Install dependencies:**

   ```bash
   npm install
   ```
3. **Configure environment variables:**
   Create a `.env` file:

   ```env
   DATABASE_URL="postgresql://user:password@host:port/database"
   GEMINI_API_KEY="your-gemini-api-key"
   REDIS_URL="redis://localhost:6379"
   PORT=3000
   NODE_ENV=development
   ```
4. **Run database migrations:**

   ```bash
   npx prisma migrate deploy
   ```
5. **Generate Prisma client:**

   ```bash
   npm run prisma:generate
   ```
6. **Start the server:**

   ```bash
   npm run dev
   ```

   The backend will run on `http://localhost:3000`

### Frontend Setup

1. **Navigate to frontend directory:**

   ```bash
   cd assignment-chatbot/chatbot-frontend
   ```
2. **Install dependencies:**

   ```bash
   npm install
   ```
3. **Configure environment (optional):**
   Create a `.env` file if backend URL differs:

   ```env
   VITE_API_URL=http://localhost:3000/api/v1
   ```
4. **Start the development server:**

   ```bash
   npm run dev
   ```

   The frontend will run on `http://localhost:5173`

### Redis Setup

Using Docker (as mentioned in requirements):

```bash
docker run -d --name redis-stack -p 6379:6379 -p 8001:8001 redis/redis-stack:latest
```

Or use a local Redis installation.

## Project Structure

```
assignment-chatbot/
├── chatbot-backend/
│   ├── src/
│   │   ├── lib/
│   │   │   ├── env.ts          # Environment configuration
│   │   │   ├── prisma.ts       # Prisma client setup
│   │   │   └── redis.ts        # Redis client setup
│   │   ├── middleware/
│   │   │   ├── rateLimiter.ts  # Rate limiting middleware
│   │   │   ├── validator.ts    # Input validation
│   │   │   └── errorHandler.ts # Global error handler
│   │   ├── repositories/
│   │   │   ├── conversation.repo.ts  # Conversation data access
│   │   │   └── message.repo.ts       # Message data access
│   │   ├── services/
│   │   │   ├── chat.service.ts       # Chat orchestration
│   │   │   ├── llm.service.ts        # LLM abstraction
│   │   │   └── summary.service.ts    # Memory management
│   │   ├── routes/
│   │   │   └── chat.route.ts         # API routes
│   │   └── app.ts                    # Express app setup
│   └── prisma/
│       └── schema.prisma             # Database schema
│
└── chatbot-frontend/
    ├── src/
    │   ├── components/
    │   │   ├── ChatMessage.tsx  # Message display component
    │   │   └── ChatInput.tsx    # Input component
    │   ├── hooks/
    │   │   └── useTheme.ts      # Theme management hook
    │   ├── lib/
    │   │   ├── api.ts           # API client
    │   │   └── storage.ts       # localStorage wrapper
    │   └── App.tsx              # Main app component
```

## System Prompt

The system uses a strict system prompt that:

- Defines the agent as an e-commerce support representative
- Injects store policies (shipping, returns, support hours)
- Forbids hallucination or internal disclosure
- Treats conversation summary as authoritative history
- Prioritizes latest user messages over summary conflicts

**The system prompt is repeated verbatim on every LLM call** and is never stored in the database.

## Error Handling

The system implements graceful error handling:

- **LLM errors**: Return user-friendly message, never expose stack traces
- **Database errors**: Logged server-side, return generic error to client
- **Validation errors**: Return specific validation messages (400 status)
- **Rate limit errors**: Return clear rate limit messages (429 status)
- **Unknown errors**: Return generic error message (500 status)

## Input Validation

Backend validation ensures:

- Message is required and must be a string
- Message cannot be empty or whitespace-only
- Message length is capped at 5000 characters
- All inputs are trimmed before processing

## Frontend Features

- ✅ **Modern Chat UI** - Beautiful, responsive design with smooth animations
- ✅ **Theme Toggle** - Light/dark mode with system preference detection
- ✅ **Keyboard Shortcuts** - Auto-focus input when typing anywhere
- ✅ **Scrollable Chat Interface** - Smooth auto-scroll to latest messages
- ✅ **User vs AI Message Distinction** - Clear visual styling with avatars
- ✅ **Enter-to-Send** - Press Enter to send, Shift+Enter for new line
- ✅ **Disabled Send Button** - Prevents duplicate requests while processing
- ✅ **Session Persistence** - Conversation history saved in localStorage
- ✅ **History Restoration** - Automatically restores conversation on page reload
- ✅ **Error Display** - Dismissible error banner with animations
- ✅ **Loading States** - Visual feedback during API calls
- ✅ **Responsive Design** - Works perfectly on mobile, tablet, and desktop
- ✅ **Framer Motion Animations** - Smooth transitions and effects throughout
- ✅ **Animated Background** - Subtle wave effects for visual appeal

## Testing the Application

1. **Start Redis:**

   ```bash
   docker start redis-stack
   # Or if not running:
   docker run -d --name redis-stack -p 6379:6379 -p 8001:8001 redis/redis-stack:latest
   ```
2. **Start Backend:**

   ```bash
   cd assignment-chatbot/chatbot-backend
   npm run dev
   ```

   Backend will run on `http://localhost:3000`
3. **Start Frontend:**

   ```bash
   cd assignment-chatbot/chatbot-frontend
   npm run dev
   ```

   Frontend will run on `http://localhost:5173`
4. **Open browser:**
   Navigate to `http://localhost:5173`
   Header part can be dynamically dragged and adjusted as per user
5. **Test features:**

   - ✅ Send messages and verify AI responses
   - ✅ Toggle theme (light/dark mode)
   - ✅ Test keyboard auto-focus (type anywhere)
   - ✅ Refresh page to verify session persistence
   - ✅ Send >20 messages to trigger summarization
   - ✅ Test rate limiting by sending rapid requests (should hit limit at 20)
   - ✅ Check Redis keys: `curl http://localhost:3000/debug/redis`
   - ✅ View Redis UI: `http://localhost:8001`

## Additional Endpoints

- **Health Check**: `GET http://localhost:3000/health` - Check Redis connection
- **Debug Redis**: `GET http://localhost:3000/debug/redis` - View rate limit keys

## Technology Stack

### Backend

- **Runtime**: Node.js 18+
- **Language**: TypeScript (strict mode)
- **Framework**: Express.js
- **Database**: PostgreSQL with Prisma ORM
- **Cache/Rate Limiting**: Redis (ioredis)
- **LLM**: Google Gemini API

### Frontend

- **Framework**: React 19 + TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS 4
- **Animations**: Framer Motion
- **Icons**: Lucide React

## Production Considerations

- **Environment Variables**: Never commit `.env` files (already in `.gitignore`)
- **Database**: Use connection pooling for production (already configured)
- **Redis**: Configure Redis persistence for production
- **Error Logging**: Integrate with logging service (e.g., Sentry)
- **Monitoring**: Health check endpoints available (`/health`)
- **CORS**: Configure CORS origins for production domain
- **Rate Limiting**: Adjust limits based on expected traffic
- **LLM Costs**: Monitor token usage and implement budget limits
- **Security**: Review rate limiting thresholds for production
- **Performance**: Consider CDN for frontend assets

## Development Notes

- **Debug Logging**: Rate limiter logs are enabled in development mode
- **Redis Keys**: Automatically expire after 60 seconds (by design)
- **Type Safety**: All types are inferred from Prisma schema
- **Memory Management**: Summarization triggers are deterministic and testable

## If I had more time I would focus on :

- UI/UX
- Use SSE instead of HTTP
