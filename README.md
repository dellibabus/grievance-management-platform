# Grievance Management Platform

A production-ready **Political Intelligence & Grievance Management Platform** built for Andhra Pradesh, enabling citizens to file, track, and resolve grievances through a transparent digital workflow.

## Tech Stack

| Layer | Technologies |
|---|---|
| **Frontend** | React 18, Vite, Tailwind CSS, TanStack Query v5, Axios, React Hook Form, Zod, React Router v6, Recharts, Socket.io-client |
| **Backend** | Node.js, Express.js, TypeScript, TypeORM, PostgreSQL, JWT + Refresh Tokens, Socket.io, Multer, Bcrypt |

---

## Features

- **JWT Authentication** — Access tokens (15min) + HTTPOnly cookie refresh tokens (7 days)
- **Role-Based Access Control (RBAC)** — 4 roles: Super Admin, State Admin, District Admin, Volunteer
- **Public Complaint Submission** — No login required, file with attachments (image/PDF/video)
- **Complaint Assignment Workflow** — Admins assign to volunteers with real-time notifications
- **Real-Time Notifications** — Socket.io rooms per user and per district
- **Analytics Dashboard** — Recharts: line trend, pie status, bar category, horizontal bar district
- **File Uploads** — Via Multer, served as static assets
- **Public Complaint Tracking** — Track by GRV-YYYY-XXXXX ticket number
- **Audit Logs** — All write operations logged with IP and actor identity

---

## Prerequisites

- Node.js 18+
- PostgreSQL 14+

---

## Setup

### 1. Backend

```bash
cd server
cp .env.example .env
# Edit .env: update DATABASE_URL with your PostgreSQL credentials
npm install
npm run dev
```

On first start, the server **automatically seeds** the database with roles, admin user, districts, categories, and sample complaints.

### 2. Frontend

```bash
cd client
npm install
npm run dev
```

Frontend runs at **http://localhost:5173**  
Backend API runs at **http://localhost:5000**

---


<!-- ## API Endpoints

### Auth
```
POST /api/auth/login         — Login (returns access token)
POST /api/auth/refresh       — Refresh access token (via cookie)
POST /api/auth/logout        — Revoke refresh token
GET  /api/auth/me            — Current user profile
POST /api/auth/register      — Register new user (super_admin only)
```

### Complaints
```
POST   /api/complaints             — Submit complaint (public, with optional auth + file upload)
GET    /api/complaints             — List (filtered by role)
GET    /api/complaints/:id         — Complaint detail + timeline + attachments
PUT    /api/complaints/:id         — Update status/priority
DELETE /api/complaints/:id         — Delete (super_admin only)
POST   /api/complaints/:id/assign  — Assign to volunteer
POST   /api/complaints/:id/update  — Add comment/status update
GET    /api/complaints/track/:ticket — Public tracking by ticket number
```

### Dashboard
```
GET /api/dashboard/stats          — Summary counts
GET /api/dashboard/by-district    — Complaints per district
GET /api/dashboard/by-category    — Complaints per category
GET /api/dashboard/by-status      — Complaints per status
GET /api/dashboard/trend          — 6-month monthly trend
```

### Users
```
GET    /api/users       — List users (admin only)
POST   /api/users       — Create user (admin only)
PUT    /api/users/:id   — Update user
DELETE /api/users/:id   — Delete (super_admin only)
```

### Notifications
```
GET /api/notifications          — List notifications
PUT /api/notifications/:id/read — Mark as read
PUT /api/notifications/read-all — Mark all as read
```

### Locations (Public)
```
GET /api/locations/districts
GET /api/locations/districts/:id/mandals
GET /api/locations/mandals/:id/villages
GET /api/locations/categories
GET /api/locations/roles
```

--- -->

## RBAC Summary

| Action | Super Admin | State Admin | District Admin | Volunteer |
|---|---|---|---|---|
| Create complaint | ✅ | ✅ | ✅ | ✅ |
| Assign complaint | ✅ | ✅ | ✅ (own district) | ❌ |
| View all complaints | ✅ | ✅ | Own district | Own assigned |
| Manage users | ✅ | State level | District level | ❌ |
| View Dashboard | ✅ | ✅ | ✅ | ❌ |
| Delete complaint | ✅ | ❌ | ❌ | ❌ |
| Export reports | ✅ | ✅ | ✅ | ❌ |

---

