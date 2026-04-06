# Nextudy AI Backend Documentation

## 1. Project Overview
**Nextudy AI** is a NestJS-based backend application designed to provide AI-enhanced study tools. It enables users to create workspaces, organize study materials (resources), generate automated questions and quizzes, manage flashcards, and interact with an AI tutor (Gemini) through a workbench-based chat interface.

---

## 2. Architecture & Tech Stack
- **Framework**: [NestJS](https://nestjs.com/) (Modular Architecture)
- **Language**: TypeScript
- **Database**: PostgreSQL with [Prisma ORM](https://www.prisma.io/)
- **Real-time**: [Socket.io](https://socket.io/) for AI chat streaming
- **Caching/State**: [Redis](https://redis.io/) for token revocation and request throttling
- **AI Integration**: [Google Gemini AI](https://ai.google.dev/) (via `@google/generative-ai`)
- **Authentication**: JWT (Access & Refresh tokens) with Passport.js
- **Monitoring**: [Sentry](https://sentry.io/) for error tracking and performance profiling
- **Mailing**: [Brevo](https://www.brevo.com/) (formerly Sendinblue) for transactional emails
- **File Handling**: Multer for local storage (with potential for cloud integration)

---

## 3. Core Modules & Features

### 🔐 Authentication & Users (`src/modules/auth`)
- **Registration & Login**: standard email/password flow (Argon2 hashing).
- **OAuth**: Google Login support.
- **Token Management**: JWT Access and Refresh tokens. Access tokens are short-lived; refresh tokens are stored in the database.
- **Security**: Throttling on sensitive routes and JWT revocation list via Redis.

### 🏢 Workspaces & Members (`src/modules/workspaces`)
- **Workspaces**: Logical containers for study projects.
- **Membership**: Role-based access (Owner, Editor, Member).
- **Invites**: Users can invite others via email. Invites generate notifications and can be accepted/rejected.

### 🛠️ Workbenches & Resources (`src/modules/workbenches`, `src/modules/resources`)
- **Resources**: Support for PDF, IMAGE, and TXT files.
- **Gemini Integration**: Files are uploaded to Google's File API for AI processing.
- **Workbenches**: Focused study areas within a workspace where specific resources are linked for AI context.

### ❓ Questions & Quizzes (`src/modules/questions`, `src/modules/quizzes`)
- **Generation**: AI generates Multiple Choice Questions (MCQ) and Open-Ended questions based on workbench resources.
- **Modes**:
  - **Auto**: AI extracts context and generates questions.
  - **Manual**: AI generates questions based on user-provided text.
- **Quiz System**:
  - Users can create quizzes from generated questions.
  - **Grading**: Automated MCQ grading and keyword-based open-ended grading.
- **Export**: Questions can be exported as PDF.

### 🗂️ Flashcards (`src/modules/flashcards`)
- Manage flashcard sets associated with workspaces and resources.
- AI-assisted generation (implied by service structure).

### 💬 AI Chat (`src/modules/chat`)
- **Real-time Interaction**: Powered by WebSockets (Socket.io).
- **Context-Aware**: The AI tutor has access to the resources linked in the workbench.
- **Streaming**: Responses are streamed chunk-by-chunk for a responsive UI.
- **History**: Chat histories are persisted in the database.

### 🔔 Notifications (`src/modules/notifications`)
- Real-time and persisted notifications for workspace invites and system updates.

---

## 4. Database Schema & Data Dictionary (Prisma)
The database is structured around the `User` -> `Workspace` -> `Workbench` hierarchy.

### Core Entities
| Entity | Description |
| :--- | :--- |
| **User** | Central entity. Stores basic profile, hashed credentials, and Google ID for OAuth. |
| **Workspace** | A shared container for materials. Owned by one user, but can have multiple members/invites. |
| **Workbench** | A focused "project" or "room" within a workspace where specific resources are linked for AI context. |
| **Resource** | Represents an uploaded file (PDF, Image, etc.). Contains a `store_id` (Google File API URI) and extracted `content`. |

### Study Entities
| Entity | Description |
| :--- | :--- |
| **Question** | AI-generated or user-provided questions. Supports MCQ and Open-Ended types. |
| **Quiz** | A collection of questions. Tracks `QuizAttempt` and `UserQuizAnswer` for grading and progress. |
| **FlashcardSet** | A collection of flashcards, often derived from specific resources within a workspace. |

### Communication Entities
| Entity | Description |
| :--- | :--- |
| **Notification** | Real-time and persisted alerts (e.g., workspace invites, system messages). |
| **ChatHistory** | Persists conversations between a user and the AI tutor within a workbench. |

---

## 5. API Reference & WebSocket Protocol

### REST API (Swagger)
The project is configured with **Swagger OpenAPI**. When the server is running, the full interactive API documentation (endpoints, schemas, and authentication) is available at:
`http://localhost:3000/api`

### WebSockets (AI Chat)
Real-time chat streaming uses the `chat` namespace (`socket.io`).
- **Authentication**: JWT must be provided in the handshake auth (`{ token: '...' }`) or the `Authorization` header.
- **Events (Client to Server)**:
  - `chat:sendMessage`: `{ chatId: number, content: string }`
  - `chat:editMessage`: `{ chatId: number, messageId: number, content: string }`
- **Events (Server to Client)**:
  - `chat:chunk`: Partial AI response (for streaming UI).
  - `chat:message`: The complete assistant message object.
  - `chat:userMessage`: Echo of the user's message after persistence.
  - `chat:error`: Error messages for failed requests.

---

## 6. AI Workflow: From Document to Quiz
1.  **Upload**: Resource is uploaded via `ResourcesModule`. It's stored locally and then uploaded to the **Google Gemini File API**.
2.  **Extraction**: `GeminiService` extracts text and formats it as semantic HTML.
3.  **Contextualization**: Resources are linked to a `Workbench`.
4.  **Generation**: `QuestionsService` sends the workbench's resources (URIs and extracted HTML) to Gemini with a specialized prompt to generate MCQ/Open-Ended questions.
5.  **Interactive Study**: Users can chat with the AI about these specific documents via the `ChatGateway`, which uses the same resource context.

### Google Gemini AI
Central to the app's value proposition. Used for:
- Text extraction from documents.
- Question and flashcard generation.
- Interactive AI chat with source citations.

### Redis
Used for:
- **Throttling Storage**: Global and route-specific rate limiting.
- **JWT Revocation**: Storing blacklisted tokens (e.g., after logout).

### Brevo
Used for sending workspace invitations and password reset emails.

---

## 6. Security
- **JWT Guards**: Protected routes require a valid `Bearer` token.
- **Revocation**: Tokens are checked against a Redis blacklist on every request.
- **CORS & Helmet**: Configured for secure cross-origin requests and basic security headers.
- **Input Validation**: `class-validator` and `class-transformer` for DTO validation.

---

## 7. Development & Deployment

### Environment Variables
Key variables required in `.env`:
- `DATABASE_URL`: PostgreSQL connection string.
- `REDIS_URL`: Redis connection string.
- `GEMINI_API_KEY`: API key for Google Gemini.
- `JWT_ACCESS_SECRET` & `JWT_REFRESH_SECRET`.
- `BREVO_API_KEY`: For mailing services.
- `SENTRY_DSN`: For error tracking.

### Commands
- `npm run start:dev`: Development mode with watch.
- `npm run build`: Production build.
- `npx prisma migrate dev`: Run database migrations.
- `npm run test`: Execute unit tests.
