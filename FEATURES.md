# Nextudy Backend — Features & Functionalities

## 1. Auth

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/auth/register` | Register with email & password |
| POST | `/auth/login` | Login with email & password |
| POST | `/auth/google` | Login via Google OAuth access token |
| POST | `/auth/refresh` | Issue new access + refresh tokens |
| POST | `/auth/logout` | Invalidate refresh token |

- JWT access token (1 day) + refresh token (7 days)
- Refresh token stored in `httpOnly` cookie; also accepted from request body
- Passwords hashed with Argon2
- Google identity verified against Google OAuth userinfo endpoint
- Accounts auto-created or linked on first Google login

---

## 2. Workspaces

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/workspaces` | Create workspace |
| GET | `/workspaces` | List workspaces for current user |
| PUT | `/workspaces/:id` | Update workspace (editor+) |
| DELETE | `/workspaces/:id` | Delete workspace (owner only) |
| POST | `/workspaces/:id/leave` | Leave a workspace |
| GET | `/workspaces/:id/members` | List members |
| PATCH | `/workspaces/:id/members/:memberId/role` | Change member role (owner only) |
| DELETE | `/workspaces/:id/members/:memberId` | Remove member (owner only) |
| POST | `/workspaces/:id/invite` | Invite user by email (owner only) |

**Roles:** `owner` › `editor` › `member`

---

## 3. Notifications & Invites

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/notifications` | Get all notifications (newest first) |
| PATCH | `/notifications/read-all` | Mark all notifications as read |
| PATCH | `/notifications/:id/read` | Mark one notification as read |
| POST | `/notifications/invites/:inviteId/accept` | Accept workspace invite |
| POST | `/notifications/invites/:inviteId/reject` | Reject workspace invite |

- Accepting an invite atomically adds the user to the workspace and updates the invite + notification in a single transaction

---

## 4. Resources

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/resources` | Upload file to workspace (editor+) |
| GET | `/resources?workspaceId=X` | List workspace resources |
| GET | `/resources/:id/download` | Download resource file |
| DELETE | `/resources/:id` | Delete resource (editor+) |
| GET | `/resource-groups?workspaceId=X` | List resource groups |
| POST | `/resource-groups` | Create resource group (editor+) |
| PUT | `/resource-groups/:id` | Update group name (editor+) |
| POST | `/resource-groups/:id/resources` | Add resource to group |
| DELETE | `/resource-groups/:id/resources/:resourceId` | Remove resource from group |

- Supported types: PDF, image, plain text, document
- Files stored locally and uploaded to Google Gemini Files API for AI processing
- Path traversal protection on file downloads

---

## 5. Workbenches

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/workbenches` | Create workbench (editor+) |
| GET | `/workbenches?workspaceId=X` | List workspace workbenches |
| GET | `/workbenches/:id` | Get workbench |
| PATCH | `/workbenches/:id` | Update workbench name (editor+) |
| DELETE | `/workbenches/:id` | Delete workbench (editor+) |
| GET | `/workbenches/:id/resources` | Get linked resources |
| PUT | `/workbenches/:id/resources` | Replace linked resources (editor+) |

- Workbenches are study containers inside workspaces
- Resources linked to a workbench become the context for AI features (questions, chat)

---

## 6. Questions (AI-generated)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/questions` | Generate questions via Gemini |
| GET | `/questions?workbenchId=X` | List questions in workbench |
| GET | `/questions/:id` | Get question with choices/answer |
| PATCH | `/questions/:id` | Edit question |
| POST | `/questions/:id/regenerate` | Regenerate a single question |
| DELETE | `/questions/:id` | Delete question |

**Generation modes:**
- **AUTO** — Gemini generates questions from uploaded resources
- **USER_PROVIDED** — User supplies question text; Gemini generates the answer

**Question types:**
- **MCQ** — Multiple choice with one correct answer; choices stored with order and correctness flag
- **Open-ended** — Sample answer + weighted grading keywords (required / optional)

**Config options:** difficulty, answer schema, page range, question count, min-word threshold

---

## 7. Quizzes

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/quizzes` | Create quiz from existing questions (editor+) |
| GET | `/quizzes?workspaceId=X` | List workspace quizzes |
| GET | `/quizzes/:id` | Get quiz with all questions |
| DELETE | `/quizzes/:id` | Delete quiz (editor+) |
| POST | `/quizzes/:id/attempts/submit` | Submit answers and get score |
| GET | `/quizzes/:id/attempts` | List user's attempts for a quiz |
| GET | `/quizzes/:id/attempts/:attemptId` | Get attempt details |

**Auto-grading:**
- MCQ — checks selected choice `is_correct` flag
- Open-ended — keyword matching (case-insensitive); required keywords must all match, optional keywords need at least one match
- Score: `(correct / total) × 100`

---

## 8. Flashcards (AI-generated)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/flashcards` | Generate flashcards from resources via Gemini (editor+) |
| GET | `/flashcards?workspaceId=X` | List workspace flashcards |
| GET | `/flashcards/:id` | Get flashcard |
| PATCH | `/flashcards/:id` | Update flashcard |
| DELETE | `/flashcards/:id` | Delete flashcard |

- Count and difficulty configurable per request
- Each flashcard tracks which resources it was generated from

---

## 9. Chat (AI-powered)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/chats` | Create chat session in a workbench |
| GET | `/chats?workbenchId=X` | List workbench chats |
| GET | `/chats/:id` | Get chat with full message history |
| DELETE | `/chats/:id` | Delete chat |
| POST | `/chats/:id/messages` | Send message, get AI response |
| PATCH | `/chats/:id/messages/:messageId` | Edit a past message and re-generate from that point |

- Multi-turn conversation with persistent history
- Workbench resources are passed to Gemini as file context
- AI responses include source resource attribution
- Editing a message deletes all subsequent messages and re-generates the response

---

## 10. Settings

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/settings/profile` | Get user profile |
| PATCH | `/settings/profile` | Update first name, last name, email |

---

## Cross-cutting

### Security
- All endpoints protected by `JwtAccessGuard` globally; opt-out with `@Public()`
- Role checks enforced at repository level using shared `anyMemberFilter` / `ownerOrEditorFilter` helpers
- Argon2 password + refresh token hashing
- `httpOnly` + `secure` (production) cookies for refresh tokens

### AI — Google Gemini
- Model: `gemini-2.5-flash`
- Used for: question generation, flashcard generation, chat responses
- Files uploaded to Gemini Files API; deleted on resource removal
- Structured JSON extraction with markdown fence cleanup

### Architecture
- NestJS with modular structure
- Repository pattern (one repository per module, workspace checks centralised in `WorkspacesRepository`)
- Prisma ORM with transactions for atomic operations
- DTO validation on all inputs
- Global Prisma exception filter
