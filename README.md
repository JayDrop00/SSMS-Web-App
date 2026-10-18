# SSMS Web

A browser-based SQL Server management studio inspired by SSMS. Write and execute SQL queries against Microsoft SQL Server from your browser, browse database objects, edit result sets inline, view execution plans, and more.

## Features

- **Authentication** — Windows Authentication (integrated, trusted connection) or SQL Authentication; choose in the Connect dialog with a password visibility toggle
- **Object Explorer** — browse databases, tables (columns, indexes), views, stored procedures, and functions
- **Right-click scripts (SSMS-style)** — generated scripts open in a new tab without executing:
  - **Tables** — Select Top 1000 Rows, Edit Top 200 Rows, Script as INSERT (column-name placeholders), Script as UPDATE / DELETE (PK-based WHERE), Script as SELECT
  - **Views / procedures / functions** — Script as CREATE (real definitions from `sys.sql_modules`), Script as SELECT (views)
  - Copy Name; New Query on a database; New Database on the server node
- **Multi-tab SQL editor** — CodeMirror 6 with SQL syntax highlighting; execute with F5 / Ctrl+Enter or the toolbar button
- **Execute / Stop** — run queries and cancel long-running ones
- **Smart tab behavior** — SELECT results open the Results tab; INSERT/UPDATE/DELETE-only batches land on Messages; the toolbar database indicator follows the executed query (handles `USE`, 3-part, and 4-part names)
- **Editable results grid** — inline cell editing, row deletion, copy cell/row, export to CSV/JSON (for single-table result sets with a primary key)
- **Messages pane** — errors, rows affected, and query duration
- **Execution plan viewer** — parsed Showplan XML for analyzed queries
- **Query history** — in-memory history of the last 100 executions
- **New Database** — toolbar button beside New Query, or right-click the server node
- **Dark / light themes** — persisted in localStorage

## Tech Stack

| Layer    | Technology                                                     |
| -------- | -------------------------------------------------------------- |
| Frontend | Vue 3, Pinia, Vite, CodeMirror 6                               |
| Backend  | Node.js, Express, [mssql](https://www.npmjs.com/package/mssql) |
| Database | Microsoft SQL Server (Windows or SQL authentication)           |

## Getting Started

### Prerequisites

- Node.js 18 or newer
- A reachable SQL Server instance (default port 1433) with either:
  - **Windows Authentication** — integrated trusted connection (Windows only; uses the ODBC Driver via `msnodesqlv8`), or
  - **SQL Authentication** — a SQL login with username and password

### Setup

1. Install dependencies for backend and frontend:

   ```bash
   cd backend && npm install
   cd ../frontend && npm install
   ```

2. Configure the backend connection:

   ```bash
   cp backend/.env.example backend/.env
   ```

   Edit `backend/.env` with your SQL Server details (see [Configuration](#configuration)). For Windows Authentication, leave `DB_USER` and `DB_PASSWORD` blank.

3. Run the backend (port 3001):

   ```bash
   cd backend
   npm run dev
   ```

4. Run the frontend (port 5173) in a separate terminal:

   ```bash
   cd frontend
   npm run dev
   ```

5. Open http://localhost:5173 in your browser. Auto-connect uses your `.env` credentials (SQL Authentication, or Windows integrated authentication when credentials are blank). If it fails, use the Connect dialog — it supports both authentication modes.

### Production Build

```bash
cd frontend
npm run build   # outputs static files to frontend/dist
```

> Note: the backend does not serve the built frontend; host `dist/` with any static file server and point it at the backend API.

## Configuration

All settings live in `backend/.env`:

| Variable           | Default     | Description                                                     |
| ------------------ | ----------- | --------------------------------------------------------------- |
| `DB_SERVER`        | `localhost` | SQL Server host                                                 |
| `DB_PORT`          | `1433`      | SQL Server port                                                 |
| `DB_USER`          | —           | Login username (optional — leave blank for Windows integrated auth) |
| `DB_PASSWORD`      | —           | Login password (optional — leave blank for Windows integrated auth) |
| `DB_NAME`          | `master`    | Initial database                                                |
| `QUERY_TIMEOUT_MS` | `60000`     | Query execution timeout in milliseconds                         |
| `PORT`             | `3001`      | Backend HTTP port                                               |
