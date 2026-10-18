const express = require('express');
const router = express.Router();
const { getPool, sql } = require('../db/pool');

const UNSUPPORTED_EDIT_TYPES = new Set([
  'xml', 'timestamp', 'rowversion', 'image', 'binary', 'varbinary', 'geography', 'geometry', 'hierarchyid'
]);

function escapeIdentifier(name) {
  return `[${String(name).replace(/]/g, ']]')}]`;
}

function badRequest(res, message) {
  return res.status(400).json({ error: message });
}

async function loadTableMetadata(database, schemaName, tableName) {
  const pool = getPool();
  const dbEsc = escapeIdentifier(database);

  const tableResult = await pool.request()
    .input('schema', sql.NVarChar, schemaName)
    .input('table', sql.NVarChar, tableName)
    .query(`
      SELECT t.object_id
      FROM ${dbEsc}.sys.tables t
      JOIN ${dbEsc}.sys.schemas s ON t.schema_id = s.schema_id
      WHERE s.name = @schema AND t.name = @table
    `);

  const tableRow = tableResult.recordset && tableResult.recordset[0];
  if (!tableRow) {
    return null;
  }

  const objectId = tableRow.object_id;
  const columnsResult = await pool.request()
    .input('objectId', sql.Int, objectId)
    .query(`
      SELECT
        c.name AS [name],
        ty.name AS [dataType],
        c.max_length,
        c.precision,
        c.scale,
        c.is_nullable,
        c.is_identity,
        c.is_computed,
        CASE WHEN pk.column_id IS NOT NULL THEN 1 ELSE 0 END AS isPrimaryKey
      FROM ${dbEsc}.sys.columns c
      JOIN ${dbEsc}.sys.types ty ON c.user_type_id = ty.user_type_id
      LEFT JOIN (
        SELECT ic.object_id, ic.column_id
        FROM ${dbEsc}.sys.index_columns ic
        JOIN ${dbEsc}.sys.indexes i ON ic.object_id = i.object_id AND ic.index_id = i.index_id
        WHERE i.is_primary_key = 1
      ) pk ON c.object_id = pk.object_id AND c.column_id = pk.column_id
      WHERE c.object_id = @objectId
      ORDER BY c.column_id
    `);

  return columnsResult.recordset || [];
}

function toSqlParameter(col, value) {
  const type = col.dataType;
  if (UNSUPPORTED_EDIT_TYPES.has(type)) {
    throw new Error(`Column '${col.name}' has unsupported type '${type}' and cannot be edited`);
  }
  switch (type) {
    case 'bigint': return { type: sql.BigInt, value: value === null ? null : String(value) };
    case 'int': return { type: sql.Int, value: value === null ? null : parseInt(value, 10) };
    case 'smallint': return { type: sql.SmallInt, value: value === null ? null : parseInt(value, 10) };
    case 'tinyint': return { type: sql.TinyInt, value: value === null ? null : parseInt(value, 10) };
    case 'bit': return { type: sql.Bit, value: value === null ? null : (value === true || value === 1 || value === '1' || value === 'true') };
    case 'decimal': case 'numeric': return { type: sql.Decimal(col.precision || 18, col.scale || 0), value: value === null ? null : String(value) };
    case 'money': return { type: sql.Money, value: value === null ? null : String(value) };
    case 'smallmoney': return { type: sql.SmallMoney, value: value === null ? null : String(value) };
    case 'float': return { type: sql.Float, value: value === null ? null : parseFloat(value) };
    case 'real': return { type: sql.Real, value: value === null ? null : parseFloat(value) };
    case 'date': return { type: sql.Date, value: value === null ? null : String(value) };
    case 'time': return { type: sql.Time, value: value === null ? null : String(value) };
    case 'datetimeoffset': return { type: sql.DateTimeOffset, value: value === null ? null : String(value) };
    case 'datetime': case 'datetime2': case 'smalldatetime': return { type: sql.DateTime2, value: value === null ? null : String(value) };
    case 'uniqueidentifier': return { type: sql.UniqueIdentifier, value: value === null ? null : String(value) };
    default: return { type: sql.NVarChar, value: value === null ? null : String(value) };
  }
}

function validateRequest(req, res) {
  const { database, schema: schemaName, table: tableName, keys, changes } = req.body || {};

  if (!database || typeof database !== 'string') {
    badRequest(res, 'database is required');
    return null;
  }
  if (!schemaName || typeof schemaName !== 'string') {
    badRequest(res, 'schema is required');
    return null;
  }
  if (!tableName || typeof tableName !== 'string') {
    badRequest(res, 'table is required');
    return null;
  }
  if (!keys || typeof keys !== 'object' || Array.isArray(keys) || Object.keys(keys).length === 0) {
    badRequest(res, 'keys must be a non-empty object of primary key column values');
    return null;
  }
  if (changes !== undefined && (typeof changes !== 'object' || Array.isArray(changes))) {
    badRequest(res, 'changes must be an object of column values');
    return null;
  }
  return { database, schemaName, tableName, keys, changes: changes || {} };
}

