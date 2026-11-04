# Verox API

Base URL: `https://verox-q1lc.onrender.com/api` (locally `http://localhost:5000/api`)

All requests and responses use JSON, except file uploads, file downloads and the CSV report.

## Conventions

**Authentication.** Log in to get a token, then send it with every request except register and login:

```
Authorization: Bearer <token>
```

Tokens expire after 8 hours.

**Errors.** Every error has the same shape, with a readable message:

```json
{ "message": "Invalid email or password." }
```

| Status | Meaning |
|---|---|
| 400 | The request is invalid (missing field, wrong type, rule not met) |
| 401 | Not logged in, or the token is invalid or expired |
| 403 | Logged in, but the role or assignment does not allow this |
| 404 | Not found, or the user is not allowed to see it |
| 409 | The action is not possible in the current state, or the record already exists |
| 500 | Unexpected server error |

**Statuses.**

- Document: `DRAFT`, `PENDING_REVIEW`, `CHANGES_REQUESTED`, `APPROVED`, `REJECTED`
- Attempt: `IN_PROGRESS`, `CHANGES_REQUESTED`, `APPROVED`, `REJECTED`
- Stage: `WAITING`, `PENDING`, `APPROVED`, `REJECTED`, `CHANGES_REQUESTED`, `SKIPPED`

**Who sees which documents.** Employees see their own. Reviewers see their own plus those where they are assigned to a stage. Admins see all. A document a user may not see returns 404.

## Health

| Method and path | Auth | Description |
|---|---|---|
| `GET /health` | none | Confirms the API is running |
| `GET /health/db` | none | Confirms the database connection |

## Authentication

### `POST /auth/register`

Creates an employee account. The role cannot be chosen.

Request:

```json
{ "fullName": "Asha Rao", "email": "asha@example.com", "password": "at-least-8-chars" }
```

Response `201`:

```json
{ "id": 7, "full_name": "Asha Rao", "email": "asha@example.com", "role": "EMPLOYEE" }
```

Errors: `400` (name required, invalid email, password not 8 to 72 characters), `409` (email already registered).

### `POST /auth/login`

Request:

```json
{ "email": "admin@verox.local", "password": "your-password" }
```

Response `200`:

```json
{
  "token": "eyJhbGciOi...",
  "user": { "id": 3, "full_name": "Admin User", "email": "admin@verox.local", "role": "ADMIN" }
}
```

Errors: `400` (missing fields), `401` (invalid email or password).

### `GET /auth/me`

Returns the logged-in user: `{ "id", "full_name", "email", "role" }`.

## Documents

A document object looks like this:

```json
{
  "id": 12,
  "title": "Vendor Contract Review",
  "category": "Legal",
  "description": "Annual renewal",
  "owner_id": 1,
  "workflow_id": 1,
  "status": "PENDING_REVIEW",
  "current_stage_order": 1,
  "current_attempt_id": 4,
  "created_at": "2026-11-02T09:30:00.000Z",
  "updated_at": "2026-11-02T09:45:00.000Z",
  "owner_name": "Test Employee",
  "current_reviewer_name": "Reviewer One",
  "current_stage_name": "Initial Review"
}
```

`current_reviewer_name` and `current_stage_name` are filled only while the document is under review. `owner_name` and these two fields are included in list and detail responses.

### `POST /documents`

Creates a draft owned by the logged-in user.

Request:

```json
{ "title": "Vendor Contract Review", "category": "Legal", "description": "Annual renewal", "workflowId": 1 }
```

`title` (max 200 characters) and `category` (max 100) are required. `description` and `workflowId` are optional.

Response `201`: the document. Errors: `400`.

### `GET /documents`

Lists the documents the user may see, newest first.

Query parameters, all optional: `status` (one of the document statuses), `category` (exact match), `search` (matches title or description, case-insensitive).

Response `200`: an array of documents. Errors: `400` (invalid status).

### `GET /documents/:id`

Response `200`: the document. Errors: `404`.

### `PATCH /documents/:id`

Updates a document. Only the owner can do this, and only while the status is `DRAFT` or `CHANGES_REQUESTED`.

Request: any of `title`, `category`, `description`, `workflowId`.

Response `200`: the document. Errors: `400`, `404` (not found, not yours, or not editable).

### `POST /documents/:id/submit`

Submits a draft, or resubmits a document with changes requested. Owner only.

Request (optional note for the reviewers):

```json
{ "comment": "Please review by Friday" }
```

