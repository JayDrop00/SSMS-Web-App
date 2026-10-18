const express = require('express');
const router = express.Router();
const {
  getConnectionInfo,
  manualConnect,
  disconnect,
  getCurrentWindowsUser
} = require('../db/pool');

router.get('/status', (req, res) => {
  const info = getConnectionInfo();
  res.json({ ...info, currentUser: getCurrentWindowsUser() });
});

router.post('/connect', async (req, res) => {
  const { server, port, user, password, database, authType } = req.body;
  const mode = authType === 'windows' ? 'windows' : 'sql';

  if (!server || (mode === 'sql' && (!user || !password))) {
    return res.status(400).json({
      success: false,
      error:
        mode === 'windows'
          ? 'Server is required'
          : 'Server, user, and password are required'
    });
  }

  try {
    await manualConnect(server, port, user, password, database, mode);
    const info = getConnectionInfo();
    res.json({ success: true, ...info, currentUser: getCurrentWindowsUser() });
  } catch (err) {
    let errorMessage = 'Connection failed';

    if (
      err.message.includes('IM002') ||
      err.message.includes('Data source name not found') ||
      err.message.includes("Can't open lib")
    ) {
      errorMessage =
        'No suitable ODBC driver found on this machine. Install Microsoft ODBC Driver 17/18 for SQL Server (or SQL Server Native Client 11.0).';
    } else if (
      mode === 'windows' &&
      (err.message.includes('SSPI') ||
        err.message.includes('untrusted domain') ||
        err.message.includes('Login failed'))
    ) {
      errorMessage = `Windows Authentication failed for '${getCurrentWindowsUser()}'. Make sure SQL Server has Windows Authentication enabled (Mixed Mode) and trusts this machine/account.`;
    } else if (err.message.includes('ECONNREFUSED')) {
      errorMessage = `Cannot connect to server '${server}' on port ${port || 1433}. Make sure SQL Server is running.`;
    } else if (err.message.includes('Login failed')) {
      errorMessage = `Login failed for user '${user}'. Verify your username and password.`;
    } else if (err.message.includes('ENOTFOUND')) {
      errorMessage = `Server '${server}' not found. Verify the server name or IP address.`;
    } else {
      errorMessage = err.message;
    }

    res.status(500).json({ success: false, error: errorMessage });
  }
});

router.post('/disconnect', async (req, res) => {
  try {
    await disconnect();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
