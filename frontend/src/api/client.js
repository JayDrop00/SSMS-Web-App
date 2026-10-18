const API_BASE = '/api';

async function request(url, options = {}) {
  const response = await fetch(`${API_BASE}${url}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    },
    ...options
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: response.statusText }));
    throw new Error(error.error || 'Request failed');
  }

  return response.json();
}

export const api = {
  getStatus: () => request('/status'),
  connect: (data) => request('/connect', { method: 'POST', body: JSON.stringify(data) }),
  disconnect: () => request('/disconnect', { method: 'POST' }),

  getDatabases: () => request('/databases'),
  getTables: (db) => request(`/databases/${db}/tables`),
  getViews: (db) => request(`/databases/${db}/views`),
  getProcedures: (db) => request(`/databases/${db}/procedures`),
  getFunctions: (db) => request(`/databases/${db}/functions`),
  getColumns: (db, schema, table) => request(`/databases/${db}/tables/${schema}/${table}/columns`),
  getIndexes: (db, schema, table) => request(`/databases/${db}/tables/${schema}/${table}/indexes`),

  executeQuery: (database, sql, executionId) => request('/query/execute', { method: 'POST', body: JSON.stringify({ database, sql, executionId }) }),
  cancelQuery: (executionId) => request('/query/cancel', { method: 'POST', body: JSON.stringify({ executionId }) }),
  getExecutionPlan: (database, sql, executionId) => request('/query/execution-plan', { method: 'POST', body: JSON.stringify({ database, sql, executionId }) }),

  updateRow: (payload) => request('/rows/update', { method: 'POST', body: JSON.stringify(payload) }),
  deleteRow: (payload) => request('/rows/delete', { method: 'POST', body: JSON.stringify(payload) }),

  createDatabase: (name) => request('/databases', { method: 'POST', body: JSON.stringify({ name }) })
};
