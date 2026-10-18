import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { api } from '../api/client';
import { useHistoryStore } from './history';
import { useConnectionStore } from './connection';

let tabCounter = 1;

const SQL_IDENT = String.raw`(?:\[[^\]\r\n]+\]|[A-Za-z_@#$][\w$]*)`;

function stripSqlNoise(sql) {
  return sql.replace(/\/\*[\s\S]*?\*\/|--[^\r\n]*|'(?:[^'\r\n]|'')*'/g, ' ');
}

function stripBrackets(part) {
  const trimmed = part.trim();
  if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
    return trimmed.slice(1, -1).trim();
  }
  return trimmed;
}

function detectTargetDatabase(sql) {
  const text = stripSqlNoise(sql);

  const useMatch = new RegExp(
    String.raw`(?<!\.)\bUSE\s+(?:\[([^\]\r\n]+)\]|([A-Za-z_@#$][\w$]*))`,
    'gi'
  ).exec(text);
  const chainMatch = new RegExp(
    String.raw`${SQL_IDENT}(?:\s*\.\s*${SQL_IDENT})+`,
    'gi'
  ).exec(text);

  const candidates = [];

  if (useMatch) {
    const db = (useMatch[1] || useMatch[2] || '').trim();
    if (db && !db.startsWith('@')) {
      candidates.push({ index: useMatch.index, db });
    }
  }

  if (chainMatch) {
    const parts = chainMatch[0].split('.').map(p => p.trim());
    let db = null;
    if (parts.length >= 4) {
      db = stripBrackets(parts[1]);
    } else if (parts.length === 3) {
      db = stripBrackets(parts[0]);
    }
    if (db && !db.startsWith('@')) {
      candidates.push({ index: chainMatch.index, db });
    }
  }

  if (!candidates.length) return null;
  candidates.sort((a, b) => a.index - b.index);
  return candidates[0].db;
}

function preferredResultTab(sql) {
  const text = stripSqlNoise(sql);
  const stmt = String.raw`(?:^|;|\))\s*`;

  if (new RegExp(stmt + String.raw`\bSELECT\b`, 'i').test(text)) {
    return 'results';
  }
  if (new RegExp(stmt + String.raw`\b(?:INSERT|UPDATE|DELETE)\b`, 'i').test(text)) {
    return 'messages';
  }
  return 'results';
}

