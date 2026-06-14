# Environment Setup Guide

## Prerequisites
- **Node.js** v18+ and npm
- **PostgreSQL** v13+ (running locally or accessible remotely)
- Git

## 1. Clone & Install

```bash
git clone <repository-url>
cd grievance-management-platform

# Install server dependencies
cd server
npm install

# Install client dependencies
cd ../client
npm install
```

## 2. Database Setup

Create a PostgreSQL database for the project:

```sql
CREATE DATABASE grievance_db;
```

The server uses TypeORM with `synchronize: true`, so tables are created/updated automatically from the entity definitions on first connection — **no manual migrations are required**.

## 3. Server Environment Variables

Copy the example file and fill in your own values:

```bash
cd server
cp .env.example .env
```

`server/.env`:
```env
PORT=5000
DATABASE_URL=postgresql://<user>:<password>@localhost:5432/grievance_db
JWT_SECRET=<replace-with-a-strong-random-secret>
JWT_REFRESH_SECRET=<replace-with-a-different-strong-random-secret>
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
CLIENT_URL=http://localhost:5173
UPLOAD_DIR=./uploads
NODE_ENV=development
```

| Variable | Description |
|---|---|
| `PORT` | Port the Express server listens on |
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET` | Signing secret for short-lived access tokens |
| `JWT_REFRESH_SECRET` | Signing secret for long-lived refresh tokens (must differ from `JWT_SECRET`) |
| `JWT_EXPIRES_IN` | Access token lifetime (e.g. `15m`) |
| `JWT_REFRESH_EXPIRES_IN` | Refresh token lifetime (e.g. `7d`) |
| `CLIENT_URL` | Origin allowed by CORS and used for Socket.io CORS config |
| `UPLOAD_DIR` | Local directory where complaint attachments are stored (created automatically if missing) |
| `NODE_ENV` | `development` or `production` — controls error stack traces in API responses |

> **Security:** never commit `.env` with real secrets. Generate strong random values for `JWT_SECRET`/`JWT_REFRESH_SECRET`, e.g. `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`.

## 4. Client Environment Variables

```bash
cd client
cp .env.example .env
```

`client/.env`:
```env
VITE_API_URL=http://localhost:5000/api
VITE_SOCKET_URL=http://localhost:5000
```

| Variable | Description |
|---|---|
| `VITE_API_URL` | Base URL the client uses for all REST API calls |
| `VITE_SOCKET_URL` | Base URL used for loading uploaded attachment files (images/PDFs/videos) |

## 5. Seed Initial Data (optional, manual)

The database starts **empty**. To populate it with initial roles, permissions, categories, districts/mandals/villages, sample users, and sample complaints, run the seeder manually:

```bash
cd server
npm run seed
```

This seeds (among other things) the following login accounts:

| Email | Password | Role |
|---|---|---|
| `admin@grievance.com` | `Admin@123` | super_admin |
| `state@grievance.com` | (see seeder) | state_admin |
| `vizag_admin@grievance.com` | (see seeder) | district_admin (Visakhapatnam) |
| `volunteer_vizag@grievance.com` | (see seeder) | volunteer |

> The seeder **no longer runs automatically** on server startup. Run `npm run seed` only when you want to (re)populate sample/reference data — note it may create duplicate records if run against a database that already has data.

## 6. Run the Application

**Start the server** (from `server/`):
```bash
npm run dev
```
Server runs on `http://localhost:5000`. On startup it connects to PostgreSQL and auto-creates/updates tables via TypeORM `synchronize`.

**Start the client** (from `client/`, in a separate terminal):
```bash
npm run dev
```
Client runs on `http://localhost:5173` (Vite dev server).

## 7. Verify

- Health check: `GET http://localhost:5000/api/health` → `{ "success": true, "message": "System operational" }`
- Open `http://localhost:5173` in a browser and log in with a seeded account (if you ran the seeder).

## Production Notes
- Set `NODE_ENV=production` to suppress stack traces in API error responses.
- Consider disabling TypeORM `synchronize` in production and using proper migrations once the schema stabilizes.
- Use a process manager (PM2, systemd, Docker) to run the server, and serve the built client (`npm run build` in `client/`) via a static host or reverse proxy (e.g. Nginx) pointing at the API.
