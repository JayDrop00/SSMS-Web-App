const express = require('express');
const router = express.Router();
const { getPool, sql } = require('../db/pool');
const { register: registerRequest, remove: removeRequest, cancel: cancelRequest } = require('../db/activeRequests');

function escapeIdentifier(name) {
  return `[${String(name).replace(/]/g, ']]')}]`;
}

function getTimeoutMs() {
  return parseInt(process.env.QUERY_TIMEOUT_MS || '60000', 10);
}

function isCancellationError(err) {
  if (!err) return false;
  return err.code === 'ECANCEL' || /^canceled\.?$/i.test(String(err.message || '').trim());
}

function isTimeoutError(err) {
  if (!err) return false;
  return err.code === 'ETIMEOUT' || err.isGuardTimeout === true;
}

function formatQueryError(err) {
  const errorMsg = err.message || String(err);
  const match = errorMsg.match(/Msg (\d+), Level (\d+), State (\d+), Line (\d+)/);
  if (match) {
    return `Msg ${match[1]}, Level ${match[2]}, State ${match[3]}, Line ${match[4]}\n${errorMsg.split('\n').slice(1).join('\n').trim()}`;
  }
  return errorMsg;
}

async function executeWithRegistry(executionId, buildRequest, queryText) {
  const timeoutMs = getTimeoutMs();
  const request = buildRequest();

  let guardTimer;
  const guard = new Promise((_, reject) => {
    guardTimer = setTimeout(() => {
      try { request.cancel(); } catch { /* already completed */ }
      const err = new Error(`Query timed out after ${timeoutMs}ms`);
      err.isGuardTimeout = true;
      reject(err);
    }, timeoutMs + 1000);
  });

  registerRequest(executionId, request);
  try {
    return await Promise.race([request.query(queryText), guard]);
  } finally {
    clearTimeout(guardTimer);
    removeRequest(executionId);
  }
}

function buildBatchText(database, queryText) {
  return database ? `USE ${escapeIdentifier(database)};\n${queryText}` : queryText;
}

function recordsetsToResultSets(recordsets) {
  return recordsets.map(recordset => {
    if (!recordset || recordset.length === 0) {
      return { columns: [], rows: [], source: null, columnMeta: [] };
    }
    const columns = Object.keys(recordset[0]);
    return {
      columns,
      rows: recordset.map(row => columns.map(col => row[col])),
      source: null,
      columnMeta: []
    };
  });
}

async function describeResultSet(database, queryText) {
  const pool = getPool();
  const useClause = database ? `USE ${escapeIdentifier(database)};\n` : '';
  const result = await pool.request()
    .input('tsql', sql.NVarChar, queryText)
    .query(`
      ${useClause}SELECT
      r.column_ordinal,
      r.name,
      r.is_computed_column,
      r.is_part_of_unique_key,
      r.is_identity_column,
      r.is_nullable,
      r.system_type_name,
      r.source_database,
      r.source_schema,
      r.source_table,
      r.source_column,
      r.error_number,
      r.error_message
    FROM sys.dm_exec_describe_first_result_set(@tsql, NULL, 1) r
    ORDER BY r.column_ordinal
  `);

  const rows = result.recordset || [];
  if (rows.some(r => r.error_number)) {
    return [];
  }

  return rows
    .filter(r => r.name)
    .map(r => ({
      column_ordinal: r.column_ordinal,
      name: r.name,
      is_computed: r.is_computed_column,
      is_part_of_key: r.is_part_of_unique_key,
      is_identity: r.is_identity_column,
      is_nullable: r.is_nullable,
      system_type_name: r.system_type_name,
      base_database_name: r.source_database,
      base_schema_name: r.source_schema,
      base_table_name: r.source_table,
      base_column_name: r.source_column
    }));
}

function groupDescribeRows(describeRows) {
  const groups = [];
  let current = null;
  let prevOrdinal = 0;
  for (const row of describeRows) {
    if (!row.name) continue;
    if (!current || row.column_ordinal <= prevOrdinal) {
      current = [];
      groups.push(current);
    }
    current.push(row);
    prevOrdinal = row.column_ordinal;
  }
  return groups;
}

async function getTableEditability(database, schemaName, tableName) {
  if (!schemaName || !tableName) {
    return { isBaseTable: false, hasPrimaryKey: false };
  }
  const pool = getPool();
  const dbEsc = escapeIdentifier(database);
  const result = await pool.request()
    .input('schema', sql.NVarChar, schemaName)
    .input('table', sql.NVarChar, tableName)
    .query(`
      SELECT
        t.object_id,
        CASE WHEN pk.index_id IS NOT NULL THEN 1 ELSE 0 END AS hasPrimaryKey
      FROM ${dbEsc}.sys.tables t
      JOIN ${dbEsc}.sys.schemas s ON t.schema_id = s.schema_id
      OUTER APPLY (
        SELECT i.index_id
        FROM ${dbEsc}.sys.indexes i
        WHERE i.object_id = t.object_id AND i.is_primary_key = 1
      ) pk
      WHERE s.name = @schema AND t.name = @table
    `);
  const row = result.recordset && result.recordset[0];
  return {
    isBaseTable: Boolean(row),
    hasPrimaryKey: Boolean(row && row.hasPrimaryKey)
  };
}

