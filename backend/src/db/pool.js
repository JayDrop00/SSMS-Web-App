const sql = require('mssql');

let pool = null;
let connectionInfo = { server: null, database: null };

function buildConfig(server, port, user, password, database) {
  return {
    server,
    port: parseInt(port || '1433'),
    user,
    password,
    database: database || 'master',
    requestTimeout: parseInt(process.env.QUERY_TIMEOUT_MS || '60000', 10),
    options: {
      trustServerCertificate: true,
      encrypt: false
    },
    pool: {
      max: 10,
      min: 0,
      idleTimeoutMillis: 30000
    }
  };
}

async function autoConnect() {
  const server = process.env.DB_SERVER;
  const port = process.env.DB_PORT;
  const user = process.env.DB_USER;
  const password = process.env.DB_PASSWORD;
  const database = process.env.DB_NAME;

  if (!server || !user || !password) {
    throw new Error('Missing required .env values: DB_SERVER, DB_USER, DB_PASSWORD');
  }

  const config = buildConfig(server, port, user, password, database);
  pool = await sql.connect(config);
  connectionInfo = { server, database: database || 'master' };
  return pool;
}

async function manualConnect(server, port, user, password, database) {
  if (pool) {
    await pool.close();
    pool = null;
  }

  const config = buildConfig(server, port, user, password, database);
  pool = await sql.connect(config);
  connectionInfo = { server, database: database || 'master' };
  return pool;
}

function getPool() {
  if (!pool) {
    throw new Error('No active database connection');
  }
  return pool;
}

function isConnected() {
  return pool !== null && pool.connected;
}

function getConnectionInfo() {
  return { ...connectionInfo, connected: isConnected() };
}

async function disconnect() {
  if (pool) {
    await pool.close();
    pool = null;
    connectionInfo = { server: null, database: null };
  }
}

module.exports = {
  sql,
  autoConnect,
  manualConnect,
  getPool,
  isConnected,
  getConnectionInfo,
  disconnect
};
