# Nextudy — AI-Powered Study Platform (Backend)

A NestJS REST + WebSocket API that lets users upload study materials and use Google Gemini AI to generate questions, quizzes, and flashcards, and chat with an AI tutor grounded in their documents.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | NestJS 11, TypeScript |
| Database | PostgreSQL + Prisma 7 |
| AI | Google Gemini (`@google/generative-ai`) |
| Real-time | Socket.IO (WebSockets) |
| Cache / Rate-limit | Redis (ioredis) |
| Auth | JWT (access + refresh) + Passport.js + Argon2 |
| Email | Brevo (transactional mail) |
| File uploads | Multer |
| Monitoring | Sentry (error tracking + profiling) |
| Security | Helmet, CORS, class-validator |

---

## Architecture

```
Request → Controller → Service → Repository → Prisma (PostgreSQL)
                                     ↕
                              GeminiService (AI)
                              RedisService (cache)
                              MailService (email)
```

**Key design patterns:**
- **Repository pattern** — all DB queries isolated from service logic
- **Interface-based AI injection** — `IGeminiService` / `IGeminiFileService` tokens make the AI layer swappable and testable
- **JWT blocklist** — revoked tokens stored in Redis by `jti`, checked on every authenticated request
- **Workspace RBAC** — three roles (owner / editor / member) enforced in repository-level filter helpers
- **Global pipeline** — `TransformInterceptor` wraps all responses in `{ success, data }`, `HttpExceptionFilter` + `PrismaClientExceptionFilter` normalize all errors

---

## Getting Started

### Prerequisites

- Node.js ≥ 20
- PostgreSQL database
- Redis instance
- Google Gemini API key
- Brevo API key (for email)

### Installation

```bash
git clone <repo>
cd backend
npm install
cp .env.example .env   # fill in values — see table below
npx prisma migrate dev
npm run start:dev
```

Swagger UI is available at `http://localhost:3000/api` once the server is running.

### Environment Variables

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | ✅ | PostgreSQL connection string |
| `REDIS_URL` | ✅ | Redis connection string |
| `GEMINI_API_KEY` | ✅ | Google Gemini API key |
| `GEMINI_MODEL` | — | Gemini model name (default: `gemini-3.1-flash-lite-preview`) |
| `JWT_ACCESS_SECRET` | ✅ | Secret for signing access tokens |
| `JWT_REFRESH_SECRET` | ✅ | Secret for signing refresh tokens |
| `FRONTEND_URL` | ✅ | Frontend base URL (used in password reset emails) |
| `ALLOWED_ORIGINS` | ✅ | Comma-separated CORS origins, e.g. `https://app.example.com` |
| `COOKIE_DOMAIN` | — | Cookie domain in production, e.g. `.example.com` |
| `PORT` | — | HTTP port (default: `3000`) |
| `NODE_ENV` | — | `production` enables secure cookies |
| `BREVO_API_KEY` | ✅ | Brevo API key for transactional emails |
| `SENTRY_DSN` | — | Sentry DSN for error tracking |

---

## API Reference

All endpoints (except those marked **Public**) require `Authorization: Bearer <accessToken>`.

