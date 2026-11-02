# Verox

Verox is a document approval and workflow management system. Employees upload documents and submit them for review, and reviewers approve, reject or request changes at each stage of a configurable workflow. Every submission, decision and comment is kept in a history, so nobody has to chase approvals by hand.

Built as an internship project.

- Live app: https://verox-phi.vercel.app
- API: https://verox-q1lc.onrender.com (the free plan sleeps after 15 minutes without traffic, so the first request can take about a minute)

## Features

- Sign up and log in with role-based access (employee, reviewer, admin)
- Create and edit documents with title, category, description and file attachments
- Search documents and filter by status and category
- Approval workflows with any number of stages (up to 10), each with a named reviewer
- Submit for review, then approve, reject or request changes with a comment
- After changes are requested, the owner edits and resubmits. A new approval attempt starts at stage 1 and earlier attempts stay in the history
- Document page showing the current stage, who it is waiting on, every attempt and a full history timeline
- Dashboard with status counts, the reviewer's pending queue and pending decisions per reviewer for admins
- Download a CSV report of the documents you can see, with the same filters as the list
- Responsive layout with a sidebar that collapses on small screens

## Roles

| Role | What they can do |
|---|---|
| Employee | Create and edit own documents while they are drafts or have changes requested, upload files, submit and resubmit, see own documents |
| Reviewer | Everything an employee can do, plus approve, reject or request changes on stages assigned to them, and see documents assigned to them |
| Admin | See all documents, create and deactivate workflows, and decide on stages assigned to them |

Only the reviewer assigned to the current stage of a document can decide on it, including admins. The owner of a document cannot be a reviewer on it.

## Tech stack

- Frontend: React, Vite, Tailwind CSS, React Router
- Backend: Node.js, Express (CommonJS)
- Database: PostgreSQL (node-postgres)
- Auth: JSON Web Tokens, bcryptjs
- Uploads: multer, files stored in PostgreSQL

## Project structure

```
verox/
  client/                 React app
    src/
      api.js              all calls to the backend
      AuthProvider.jsx    logged-in user and login/logout
      components/         layout, status badge, decision panel, attachments, ...
      pages/              one file per page
  server/
    server.js             app setup, routes, error handler
    migrations/           numbered SQL files
    src/
      config/             database connection
      middleware/         login and role checks, file upload settings
      routes/             URL to controller mapping
      controllers/        request validation and responses
      services/           business rules and SQL
      scripts/            migrate.js and seed.js
      utils/
```

## Run it locally

You need Node.js and PostgreSQL.

1. Create an empty database, for example `verox_db`.
2. Set up the server:

   ```
   cd server
   npm install
   ```

   Copy `.env.example` to `.env` and fill in the values (see below).

3. Create the tables and the demo data:

   ```
   npm run migrate
   npm run seed
   npm start
   ```

   The API runs on http://localhost:5000.

4. Set up the client in a second terminal:

   ```
   cd client
   npm install
   ```

   Copy `.env.example` to `.env`, then:

   ```
   npm run dev
   ```

   The app runs on http://localhost:5173.

`npm run migrate` applies any SQL file in `server/migrations` that has not been applied yet, and records it in a `schema_migrations` table. It is safe to run again.

## Environment variables

Server (`server/.env`):

| Name | Purpose |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET` | Long random string used to sign login tokens |
| `CLIENT_URL` | Address of the frontend, used for CORS (no trailing slash) |
| `PORT` | Optional, defaults to 5000 |
| `SEED_PASSWORD` | Optional, password given to the demo users by `npm run seed` |

Client (`client/.env`):

| Name | Purpose |
|---|---|
| `VITE_API_URL` | Address of the API including `/api`, for example `http://localhost:5000/api` |

Values starting with `VITE_` are visible in the browser, so no secrets go there.

## Demo accounts

`npm run seed` creates these users, all with the password from `SEED_PASSWORD` (`Verox@123` if it is not set). The deployed app uses a different password that is shared separately.

| Email | Role |
|---|---|
| test.employee@verox.local | Employee |
| employee2@verox.local | Employee |
| reviewer1@verox.local | Reviewer |
| reviewer2@verox.local | Reviewer |
| admin@verox.local | Admin |

More reviewers can be added in `server/src/scripts/seed.js`. The seed also creates a two-stage workflow called "Standard Document Approval". People who register themselves always become employees.

## How approval works

Document statuses: Draft, Pending review, Changes requested, Approved, Rejected.

1. The owner picks a workflow and submits. In one database transaction, the system saves a snapshot of the document (a revision), starts an approval attempt, copies the workflow stages into it with stage 1 pending, and writes a history entry.
2. The reviewer of the pending stage decides:
   - Approve: the next stage becomes pending, or the document is approved if it was the last stage.
   - Reject: the document is rejected and the remaining stages are skipped.
   - Request changes: the document goes back to the owner and the remaining stages are skipped.
3. Resubmitting after changes creates a new attempt that starts again at stage 1. Old attempts, decisions, comments and files are never changed or deleted.

Files attached before a submission become part of that revision and can no longer be removed.

## Deployment

- Database: Neon (PostgreSQL). Run `npm run migrate` and `npm run seed` once against it, using its connection string as `DATABASE_URL`.
- Backend: Render web service. Root directory `server`, build command `npm install`, start command `npm start`. Environment variables: `DATABASE_URL`, `JWT_SECRET`, `CLIENT_URL`.
- Frontend: Vercel. Root directory `client`, with `VITE_API_URL` pointing at the Render service. `client/vercel.json` rewrites every path to `index.html` so page refreshes work.

## API

See [docs/API.md](docs/API.md) for the list of endpoints.

## Security notes

- Passwords are stored as bcrypt hashes.
- Every request except register and login needs a valid token. Permissions are checked in the backend on every request, not only hidden in the interface.
- The owner of a document always comes from the token, never from the request body.
- Documents a user may not see return 404, so their existence is not revealed.
- All SQL uses parameters. CSV cells that start with `=`, `+`, `-` or `@` are escaped so spreadsheets do not run them as formulas.
- Uploads are limited to 5 MB and to PDF, Word, Excel, PNG, JPG and TXT. Downloads are sent as attachments.

## Known limitations

- No pagination on lists or the CSV report
- No password reset and no login rate limiting
- Workflows cannot be edited after they are created. Create a new one and deactivate the old one
- Reviewers and admins are created by the seed script, not from the interface
- The login token is kept in the browser's local storage
- Upload types are checked by the type the browser reports, not by inspecting the file
- No automated tests