In one transaction this saves a revision (a snapshot of the title, category and description), links any unsubmitted attachments to it, starts a new approval attempt, copies the workflow stages into it (stage 1 pending, the others waiting), sets the status to `PENDING_REVIEW` and writes a `SUBMITTED` or `RESUBMITTED` history entry.

Response `200`: `{ "document", "attempts", "history" }` (same shape as `GET /documents/:id/approval`).

Errors:

- `400`: no workflow chosen, the workflow is inactive, a stage has no reviewer, or the owner is a reviewer on the workflow
- `404`: not found or not the owner
- `409`: the document is not a draft and has no changes requested

### `GET /documents/:id/approval`

Returns the document with every attempt, its stages, and the full history.

Response `200`:

```json
{
  "document": { "id": 12, "status": "PENDING_REVIEW" },
  "attempts": [
    {
      "id": 4,
      "attempt_number": 1,
      "status": "IN_PROGRESS",
      "started_at": "2026-11-02T09:45:00.000Z",
      "completed_at": null,
      "started_by_name": "Test Employee",
      "stages": [
        {
          "id": 8,
          "stage_order": 1,
          "stage_name": "Initial Review",
          "reviewer_id": 4,
          "reviewer_name": "Reviewer One",
          "status": "PENDING"
        },
        {
          "id": 9,
          "stage_order": 2,
          "stage_name": "Final Approval",
          "reviewer_id": 3,
          "reviewer_name": "Admin User",
          "status": "WAITING"
        }
      ]
    }
  ],
  "history": [
    {
      "id": 21,
      "action": "SUBMITTED",
      "comment": "Please review by Friday",
      "created_at": "2026-11-02T09:45:00.000Z",
      "actor_name": "Test Employee",
      "attempt_number": 1,
      "stage_order": null
    }
  ]
}
```

Attempts are ordered oldest first. History actions: `CREATED`, `SUBMITTED`, `RESUBMITTED`, `APPROVED`, `REJECTED`, `CHANGES_REQUESTED`. Errors: `404`.

### `POST /documents/:id/decision`

Records a reviewer's decision. Roles: reviewer or admin. Only the reviewer assigned to the stage that is pending right now can decide, including admins.

Request:

```json
{ "action": "CHANGES_REQUESTED", "comment": "Add the contract end date" }
```

`action` is `APPROVED`, `REJECTED` or `CHANGES_REQUESTED`. `comment` (max 1000 characters) is required for the last two and optional for approval.

What happens:

- `APPROVED`: the next stage becomes pending. After the last stage, the attempt and the document become `APPROVED`.
- `REJECTED`: the attempt and the document become `REJECTED`, and waiting stages are marked `SKIPPED`.
- `CHANGES_REQUESTED`: the attempt and the document become `CHANGES_REQUESTED`, waiting stages are marked `SKIPPED`, and the owner can edit and resubmit.

Response `200`: `{ "document", "attempts", "history" }`.

Errors: `400` (invalid action, comment missing or too long), `403` (not the assigned reviewer, or the role is employee), `404`, `409` (the document is not waiting for a review).

### Attachments

Files are stored in the database. Allowed types: PDF, Word (.docx), Excel (.xlsx), PNG, JPG and TXT. Maximum size is 5 MB.

**`POST /documents/:id/attachments`**

Content type `multipart/form-data` with one file in the field named `file`. Owner only, and only while the document is `DRAFT` or `CHANGES_REQUESTED`.

Response `201`:

```json
{
  "id": 5,
  "document_id": 12,
  "original_filename": "contract.pdf",
  "mime_type": "application/pdf",
  "file_size_bytes": 184320,
  "created_at": "2026-11-02T09:40:00.000Z"
}
```

Errors: `400` (no file, type not allowed, too large), `404` (not found, not yours, or not editable).

**`GET /documents/:id/attachments`**

Lists the files of a document. `version_number` is empty until the document is submitted. After that it shows the revision the file belongs to.

```json
[
  {
    "id": 5,
    "original_filename": "contract.pdf",
    "mime_type": "application/pdf",
    "file_size_bytes": 184320,
    "created_at": "2026-11-02T09:40:00.000Z",
    "uploaded_by_name": "Test Employee",
    "version_number": 1
  }
]
```

**`GET /documents/:id/attachments/:attachmentId`**

Downloads the file as an attachment. Anyone who can see the document can download its files. Errors: `404`.

