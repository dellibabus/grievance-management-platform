# API Documentation

Base URL: `http://localhost:5000/api` (configurable via `VITE_API_URL` on the client and `PORT`/`CLIENT_URL` on the server).

All authenticated endpoints require an `Authorization: Bearer <accessToken>` header (access token returned from login, also set as an httpOnly cookie). Responses follow the shape `{ "success": boolean, ... }`.

## Table of Contents
- [Auth](#auth)
- [Complaints](#complaints)
- [Users](#users)
- [Roles & Permissions](#roles--permissions)
- [Audit Logs](#audit-logs)
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

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/track/:ticket` | Public | Track a complaint by ticket number (citizen-facing, sanitized response) |
| POST | `/` | Optional (multipart/form-data, up to 5 `attachments` files) | Create a new complaint — works for anonymous citizens and logged-in staff |
| GET | `/` | Authenticated | List complaints (filterable). Scoped by role — see [Visibility](#visibility-rules) |
| GET | `/:id` | Authenticated | Get a single complaint with category, district, mandal, village, assignee, creator, attachments and timeline updates |
| PUT | `/:id` | Authenticated | Update `status` and/or `priority` (appends a `complaint_updates` timeline entry) |
| DELETE | `/:id` | `delete_complaint` permission | Delete a complaint |
| POST | `/:id/assign` | `assign_complaint` permission | Assign/reassign complaint to a volunteer or district admin, creates an `assignments` record |
| POST | `/:id/update` | Authenticated | Add a timeline comment, optionally changing `status` |

### Query parameters for `GET /api/complaints`
| Param | Type | Notes |
|---|---|---|
| `status` | string | `pending\|assigned\|in_progress\|resolved\|closed\|rejected` |
| `priority` | string | `low\|medium\|high\|critical` |
| `category_id` | uuid | Filter by category |
| `district_id` | uuid | Filter by district (super_admin/state_admin only — others are forced to their own district/assignment) |
| `search` | string | Matches ticket number, title, citizen name |

### POST `/api/complaints` (multipart/form-data)
**Fields:** `title`, `description`, `citizen_name`, `citizen_phone`, `citizen_email` (optional), `category_id`, `district_id`, `mandal_id`, `village_id` (optional), `priority`, `attachments` (files, max 5).

**Response:**
```json
{ "success": true, "ticket_number": "GRV-2026-00042", "id": "uuid", "message": "Grievance submitted successfully" }
```
Side effects: creates the initial `complaint_updates` entry, emits a Socket.io event to the district room, and creates in-app notifications for that district's admins.

### PUT `/api/complaints/:id`
**Body:**
```json
{ "status": "in_progress", "priority": "high" }
```
- Either field is optional, but at least one must change.
- Setting `status` to `"resolved"` stamps `resolved_at`; any other status clears it.
- `district_admin` is restricted to complaints in their own district. `volunteer` is restricted to complaints assigned to them and **cannot** change `priority`.

### POST `/api/complaints/:id/assign`
**Body:**
```json
{ "assigned_to_id": "uuid-of-volunteer-or-district-admin", "notes": "Optional note" }
```
- Assignee must have role `volunteer` or `district_admin` and belong to the same district as the complaint.
- Sets complaint status to `assigned` if it was `pending`, logs an `assignments` record, and notifies the assignee.

### POST `/api/complaints/:id/update`
**Body:**
```json
{ "comment": "Site visit completed, awaiting parts.", "status": "in_progress" }
```
- `comment` is required; `status` is optional.
- Volunteers may only transition `status` to `in_progress`, `resolved`, `closed`, or `rejected`.

### Visibility Rules
| Role | Complaints visible |
|---|---|
| `super_admin` / `state_admin` | All |
| `district_admin` | Only complaints where `complaint.district_id === user.districtId` |
| `volunteer` | Only complaints where `complaint.assigned_to === user.id` |

---

## Users
Base path: `/api/users`
All routes require `authenticate` + `manage_users` permission.

| Method | Path | Description |
|---|---|---|
| GET | `/` | List all users (with role and district relations) |
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

### PUT `/api/users/:id`
**Body:** any subset of `{ name, phone, roleName, districtId, password, is_active }`.

> The User Management page (frontend) additionally supports client-side search (name/email/phone), role filter, status filter (Active/Suspended), and Excel/PDF export of the filtered list.

---

## Roles & Permissions
Base path: `/api/roles`
All routes require `authenticate`. Mutations (`POST`/`PUT`/`DELETE`) are restricted to `super_admin` in the controller.

| Method | Path | Description |
|---|---|---|
| GET | `/permissions` | List the master permission catalog (`{ name, description }[]`) |
| POST | `/permissions` | Create a new permission definition — `super_admin` only |
| GET | `/` | List all roles with their assigned permissions and user counts |
| POST | `/` | Create a new role |
| PUT | `/:id` | Update a role's permission list (and/or rename it) |
| DELETE | `/:id` | Delete a custom role (blocked for built-in roles or roles still assigned to users) |

### POST `/api/roles`
**Body:**
```json
{ "name": "Field Inspector", "permissions": ["view_complaints", "edit_complaint"] }
```
- `name` is normalized: trimmed, lowercased, spaces replaced with `_` (e.g. `"Field Inspector"` → `"field_inspector"`).
- Returns `400` if a role with that normalized name already exists.

### PUT `/api/roles/:id`
**Body:**
```json
{ "permissions": ["view_complaints", "view_dashboard"] }
```

### DELETE `/api/roles/:id`
- Blocked (`400`) for the 4 built-in roles: `super_admin`, `state_admin`, `district_admin`, `volunteer`.
- Blocked (`400`) if any user currently has this role assigned (checked via `users.role_id` count).

### POST `/api/roles/permissions`
**Body:**
```json
{ "name": "export_reports", "description": "Allow exporting dashboard reports to PDF/Excel" }
```

> Every create/update/delete here writes a `CREATE_ROLE` / `UPDATE_ROLE` / `DELETE_ROLE` / `CREATE_PERMISSION` entry to `audit_logs`. This is what powers the new **Roles & Permissions** admin page — roles and permissions are now fully dynamic and no longer rely solely on seeder data.

---

## Audit Logs
Base path: `/api/audit-logs`
All routes require `authenticate`. Access is restricted to `super_admin` / `state_admin` in the controller.

| Method | Path | Description |
|---|---|---|
| GET | `/` | Paginated, filterable list of audit log entries (most recent first) |
| GET | `/meta` | Distinct `action` and `entity` values, used to populate filter dropdowns |

### Query parameters for `GET /api/audit-logs`
| Param | Type | Notes |
|---|---|---|
| `page` | number | Default `1` |
| `limit` | number | Default `20` |
| `search` | string | Matches user name, email, or record ID |
| `action` | string | e.g. `LOGIN`, `CREATE_COMPLAINT`, `UPDATE_ROLE` |
| `entity` | string | e.g. `users`, `complaints`, `roles`, `permissions` |

**Response:**
```json
{
  "success": true,
  "logs": [
    {
      "id": "uuid",
      "user": { "id": "uuid", "name": "...", "email": "..." },
      "action": "LOGIN",
      "entity": "users",
      "entity_id": "uuid",
      "meta": { "email": "admin@grievance.com" },
      "ip_address": "127.0.0.1",
      "created_at": "2026-06-15T08:00:00.000Z"
    }
  ],
  "total": 120,
  "totalPages": 6
}
```

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