export const useQueryTabsStore = defineStore('queryTabs', () => {
  const tabs = ref([]);
  const activeTabId = ref(null);
  const history = useHistoryStore();
  const connection = useConnectionStore();

  const activeTab = computed(() => tabs.value.find(t => t.id === activeTabId.value));

  function createTab(database = null, sql = '') {
    const id = Date.now();
    const title = `SQLQuery${tabCounter}.sql`;
    tabCounter++;

    const tab = {
      id,
      title,
      sql,
      database,
      dirty: false,
      resultSets: [],
      messages: [],
      planXml: null,
      rowsAffected: [],
      durationMs: 0,
      activeResultTab: 'results',
      loading: false,
      executionId: null
    };

    tabs.value.push(tab);
    activeTabId.value = id;
    return tab;
  }

  function closeTab(id) {
    const index = tabs.value.findIndex(t => t.id === id);
    if (index === -1) return;

    const closed = tabs.value[index];
    if (closed.executionId) {
      api.cancelQuery(closed.executionId).catch(() => {});
    }

    tabs.value.splice(index, 1);

    if (activeTabId.value === id) {
      activeTabId.value = tabs.value.length > 0 ? tabs.value[Math.min(index, tabs.value.length - 1)].id : null;
    }
  }

  function setActiveTab(id) {
    activeTabId.value = id;
  }

  function reset() {
    tabs.value = [];
    activeTabId.value = null;
    tabCounter = 1;
  }

  function updateTabSql(id, sql) {
    const tab = tabs.value.find(t => t.id === id);
    if (tab) {
      tab.sql = sql;
      tab.dirty = true;
    }
  }

  async function executeQuery(id) {
    const tab = tabs.value.find(t => t.id === id);
    if (!tab || !tab.sql.trim()) return;

    const target = detectTargetDatabase(tab.sql);
    if (target && target !== tab.database) {
      tab.database = target;
    }

    const executionId = crypto.randomUUID();
    tab.loading = true;
    tab.executionId = executionId;
    tab.activeResultTab = preferredResultTab(tab.sql);

    try {
      const result = await api.executeQuery(tab.database, tab.sql, executionId);
      tab.resultSets = result.resultSets;
      tab.messages = result.messages || [];
      tab.rowsAffected = result.rowsAffected;
      tab.durationMs = result.durationMs;
      tab.dirty = false;

      const hasError = tab.messages.some(m => m.isError);
      if (connection.connected) {
        history.addEntry(tab.sql, tab.database, tab.durationMs, tab.rowsAffected, !hasError);
      }
    } catch (err) {
      tab.messages = [{ isError: true, text: err.message }];
      tab.resultSets = [];
      tab.rowsAffected = [];

      if (connection.connected) {
        history.addEntry(tab.sql, tab.database, 0, [], false);
      }
    } finally {
      tab.loading = false;
      tab.executionId = null;
    }
  }

  async function cancelQuery(id) {
    const tab = tabs.value.find(t => t.id === id);
    if (!tab || !tab.executionId) return;
    try {
      await api.cancelQuery(tab.executionId);
    } catch {
      // Query likely already completed; executeQuery's finally will clean up.
    }
  }

  function buildRowKeys(resultSet, row) {
    const keys = {};
    resultSet.columnMeta.forEach((meta, i) => {
      if (meta.isKey) keys[meta.name] = row[i];
    });
    return keys;
  }

  async function commitCellEdit(id, resultIndex, rowIndex, columnName, value) {
    const tab = tabs.value.find(t => t.id === id);
    if (!tab) return { ok: false, error: 'Tab not found' };

    const resultSet = tab.resultSets[resultIndex];
    const source = resultSet?.source;
    if (!source?.isEditable) {
      return { ok: false, error: 'This result set is not editable' };
    }

    const row = resultSet.rows[rowIndex];
    const keys = buildRowKeys(resultSet, row);

    try {
      await api.updateRow({
        database: source.database,
        schema: source.schema,
        table: source.table,
        keys,
        changes: { [columnName]: value }
      });
      const colIndex = resultSet.columns.indexOf(columnName);
      if (colIndex !== -1) {
        resultSet.rows[rowIndex][colIndex] = value;
      }
      return { ok: true };
    } catch (err) {
      tab.messages = [...(tab.messages || []), { isError: true, text: err.message }];
      return { ok: false, error: err.message };
    }
  }

  async function deleteResultRow(id, resultIndex, rowIndex) {
    const tab = tabs.value.find(t => t.id === id);
    if (!tab) return { ok: false, error: 'Tab not found' };

    const resultSet = tab.resultSets[resultIndex];
    const source = resultSet?.source;
    if (!source?.isEditable) {
      return { ok: false, error: 'This result set is not editable' };
    }

    const row = resultSet.rows[rowIndex];
    const keys = buildRowKeys(resultSet, row);

    try {
      await api.deleteRow({
        database: source.database,
        schema: source.schema,
        table: source.table,
        keys
      });
      resultSet.rows.splice(rowIndex, 1);
      return { ok: true };
    } catch (err) {
      tab.messages = [...(tab.messages || []), { isError: true, text: err.message }];
      return { ok: false, error: err.message };
    }
  }

  async function getExecutionPlan(id) {
    const tab = tabs.value.find(t => t.id === id);
    if (!tab || !tab.sql.trim()) return;

    const target = detectTargetDatabase(tab.sql);
    if (target && target !== tab.database) {
      tab.database = target;
    }

    const executionId = crypto.randomUUID();
    tab.loading = true;
    tab.executionId = executionId;
    tab.activeResultTab = 'plan';

    try {
      const result = await api.getExecutionPlan(tab.database, tab.sql, executionId);
      tab.resultSets = result.resultSets;
      tab.planXml = result.planXml;
      tab.messages = result.messages || [];
      tab.durationMs = result.durationMs;
    } catch (err) {
      tab.messages = [{ isError: true, text: err.message }];
      tab.planXml = null;
    } finally {
      tab.loading = false;
      tab.executionId = null;
    }
  }

  return {
    tabs, activeTabId, activeTab,
    createTab, closeTab, setActiveTab, updateTabSql, reset,
    executeQuery, cancelQuery, commitCellEdit, deleteResultRow, getExecutionPlan
  };
});