function buildResultMetadata(resultSets, describeGroups, database) {
  return Promise.all(resultSets.map(async (resultSet, index) => {
    const group = describeGroups[index];

    if (!group || group.length === 0 || resultSet.columns.length === 0) {
      resultSet.source = {
        database: database || null,
        schema: null,
        table: null,
        isEditable: false,
        reason: 'Result set does not come from a single table'
      };
      resultSet.columnMeta = resultSet.columns.map(name => ({
        name, isKey: false, isIdentity: false, isComputed: false, isNullable: true, dataType: null
      }));
      return resultSet;
    }

    if (group.length !== resultSet.columns.length) {
      resultSet.source = {
        database: database || null,
        schema: null,
        table: null,
        isEditable: false,
        reason: 'Unable to map result columns to their source'
      };
      resultSet.columnMeta = resultSet.columns.map(name => ({
        name, isKey: false, isIdentity: false, isComputed: false, isNullable: true, dataType: null
      }));
      return resultSet;
    }

    const columnMeta = group.map((col, i) => ({
      name: resultSet.columns[i],
      isKey: Boolean(col.is_part_of_key),
      isIdentity: Boolean(col.is_identity),
      isComputed: Boolean(col.is_computed),
      isNullable: Boolean(col.is_nullable),
      dataType: col.system_type_name || null,
      baseColumn: col.base_column_name || null
    }));

    const sources = new Set(
      group.filter(c => c.base_table_name).map(c => `${c.base_schema_name}.${c.base_table_name}`)
    );
    const hasScalarColumns = group.some(c => !c.base_column_name);
    const allFromOneTable = sources.size === 1 && !hasScalarColumns;

    let source = {
      database: database || null,
      schema: null,
      table: null,
      isEditable: false,
      reason: 'Result set does not come from a single table'
    };

    if (allFromOneTable && database) {
      const first = group.find(c => c.base_table_name);
      const schemaName = first.base_schema_name;
      const tableName = first.base_table_name;
      let isBaseTable = false;
      let hasPrimaryKey = false;
      try {
        ({ isBaseTable, hasPrimaryKey } = await getTableEditability(database, schemaName, tableName));
      } catch {
        isBaseTable = false;
      }

      let reason = null;
      if (!isBaseTable) reason = 'Source is not a base table (views and joins are read-only)';
      else if (!hasPrimaryKey) reason = 'Table has no primary key — results are read-only';

      source = {
        database: database || first.base_database_name || null,
        schema: schemaName,
        table: tableName,
        isEditable: !reason,
        reason
      };
    }

    resultSet.source = source;
    resultSet.columnMeta = columnMeta;
    return resultSet;
  }));
}

router.post('/execute', async (req, res) => {
  const { database, sql: query, executionId } = req.body;

  if (!query || !query.trim()) {
    return res.status(400).json({ error: 'SQL query is required' });
  }

  const startTime = Date.now();

  try {
    const pool = getPool();
    const result = await executeWithRegistry(
      executionId,
      () => pool.request(),
      buildBatchText(database, query)
    );
    const durationMs = Date.now() - startTime;

    const resultSets = recordsetsToResultSets(result.recordsets || []);

    let describeGroups = [];
    try {
      describeGroups = groupDescribeRows(await describeResultSet(database, query));
    } catch {
      describeGroups = [];
    }
    await buildResultMetadata(resultSets, describeGroups, database);

    res.json({
      resultSets,
      messages: [],
      rowsAffected: result.rowsAffected || [],
      durationMs
    });
  } catch (err) {
    const durationMs = Date.now() - startTime;
    const text = isCancellationError(err)
      ? 'Query cancelled by user.'
      : isTimeoutError(err)
        ? `Query timed out after ${getTimeoutMs()}ms.`
        : formatQueryError(err);

    res.status(200).json({
      resultSets: [],
      messages: [{ isError: true, text }],
      rowsAffected: [],
      durationMs
    });
  }
});

router.post('/cancel', (req, res) => {
  const { executionId } = req.body;
  if (!executionId) {
    return res.status(400).json({ error: 'executionId is required' });
  }
  const cancelled = cancelRequest(executionId);
  res.json({ cancelled });
});

router.post('/execution-plan', async (req, res) => {
  const { database, sql: query, executionId } = req.body;

  if (!query || !query.trim()) {
    return res.status(400).json({ error: 'SQL query is required' });
  }

  const startTime = Date.now();
  const wrappedQuery = `SET STATISTICS XML ON;\n${query}\nSET STATISTICS XML OFF;`;

  try {
    const pool = getPool();
    const result = await executeWithRegistry(
      executionId,
      () => pool.request(),
      buildBatchText(database, wrappedQuery)
    );
    const durationMs = Date.now() - startTime;

    let planXml = null;
    const resultSets = [];

    for (const recordset of result.recordsets) {
      if (recordset.length > 0) {
        const firstCol = Object.keys(recordset[0])[0];
        if (firstCol && firstCol.includes('Showplan')) {
          planXml = recordset[0][firstCol];
        } else {
          const columns = Object.keys(recordset[0]);
          resultSets.push({
            columns,
            rows: recordset.map(row => columns.map(col => row[col])),
            source: null,
            columnMeta: []
          });
        }
      }
    }

    res.json({
      resultSets,
      planXml,
      durationMs
    });
  } catch (err) {
    const durationMs = Date.now() - startTime;
    const text = isCancellationError(err)
      ? 'Query cancelled by user.'
      : isTimeoutError(err)
        ? `Query timed out after ${getTimeoutMs()}ms.`
        : formatQueryError(err);
    res.status(200).json({
      resultSets: [],
      planXml: null,
      messages: [{ isError: true, text }],
      durationMs
    });
  }
});

module.exports = router;
