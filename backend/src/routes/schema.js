const express = require('express');
const router = express.Router();
const { getPool, sql } = require('../db/pool');

function escapeIdentifier(name) {
  return `[${name.replace(/]/g, ']]')}]`;
}

router.get('/databases', async (req, res) => {
  try {
    const pool = getPool();
    const result = await pool.request().query('SELECT name FROM sys.databases ORDER BY name');
    res.json({ databases: result.recordset.map(r => ({ name: r.name })) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/databases/:db/tables', async (req, res) => {
  try {
    const pool = getPool();
    const db = escapeIdentifier(req.params.db);
    const result = await pool.request().query(`
      SELECT s.name AS [schema], t.name AS [name]
      FROM ${db}.sys.tables t
      JOIN ${db}.sys.schemas s ON t.schema_id = s.schema_id
      ORDER BY s.name, t.name
    `);
    res.json({ tables: result.recordset });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/databases/:db/views', async (req, res) => {
  try {
    const pool = getPool();
    const db = escapeIdentifier(req.params.db);
    const result = await pool.request().query(`
      SELECT s.name AS [schema], v.name AS [name]
      FROM ${db}.sys.views v
      JOIN ${db}.sys.schemas s ON v.schema_id = s.schema_id
      ORDER BY s.name, v.name
    `);
    res.json({ views: result.recordset });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/databases/:db/procedures', async (req, res) => {
  try {
    const pool = getPool();
    const db = escapeIdentifier(req.params.db);
    const result = await pool.request().query(`
      SELECT s.name AS [schema], p.name AS [name]
      FROM ${db}.sys.procedures p
      JOIN ${db}.sys.schemas s ON p.schema_id = s.schema_id
      ORDER BY s.name, p.name
    `);
    res.json({ procedures: result.recordset });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/databases/:db/functions', async (req, res) => {
  try {
    const pool = getPool();
    const db = escapeIdentifier(req.params.db);
    const result = await pool.request().query(`
      SELECT s.name AS [schema], o.name AS [name],
        CASE o.type
          WHEN 'FN' THEN 'Scalar'
          WHEN 'IF' THEN 'Table-valued'
          WHEN 'TF' THEN 'Table-valued'
        END AS [type]
      FROM ${db}.sys.objects o
      JOIN ${db}.sys.schemas s ON o.schema_id = s.schema_id
      WHERE o.type IN ('FN', 'IF', 'TF')
      ORDER BY s.name, o.name
    `);
    res.json({ functions: result.recordset });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/databases/:db/tables/:schema/:table/columns', async (req, res) => {
  try {
    const pool = getPool();
    const { db, schema, table } = req.params;
    const dbEsc = escapeIdentifier(db);
    const result = await pool.request()
      .input('schema', sql.VarChar, schema)
      .input('table', sql.VarChar, table)
      .query(`
        SELECT
          c.name AS [name],
          t.name AS [dataType],
          c.max_length,
          c.precision,
          c.scale,
          c.is_nullable AS [nullable],
          c.is_identity AS [identity],
          CASE WHEN pk.column_id IS NOT NULL THEN 1 ELSE 0 END AS [isPrimaryKey]
        FROM ${dbEsc}.sys.columns c
        JOIN ${dbEsc}.sys.types t ON c.user_type_id = t.user_type_id
        JOIN ${dbEsc}.sys.tables tbl ON c.object_id = tbl.object_id
        JOIN ${dbEsc}.sys.schemas s ON tbl.schema_id = s.schema_id
        LEFT JOIN (
          SELECT ic.object_id, ic.column_id
          FROM ${dbEsc}.sys.index_columns ic
          JOIN ${dbEsc}.sys.indexes i ON ic.object_id = i.object_id AND ic.index_id = i.index_id
          WHERE i.is_primary_key = 1
        ) pk ON c.object_id = pk.object_id AND c.column_id = pk.column_id
        WHERE s.name = @schema AND tbl.name = @table
        ORDER BY c.column_id
      `);
    res.json({ columns: result.recordset });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/databases/:db/tables/:schema/:table/indexes', async (req, res) => {
  try {
    const pool = getPool();
    const { db, schema, table } = req.params;
    const dbEsc = escapeIdentifier(db);
    const result = await pool.request()
      .input('schema', sql.VarChar, schema)
      .input('table', sql.VarChar, table)
      .query(`
        SELECT
          i.name AS [name],
          i.type_desc AS [type],
          i.is_unique AS [unique],
          i.is_primary_key AS [primaryKey]
        FROM ${dbEsc}.sys.indexes i
        JOIN ${dbEsc}.sys.tables tbl ON i.object_id = tbl.object_id
        JOIN ${dbEsc}.sys.schemas s ON tbl.schema_id = s.schema_id
        WHERE s.name = @schema AND tbl.name = @table AND i.name IS NOT NULL
        ORDER BY i.name
      `);
    res.json({ indexes: result.recordset });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/databases', async (req, res) => {
  try {
    const { name } = req.body;

    if (!name || typeof name !== 'string') {
      return res.status(400).json({ error: 'Database name is required.' });
    }

    if (!/^[a-zA-Z0-9_]+$/.test(name)) {
      return res.status(400).json({ error: 'Invalid database name. Use only letters, numbers, and underscores.' });
    }

    if (name.length > 128) {
      return res.status(400).json({ error: 'Database name must be 128 characters or less.' });
    }

    const pool = getPool();
    const escapedName = escapeIdentifier(name);
    await pool.request().query(`CREATE DATABASE ${escapedName}`);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