### Auth — `POST /auth`

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/auth/register` | Public | Register with email & password |
| POST | `/auth/login` | Public | Login, returns access + refresh tokens |
| POST | `/auth/logout` | ✅ | Logout, revokes tokens |
| POST | `/auth/refresh` | Refresh token | Get new token pair |
| POST | `/auth/google` | Public | Login / register with Google OAuth access token |
| POST | `/auth/forgot-password` | Public | Send password reset email |
| POST | `/auth/reset-password` | Public | Reset password using emailed token |

### Workspaces — `/workspaces`

| Method | Path | Description |
|---|---|---|
| POST | `/workspaces` | Create workspace |
| GET | `/workspaces` | List all workspaces for the current user |
| GET | `/workspaces/:id/overview` | Counts + recent activity for a workspace |
| PATCH | `/workspaces/:id` | Update workspace name |
| DELETE | `/workspaces/:id` | Delete workspace (owner only) |

### Workspace Members — `/workspaces/:id/members`

| Method | Path | Description |
|---|---|---|
| GET | `/workspaces/:id/members` | List members |
| PATCH | `/workspaces/:id/members/:memberId` | Update member role (owner only) |
| DELETE | `/workspaces/:id/members/:memberId` | Remove member (owner only) |
| DELETE | `/workspaces/:id/members/me` | Leave workspace |

### Workspace Invites — `/workspaces/:id/invites`

| Method | Path | Description |
|---|---|---|
| POST | `/workspaces/:id/invites` | Invite a user by email (owner only) |

### Workbenches — `/workbenches`

| Method | Path | Description |
|---|---|---|
| POST | `/workbenches` | Create workbench in a workspace |
| GET | `/workbenches?workspaceId=` | List workbenches in a workspace |
| PATCH | `/workbenches/:id` | Rename workbench |
| DELETE | `/workbenches/:id` | Delete workbench |
| GET | `/workbenches/:id/resources` | List resources linked to workbench |
| PUT | `/workbenches/:id/resources` | Set (replace) linked resources |

### Resources — `/resources`

| Method | Path | Description |
|---|---|---|
| POST | `/resources/upload?workspaceId=` | Upload file (PDF / image / text) |
| GET | `/resources?workspaceId=` | List all resources in workspace |
| GET | `/resources/:id/content` | Get extracted HTML content of resource |
| DELETE | `/resources/:id` | Delete resource (removes file + Gemini copy) |

### Resource Groups — `/resource-groups`

| Method | Path | Description |
|---|---|---|
| POST | `/resource-groups` | Create a resource group |
| GET | `/resource-groups?workspaceId=` | List resource groups |
| PATCH | `/resource-groups/:id` | Update group |
| POST | `/resource-groups/:id/resources/:resourceId` | Add resource to group |
| DELETE | `/resource-groups/:id/resources/:resourceId` | Remove resource from group |

### Questions — `/questions`

| Method | Path | Description |
|---|---|---|
| POST | `/questions` | Generate AI questions for a workbench |
| GET | `/questions?workbenchId=` | List questions in a workbench |
| PATCH | `/questions/:id` | Edit a question |
| DELETE | `/questions/:id` | Delete a question |
| POST | `/questions/:id/regenerate` | Regenerate a single question |
| GET | `/questions/export/pdf?workbenchId=` | Export questions as PDF |

### Quizzes — `/quizzes`

| Method | Path | Description |
|---|---|---|
| POST | `/quizzes` | Create quiz from existing questions |
| GET | `/quizzes?workspaceId=` | List quizzes in workspace |
| GET | `/quizzes/:id` | Get quiz with questions |
| DELETE | `/quizzes/:id` | Delete quiz |
| POST | `/quizzes/:id/attempts` | Submit a quiz attempt |
| GET | `/quizzes/:id/attempts` | List attempts for a quiz |
| GET | `/quizzes/:id/attempts/:attemptId` | Get a specific attempt with graded answers |

### Flashcards — `/flashcards`

| Method | Path | Description |
|---|---|---|
| POST | `/flashcards/sets` | Generate AI flashcard set for a workspace |
| GET | `/flashcards/sets?workspaceId=` | List flashcard sets |
| GET | `/flashcards/sets/:id` | Get flashcard set with cards |
| PATCH | `/flashcards/sets/:id` | Update flashcard set metadata |
| DELETE | `/flashcards/sets/:id` | Delete flashcard set |
| PATCH | `/flashcards/cards/:id` | Edit a flashcard |
| DELETE | `/flashcards/cards/:id` | Delete a flashcard |

### Chat (REST) — `/chat`

| Method | Path | Description |
|---|---|---|
| POST | `/chat` | Create a new chat session |
| GET | `/chat?workbenchId=` | List chats for a workbench |
| GET | `/chat/:id` | Get chat with message history |
| DELETE | `/chat/:id` | Delete a chat |

### Settings — `/settings`

| Method | Path | Description |
|---|---|---|
| GET | `/settings/profile` | Get current user profile |
| PATCH | `/settings/profile` | Update name / profile fields |

### Contact & Health

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/contact` | Public | Send a contact form email |
| GET | `/health` | Public | Health check (DB + Redis liveness) |

---

## WebSocket — Chat Namespace

Connect to `ws://<host>/chat` with Socket.IO.

**Authentication** (required on handshake):
```js
io('/chat', { auth: { token: '<accessToken>' } })
// or Authorization: Bearer <token> header
```

**Client → Server:**

| Event | Payload | Description |
|---|---|---|
| `chat:sendMessage` | `{ chatId: number, content: string }` | Send a message |
| `chat:editMessage` | `{ chatId: number, messageId: number, content: string }` | Edit & regenerate from a message |

**Server → Client:**

| Event | Payload | Description |
|---|---|---|
| `chat:userMessage` | Message object | Echo of saved user message |
| `chat:chunk` | `{ chatId, chunk: string }` | Streaming AI response token |
| `chat:message` | Message object | Complete saved assistant message |
| `chat:error` | `{ message: string }` | Error on message processing |

---

## AI Integration

### How it works

1. **Upload** — A file is uploaded to the server and simultaneously pushed to the Google Gemini File API.
2. **Extract** — For PDFs, text is asynchronously extracted and stored as HTML in the database (fire-and-forget).
3. **Link** — Resources are linked to a Workbench, scoping the AI context.
4. **Generate** — When generating questions or flashcards, the service sends the Gemini File API URIs + extracted HTML to Gemini with a structured prompt.
5. **Chat** — The `ChatGateway` streams responses chunk-by-chunk via WebSocket, using the same resource context and full message history.

### Interface-based injection

`GeminiService` implements both `IGeminiService` and `IGeminiFileService`, injected via tokens:

```ts
@Inject(GEMINI_SERVICE) private readonly gemini: IGeminiService
@Inject(GEMINI_FILE_SERVICE) private readonly geminiFile: IGeminiFileService
```

This allows swapping or mocking the AI layer without changing consumer code.

---

## Security

| Feature | Implementation |
|---|---|
| Password hashing | Argon2 (not bcrypt) |
| Refresh token hashing | Argon2 stored hash in DB |
| JWT revocation | `jti`-keyed blocklist in Redis, checked on every request + WS handshake |
| Token rotation | New refresh token issued on every `/auth/refresh` |
| Password reset tokens | Single-use, SHA-256 hashed, TTL in Redis, timing-safe comparison |
| Anti-enumeration | `forgot-password` always returns the same response |
| Rate limiting | Per-route throttling backed by Redis |
| CORS | Restricted to `ALLOWED_ORIGINS` |
| HTTP headers | Helmet |
| Input validation | `class-validator` + `ValidationPipe` with `whitelist: true` |

---

## Scripts

```bash
npm run start:dev       # Development with hot reload
npm run build           # Production build
npm run start:prod      # Run production build
npx prisma migrate dev  # Run DB migrations
npx prisma studio       # Open Prisma Studio GUI
npm run lint            # ESLint
npm run format          # Prettier
```