**`DELETE /documents/:id/attachments/:attachmentId`**

Removes a file. Owner only, while the document is editable, and only files that were never submitted. Files that belong to a submitted revision are kept for the history.

Response `200`: `{ "message": "File removed." }`. Errors: `404`.

## Workflows

A workflow object:

```json
{
  "id": 1,
  "name": "Standard Document Approval",
  "category": "Legal",
  "description": "Two-stage workflow: reviewer, then admin",
  "is_active": true,
  "created_at": "2026-10-24T10:00:00.000Z",
  "stages": [
    { "id": 1, "stage_order": 1, "stage_name": "Initial Review", "reviewer_role": "REVIEWER", "reviewer_id": 4, "reviewer_name": "Reviewer One" },
    { "id": 2, "stage_order": 2, "stage_name": "Final Approval", "reviewer_role": "ADMIN", "reviewer_id": 3, "reviewer_name": "Admin User" }
  ]
}
```

Stages cannot be edited after a workflow is created. To change a workflow, create a new one and deactivate the old one.

### `GET /workflows`

Lists workflows. Employees and reviewers see only active workflows. Admins see all.

### `GET /workflows/:id`

Returns one workflow. Errors: `404` (not found, or inactive for non-admins).

### `GET /workflows/reviewers`

Admin only. Lists the users who can be chosen as reviewers (role reviewer or admin): `[{ "id", "full_name", "email", "role" }]`.

### `POST /workflows`

Admin only.

Request:

```json
{
  "name": "Finance Approval",
  "category": "Finance",
  "description": "Department review, then final sign-off",
  "stages": [
    { "stageName": "Department Review", "reviewerId": 4 },
    { "stageName": "Final Approval", "reviewerId": 3 }
  ]
}
```

Stages are numbered in the order given, with 1 to 10 stages. Each reviewer must be a reviewer or admin. The same person can be used on more than one stage.

Response `201`: the workflow. Errors: `400`, `403`.

### `PATCH /workflows/:id`

Admin only. Activates or deactivates a workflow.

```json
{ "isActive": false }
```

Response `200`: the workflow. Errors: `400`, `403`, `404`.

## Reviews

For the reviewer dashboard. Roles: reviewer or admin. All three return data about the logged-in user only.

### `GET /reviews/pending`

Documents waiting for this user's decision right now.

```json
[
  {
    "document_id": 12,
    "title": "Vendor Contract Review",
    "category": "Legal",
    "owner_name": "Test Employee",
    "stage_order": 1,
    "stage_name": "Initial Review",
    "attempt_number": 1,
    "started_at": "2026-11-02T09:45:00.000Z"
  }
]
```

### `GET /reviews/history`

Decisions this user has made, newest first.

```json
[
  {
    "id": 22,
    "document_id": 12,
    "title": "Vendor Contract Review",
    "action": "CHANGES_REQUESTED",
    "comment": "Add the contract end date",
    "created_at": "2026-11-02T10:10:00.000Z",
    "attempt_number": 1,
    "stage_order": 1
  }
]
```

### `GET /reviews/summary`

```json
{ "pending": 2, "approved": 5, "rejected": 1, "changesRequested": 3 }
```

## Reports

### `GET /reports/summary`

Counts of the documents the user may see, by status. Admins also get the number of pending decisions per reviewer.

```json
{
  "documents": {
    "DRAFT": 2,
    "PENDING_REVIEW": 3,
    "CHANGES_REQUESTED": 1,
    "APPROVED": 6,
    "REJECTED": 1,
    "total": 13
  },
  "pendingByReviewer": [
    { "id": 4, "full_name": "Reviewer One", "pending": 2 }
  ]
}
```

`pendingByReviewer` is present only for admins.

### `GET /reports/documents`

Downloads a CSV file (`verox-documents.csv`) of the documents the user may see. It accepts the same `status`, `category` and `search` parameters as `GET /documents`.

Columns: ID, Title, Category, Owner, Status, Current stage, Current reviewer, Created, Last updated.

The file is UTF-8 with a byte order mark so Excel opens it correctly. Cells that start with `=`, `+`, `-` or `@` get a leading `'` so spreadsheets do not run them as formulas.

Errors: `400` (invalid status).

## Example

```
curl -X POST https://verox-q1lc.onrender.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@verox.local","password":"your-password"}'

curl https://verox-q1lc.onrender.com/api/documents?status=PENDING_REVIEW \
  -H "Authorization: Bearer <token>"
```
