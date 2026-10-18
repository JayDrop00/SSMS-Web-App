const express = require('express');
const router = express.Router();
const { getConnectionInfo, manualConnect, disconnect } = require('../db/pool');

router.get('/status', (req, res) => {
  const info = getConnectionInfo();
  res.json(info);
});

router.post('/connect', async (req, res) => {
  const { server, port, user, password, database } = req.body;

  if (!server || !user || !password) {
    return res.status(400).json({
      success: false,
      error: 'Server, user, and password are required'
    });
  }

  try {
    await manualConnect(server, port, user, password, database);
    const info = getConnectionInfo();
    res.json({ success: true, ...info });
  } catch (err) {
    let errorMessage = 'Connection failed';

    if (err.message.includes('ECONNREFUSED')) {
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
