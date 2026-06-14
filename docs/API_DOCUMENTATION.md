# API Documentation

Base URL: `http://localhost:5000/api` (configurable via `VITE_API_URL` on the client and `PORT`/`CLIENT_URL` on the server).

All authenticated endpoints require an `Authorization: Bearer <accessToken>` header (access token returned from login, also set as an httpOnly cookie). Responses follow the shape `{ "success": boolean, ... }`.

## Table of Contents
- [Auth](#auth)
- [Complaints](#complaints)
- [Users](#users)
- [Dashboard](#dashboard)
- [Locations](#locations)
- [Notifications](#notifications)

---

## Auth
Base path: `/api/auth`

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/register` | Public | Register a new user (citizen-facing self-registration, if enabled) |
| POST | `/login` | Public | Authenticate with email/password, returns access + refresh tokens |
| POST | `/refresh` | Public (refresh cookie/body) | Exchange a valid refresh token for a new access token |
| POST | `/logout` | Authenticated | Revoke the current refresh token |
| GET | `/me` | Authenticated | Return the current user's profile |

### POST `/api/auth/login`
**Body:**
```json
{ "email": "admin@grievance.com", "password": "Admin@123" }
```
**Response:**
```json
{
  "success": true,
  "accessToken": "<jwt>",
  "user": {
    "id": "uuid",
    "name": "...",
    "email": "...",
    "role": "super_admin",
    "permissions": ["..."],
    "districtId": null
  }
}
```
The refresh token is set as an httpOnly cookie.

### POST `/api/auth/refresh`
Reads the refresh token cookie, validates it against `refresh_tokens`, and issues a new access token.

### GET `/api/auth/me`
Returns the authenticated user's sanitized profile (no password hash).

---

## Complaints
Base path: `/api/complaints`
All routes require `authenticate`. Permission requirements noted per-route.

| Method | Path | Permission | Description |
|---|---|---|---|
| GET | `/` | `view_complaints` | List complaints (paginated, filterable). Scoped by role — see [Visibility](#visibility-rules) |
| GET | `/:id` | `view_complaints` | Get a single complaint with relations (category, district, mandal, village, assignee, creator, updates, attachments) |
| POST | `/` | `create_complaint` | Create a new complaint (multipart/form-data, supports up to 5 attachments) |
| PUT | `/:id` | `edit_complaint` | Update complaint fields |
| PATCH | `/:id/status` | `update_status` | Update status and append a `complaint_updates` entry |
| PATCH | `/:id/assign` | `assign_complaint` | Assign/reassign complaint to a volunteer, creates an `assignments` record |
| DELETE | `/:id` | `delete_complaint` | Delete a complaint |

### Query parameters for `GET /api/complaints`
| Param | Type | Notes |
|---|---|---|
| `page` | number | Default `1` |
| `limit` | number | Default `10` |
| `status` | string | `pending\|assigned\|in_progress\|resolved\|closed\|rejected` |
| `priority` | string | `low\|medium\|high\|critical` |
| `category_id` | uuid | Filter by category |
| `district_id` | uuid | Filter by district (super_admin/state_admin only — others are forced to their own district/assignment) |
| `search` | string | Matches ticket number, title, citizen name/phone |

### POST `/api/complaints` (multipart/form-data)
**Fields:** `title`, `description`, `citizen_name`, `citizen_phone`, `citizen_email` (optional), `category_id`, `district_id`, `mandal_id`, `village_id` (optional), `priority`, `attachments` (files, max 5).

**Response:**
```json
{ "success": true, "ticket_number": "GRV-2026-00042", "complaint": { ... } }
```

### PATCH `/api/complaints/:id/status`
**Body:**
```json
{ "status": "in_progress", "comment": "Field team dispatched" }
```
Volunteers may only set `in_progress` or `resolved`.

### PATCH `/api/complaints/:id/assign`
**Body:**
```json
{ "assigned_to": "uuid-of-volunteer", "notes": "Optional note" }
```

### Visibility Rules
| Role | Complaints visible |
|---|---|
| `super_admin` / `state_admin` | All |
| `district_admin` | Only complaints where `complaint.district_id === user.districtId` |
| `volunteer` | Only complaints where `complaint.assigned_to === user.id` |

---

## Users
Base path: `/api/users`
All routes require `authenticate` + `manage_users` permission (super_admin / district_admin).

| Method | Path | Description |
|---|---|---|
| GET | `/` | List users (district_admin sees only users in their own district) |
| POST | `/` | Create a new user |
| PUT | `/:id` | Update a user (name, phone, role, district, active status, optional password reset) |
| DELETE | `/:id` | Delete a user (cannot delete self) |

### POST `/api/users`
**Body:**
```json
{
  "name": "Field Volunteer",
  "email": "volunteer@example.com",
  "password": "SecurePass@123",
  "phone": "9876543210",
  "roleName": "volunteer",
  "districtId": "uuid-or-null"
}
```
- `district_admin` callers are restricted to creating users within their own district and cannot create `super_admin`/`state_admin` accounts.

### PUT `/api/users/:id`
**Body:** any subset of `{ name, phone, roleName, districtId, password, is_active }`.

---

## Dashboard
Base path: `/api/dashboard`
All routes require `authenticate` + `view_dashboard` permission. For `district_admin`, all stats are scoped to `complaint.district_id === user.districtId`.

| Method | Path | Description |
|---|---|---|
| GET | `/stats` | Summary counts: total, pending, in_progress, resolved, overdue, etc. |
| GET | `/by-district` | Complaint counts grouped by district (super_admin/state_admin only — district_admin gets their own district only) |
| GET | `/by-category` | Complaint counts grouped by category |
| GET | `/by-status` | Complaint counts grouped by status |
| GET | `/trend` | Time-series of complaint creation/resolution counts (default last 30 days) |

---

## Locations
Base path: `/api/locations`
All routes are **public** (no `authenticate` middleware) — used to populate dropdowns on the public complaint form and login-adjacent pages.

| Method | Path | Description |
|---|---|---|
| GET | `/districts` | List all districts |
| GET | `/districts/:districtId/mandals` | List mandals for a district |
| GET | `/mandals/:mandalId/villages` | List villages for a mandal |
| GET | `/categories` | List active complaint categories |
| GET | `/roles` | List all roles (used for the role dropdown in User Management) |

---

## Notifications
Base path: `/api/notifications`
All routes require `authenticate`.

| Method | Path | Description |
|---|---|---|
| GET | `/` | List the current user's most recent 50 notifications |
| PATCH | `/:id/read` | Mark a single notification as read |
| PATCH | `/read-all` | Mark all of the current user's notifications as read |

---

## Error Responses
All errors follow:
```json
{ "success": false, "message": "Description of the error" }
```
In `NODE_ENV=development`, a `stack` field is also included.

| Status | Meaning |
|---|---|
| 400 | Validation error / bad request |
| 401 | Missing or invalid access token |
| 403 | Authenticated but lacks required permission/role |
| 404 | Resource or endpoint not found |
| 500 | Unhandled server error |
