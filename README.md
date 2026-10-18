# SSMS Web

A browser-based SQL Server management studio inspired by SSMS. Write and execute SQL queries against Microsoft SQL Server from your browser, browse database objects, edit result sets inline, view execution plans, and more.

## Features

- **Object Explorer** — browse databases, tables (columns, indexes), views, stored procedures, and functions
- **Multi-tab SQL editor** — CodeMirror 6 with SQL syntax highlighting; execute with F5 / Ctrl+Enter or the toolbar button
- **Execute / Stop** — run queries and cancel long-running ones
- **Editable results grid** — inline cell editing, row deletion, copy cell/row, export to CSV/JSON (for single-table result sets with a primary key)
- **Messages pane** — errors, rows affected, and query duration
- **Execution plan viewer** — parsed Showplan XML for analyzed queries
- **Query history** — in-memory history of the last 100 executions
- **Dark / light themes** — persisted in localStorage
- **Database context indicator** — toolbar display of the active tab's database

## Tech Stack

| Layer    | Technology                                              |
| -------- | ------------------------------------------------------- |
| Frontend | Vue 3, Pinia, Vite, CodeMirror 6                        |
| Backend  | Node.js, Express, [mssql](https://www.npmjs.com/package/mssql) |
| Database | Microsoft SQL Server (SQL authentication)               |

## Getting Started

### Prerequisites

- Node.js 18 or newer
- A reachable SQL Server instance (default port 1433) with SQL auth credentials

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

   Edit `backend/.env` with your SQL Server details (see [Configuration](#configuration)).

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

5. Open http://localhost:5173 in your browser. If auto-connect fails, use the Connect dialog to enter your server and credentials.

### Production Build

```bash
cd frontend
npm run build   # outputs static files to frontend/dist
```

> Note: the backend does not serve the built frontend; host `dist/` with any static file server and point it at the backend API.

## Configuration

All settings live in `backend/.env`:

| Variable           | Default    | Description                              |
| ------------------ | ---------- | ---------------------------------------- |
| `DB_SERVER`        | `localhost`| SQL Server host                          |
| `DB_PORT`          | `1433`     | SQL Server port                          |
| `DB_USER`          | —          | Login username                           |
| `DB_PASSWORD`      | —          | Login password                           |
| `DB_NAME`          | `master`   | Initial database                         |
| `QUERY_TIMEOUT_MS` | `60000`    | Query execution timeout in milliseconds  |
| `PORT`             | `3001`     | Backend HTTP port                        |
