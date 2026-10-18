require('dotenv').config();

const express = require('express');
const cors = require('cors');
const { autoConnect } = require('./db/pool');

const connectRoutes = require('./routes/connect');
const schemaRoutes = require('./routes/schema');
const queryRoutes = require('./routes/query');
const rowsRoutes = require('./routes/rows');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.use('/api', connectRoutes);
app.use('/api', schemaRoutes);
app.use('/api/query', queryRoutes);
app.use('/api/rows', rowsRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

async function start() {
  console.log('Starting SSMS Web Backend...');

  try {
    await autoConnect();
    console.log('Auto-connected to SQL Server via .env configuration');
  } catch (err) {
    console.warn('Auto-connect failed:', err.message);
    console.warn('The app will start but requires manual connection via the UI.');
  }

  app.listen(PORT, () => {
    console.log(`Backend running on http://localhost:${PORT}`);
  });
}

start();