async function resolveValidatedTarget(req, res) {
  const parsed = validateRequest(req, res);
  if (!parsed) return null;

  const { database, schemaName, tableName, keys, changes } = parsed;

  let columns;
  try {
    columns = await loadTableMetadata(database, schemaName, tableName);
  } catch (err) {
    res.status(500).json({ error: err.message });
    return null;
  }

  if (!columns || columns.length === 0) {
    badRequest(res, `Table '${database}.${schemaName}.${tableName}' was not found or is not a base table`);
    return null;
  }

  const columnsByName = new Map(columns.map(c => [c.name.toLowerCase(), c]));
  const pkColumns = columns.filter(c => c.isPrimaryKey);

  if (pkColumns.length === 0) {
    badRequest(res, `Table '${schemaName}.${tableName}' has no primary key; rows cannot be targeted safely`);
    return null;
  }

  const pkNamesLower = new Set(pkColumns.map(c => c.name.toLowerCase()));
  const keyNames = Object.keys(keys);
  for (const keyName of keyNames) {
    if (!pkNamesLower.has(keyName.toLowerCase())) {
      badRequest(res, `'${keyName}' is not a primary key column of '${schemaName}.${tableName}'`);
      return null;
    }
  }
  if (keyNames.length !== pkColumns.length) {
    badRequest(res, `keys must contain all primary key columns: ${pkColumns.map(c => c.name).join(', ')}`);
    return null;
  }

  for (const changeName of Object.keys(changes)) {
    const col = columnsByName.get(changeName.toLowerCase());
    if (!col) {
      badRequest(res, `Column '${changeName}' does not exist on '${schemaName}.${tableName}'`);
      return null;
    }
    if (col.is_identity) {
      badRequest(res, `Column '${col.name}' is an identity column and cannot be updated`);
      return null;
    }
    if (col.is_computed) {
      badRequest(res, `Column '${col.name}' is a computed column and cannot be updated`);
      return null;
    }
    if (UNSUPPORTED_EDIT_TYPES.has(col.dataType)) {
      badRequest(res, `Column '${col.name}' has unsupported type '${col.dataType}'`);
      return null;
    }
  }

  const canonicalKeys = {};
  for (const pkCol of pkColumns) {
    const entry = Object.keys(keys).find(k => k.toLowerCase() === pkCol.name.toLowerCase());
    canonicalKeys[pkCol.name] = keys[entry];
  }

  const canonicalChanges = {};
  for (const [name, value] of Object.entries(changes)) {
    const col = columnsByName.get(name.toLowerCase());
    canonicalChanges[col.name] = value;
  }

  return { database, schemaName, tableName, canonicalKeys, canonicalChanges, pkColumns, columnsByName };
}

function buildWhereClause(request, pkColumns, keys) {
  const parts = [];
  pkColumns.forEach((col, i) => {
    if (keys[col.name] === null || keys[col.name] === undefined) {
      parts.push(`${escapeIdentifier(col.name)} IS NULL`);
      return;
    }
    const param = toSqlParameter(col, keys[col.name]);
    const paramName = `k${i}`;
    request.input(paramName, param.type, param.value);
    parts.push(`${escapeIdentifier(col.name)} = @${paramName}`);
  });
  return parts.join(' AND ');
}

router.post('/update', async (req, res) => {
  const target = await resolveValidatedTarget(req, res);
  if (!target) return;

  const { database, schemaName, tableName, canonicalKeys, canonicalChanges, pkColumns, columnsByName } = target;
  const changeNames = Object.keys(canonicalChanges);

  if (changeNames.length === 0) {
    return badRequest(res, 'changes must contain at least one column');
  }

  try {
    const pool = getPool();
    const request = pool.request();

    const setParts = changeNames.map((name, i) => {
      const col = columnsByName.get(name.toLowerCase());
      const param = toSqlParameter(col, canonicalChanges[name]);
      const paramName = `v${i}`;
      request.input(paramName, param.type, param.value);
      return `${escapeIdentifier(name)} = @${paramName}`;
    });

    const whereClause = buildWhereClause(request, pkColumns, canonicalKeys);
    const qualified = `${escapeIdentifier(database)}.${escapeIdentifier(schemaName)}.${escapeIdentifier(tableName)}`;
    const queryText = `UPDATE ${qualified} SET ${setParts.join(', ')} WHERE ${whereClause}`;

    const result = await request.query(queryText);
    const rowsAffected = (result.rowsAffected && result.rowsAffected[0]) || 0;

    if (rowsAffected === 0) {
      return res.status(409).json({
        error: 'Row was changed or deleted by another user. Refresh and retry.'
      });
    }

    res.json({ success: true, rowsAffected });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/delete', async (req, res) => {
  const target = await resolveValidatedTarget(req, res);
  if (!target) return;

  const { database, schemaName, tableName, canonicalKeys, pkColumns } = target;

  try {
    const pool = getPool();
    const request = pool.request();

    const whereClause = buildWhereClause(request, pkColumns, canonicalKeys);
    const qualified = `${escapeIdentifier(database)}.${escapeIdentifier(schemaName)}.${escapeIdentifier(tableName)}`;
    const queryText = `DELETE FROM ${qualified} WHERE ${whereClause}`;

    const result = await request.query(queryText);
    const rowsAffected = (result.rowsAffected && result.rowsAffected[0]) || 0;

    if (rowsAffected === 0) {
      return res.status(409).json({
        error: 'Row was changed or deleted by another user. Refresh and retry.'
      });
    }

    res.json({ success: true, rowsAffected });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
