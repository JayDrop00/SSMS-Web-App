const os = require('os');
const sql = require('mssql');

let pool = null;
let connectionInfo = { server: null, database: null, authType: null };

const ODBC_DRIVERS = [
  'ODBC Driver 18 for SQL Server',
  'ODBC Driver 17 for SQL Server',
  'SQL Server Native Client 11.0',
  'SQL Server'
];

function getCurrentWindowsUser() {
  if (process.platform !== 'win32') return null;
  try {
    const { username } = os.userInfo();
    const domain = process.env.USERDOMAIN || os.hostname();
    return `${domain}\\${username}`;
  } catch {
    return null;
  }
}

function isOdbcDriverMissingError(err) {
  const msg = err.message || '';
  return (
    msg.includes('IM002') ||
    msg.includes('Data source name not found') ||
    msg.includes("Can't open lib") ||
    msg.includes('Driver not found')
  );
}

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

function buildWindowsConfig(server, port, database, driver) {
  const portNum = parseInt(port || '1433', 10);
  const db = database || 'master';
  return {
    server,
    port: portNum,
    database: db,
    requestTimeout: parseInt(process.env.QUERY_TIMEOUT_MS || '60000', 10),
    connectionString:
      `Driver={${driver}};Server={${server},${portNum}};Database={${db}};` +
      'Trusted_Connection=Yes;Encrypt=No;TrustServerCertificate=Yes;',
    options: {
      trustServerCertificate: true,
      encrypt: false,
      trustedConnection: true
    },
    pool: {
      max: 10,
      min: 0,
      idleTimeoutMillis: 30000
    }
  };
}

async function connectWindows(server, port, database) {
  let sqlWin;
  try {
    sqlWin = require('mssql/msnodesqlv8');
  } catch (err) {
    throw new Error(
      'Windows Authentication requires the msnodesqlv8 driver, which failed to load: ' + err.message
    );
  }

  let lastError = null;
  for (const driver of ODBC_DRIVERS) {
    try {
      const config = buildWindowsConfig(server, port, database, driver);
      return await new sqlWin.ConnectionPool(config).connect();
    } catch (err) {
      lastError = err;
      if (!isOdbcDriverMissingError(err)) throw err;
    }
  }

  throw new Error(
    'No suitable ODBC driver found. Install Microsoft ODBC Driver 17/18 for SQL Server (or SQL Server Native Client 11.0). ' +
      `Last error: ${lastError.message}`
  );
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
  connectionInfo = { server, database: database || 'master', authType: 'sql' };
  return pool;
}

async function manualConnect(server, port, user, password, database, authType = 'sql') {
  if (pool) {
    await pool.close();
    pool = null;
  }

  if (authType === 'windows') {
    pool = await connectWindows(server, port, database);
  } else {
    const config = buildConfig(server, port, user, password, database);
    pool = await sql.connect(config);
  }

  connectionInfo = { server, database: database || 'master', authType };
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
    connectionInfo = { server: null, database: null, authType: null };
  }
}

module.exports = {
  sql,
  autoConnect,
  manualConnect,
  getPool,
  isConnected,
  getConnectionInfo,
  disconnect,
  getCurrentWindowsUser
};
