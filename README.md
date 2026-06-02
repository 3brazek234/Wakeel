# Wakeel API 🏛️

A SaaS marketplace API connecting lawyers across Egyptian courts. Lawyers register their court affiliations, post jobs, apply to work at courts they are registered at, communicate in real-time, and leave reviews — all through a clean REST + WebSocket API.

Built with **Bun**, **Elysia**, and **PostgreSQL** (raw SQL, no ORM).

---

## Prerequisites

- [Bun](https://bun.sh) v1.1+
- PostgreSQL 15+

## Setup

```bash
# 1. Clone & install
git clone <repo-url> && cd wakeel-api
bun install

# 2. Configure environment
cp .env.example .env
# Edit .env with your PostgreSQL credentials and JWT secret

# 3. Create the database
createdb wakeel_db

# 4. Run the migration
psql $DATABASE_URL < src/db/migrations/001_initial_schema.sql

# 5. Start the dev server
bun dev
```

The server starts on `http://localhost:3000` by default.

---

## Running Tests

```bash
bun test               # Run all tests once
bun test --watch       # Re-run on file changes
bun test --coverage    # With coverage report
```

---

## API Endpoint Reference

### Auth
| Method | Path               | Auth | Description                       |
|--------|--------------------|------|-----------------------------------|
| POST   | `/auth/register`   | No   | Register a new lawyer             |
| POST   | `/auth/login`      | No   | Login, receive JWT                |
| GET    | `/auth/me`         | Yes  | Get current user profile + courts |

### Courts
| Method | Path           | Auth | Description           |
|--------|----------------|------|-----------------------|
| GET    | `/courts`      | No   | List all courts       |
| GET    | `/courts/:id`  | No   | Get single court      |

### Jobs
| Method | Path                 | Auth | Description                                   |
|--------|----------------------|------|-----------------------------------------------|
| POST   | `/jobs`              | Yes  | Create a new job                              |
| GET    | `/jobs`              | Yes  | List jobs at lawyer's registered courts        |
| GET    | `/jobs/:id`          | Yes  | Get single job                                |
| PATCH  | `/jobs/:id/status`   | Yes  | Update job status (poster only)               |
| DELETE | `/jobs/:id`          | Yes  | Delete/cancel a job (poster only)             |

**Query params for GET /jobs:** `?status=open&court_id=<uuid>&page=1&limit=20`

### Applications
| Method | Path                                            | Auth | Description                         |
|--------|-------------------------------------------------|------|-------------------------------------|
| POST   | `/jobs/:jobId/applications`                     | Yes  | Apply to a job                      |
| GET    | `/jobs/:jobId/applications`                     | Yes  | List applications (poster only)     |
| PATCH  | `/jobs/:jobId/applications/:id/accept`          | Yes  | Accept an application (poster only) |
| PATCH  | `/jobs/:jobId/applications/:id/reject`          | Yes  | Reject an application (poster only) |

### Chat
| Method | Path                           | Auth          | Description                    |
|--------|--------------------------------|---------------|--------------------------------|
| WS     | `/chat/:jobId?token=<JWT>`     | Query param   | Real-time chat (WebSocket)     |
| GET    | `/jobs/:jobId/messages`        | Yes (Bearer)  | REST fallback for message history |

### Reviews
| Method | Path                         | Auth | Description                           |
|--------|------------------------------|------|---------------------------------------|
| POST   | `/jobs/:jobId/reviews`       | Yes  | Create a review (completed jobs only) |
| GET    | `/lawyers/:id/reviews`       | Yes  | Get reviews + avg rating for a lawyer |

---

## Court-Based Job Matching

The core marketplace logic relies on the `lawyer_courts` junction table. When a lawyer requests `GET /jobs`, the query filters to **only** show jobs posted at courts where the lawyer is registered:

```sql
SELECT j.*
FROM jobs j
WHERE j.court_id IN (
  SELECT lc.court_id
  FROM lawyer_courts lc
  WHERE lc.user_id = $1   -- the authenticated lawyer's ID
)
ORDER BY j.created_at DESC;
```

This ensures lawyers only see relevant opportunities within their jurisdiction. Similarly, when applying to a job, the service layer verifies the applicant has a matching row in `lawyer_courts` before allowing the application.

---

## Error Format

All errors follow a consistent shape:

```json
{
  "error": true,
  "message": "Human readable message",
  "code": "SNAKE_CASE_CODE"
}
```

| Status | Meaning                                        |
|--------|------------------------------------------------|
| 400    | Validation error or business rule violation    |
| 401    | Missing or invalid JWT                         |
| 403    | Authenticated but not authorized               |
| 404    | Resource not found                             |
| 409    | Conflict (duplicate application/review)        |
| 500    | Unexpected server error                        |
