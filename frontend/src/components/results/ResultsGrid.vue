<template>
  <div class="results-grid-container" @click="closeContextMenu">
    <div class="results-toolbar">
      <span v-if="editableNotice" class="editable-notice">{{ editableNotice }}</span>
      <span v-else-if="readOnlyNotice" class="readonly-notice" :title="readOnlyNotice">{{ readOnlyNotice }}</span>
      <span v-else class="toolbar-spacer-sm"></span>
      <button class="toolbar-btn-sm" @click="exportCSV" :disabled="!hasData" title="Export as CSV">
        Export CSV
      </button>
      <button class="toolbar-btn-sm" @click="exportJSON" :disabled="!hasData" title="Export as JSON">
        Export JSON
      </button>
    </div>

    <div v-if="errorBanner" class="error-banner" @click="errorBanner = null">
      {{ errorBanner }}
    </div>

    <div class="results-scroll">
      <div v-for="(resultSet, resultIndex) in resultSets" :key="resultIndex" class="result-set-wrapper">
        <div v-if="resultSets.length > 1" class="result-set-label">
          Results {{ resultIndex + 1 }}
        </div>
        <table class="results-grid">
          <thead>
            <tr>
              <th
                v-for="(col, colIndex) in resultSet.columns"
                :key="col"
                :class="{ 'read-only-col': isColumnLocked(resultSet, colIndex) }"
                :title="columnHeaderTitle(resultSet, colIndex)"
              >
                <span v-if="resultSet.columnMeta?.[colIndex]?.isKey" class="key-badge" title="Primary key">&#128273;</span>
                {{ col }}
              </th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="(row, rowIndex) in resultSet.rows.slice(0, 1000)"
              :key="rowIndex"
              :class="{ 'selected-row': selectedRow?.resultIndex === resultIndex && selectedRow?.rowIndex === rowIndex }"
              @click.stop="selectRow(resultIndex, rowIndex)"
              @contextmenu.prevent="showContextMenu($event, resultIndex, rowIndex)"
            >
              <td
                v-for="(cell, cellIndex) in row"
                :key="cellIndex"
                :class="{
                  null: cell === null,
                  'read-only-col': isColumnLocked(resultSet, cellIndex),
                  'selected-cell': selectedCell?.resultIndex === resultIndex && selectedCell?.rowIndex === rowIndex && selectedCell?.cellIndex === cellIndex
                }"
                @dblclick="editCell($event, resultIndex, rowIndex, cellIndex, cell)"
              >
                <input
                  v-if="editingCell?.resultIndex === resultIndex && editingCell?.rowIndex === rowIndex && editingCell?.cellIndex === cellIndex"
                  class="cell-editor"
                  :value="editingCell.value"
                  @input="editingCell.value = $event.target.value"
                  @blur="saveCell(resultIndex, rowIndex, cellIndex)"
                  @keydown.enter="saveCell(resultIndex, rowIndex, cellIndex)"
                  @keydown.escape="cancelEdit"
                  ref="cellInput"
                />
                <template v-else>
                  {{ cell === null ? 'NULL' : cell }}
                </template>
              </td>
            </tr>
          </tbody>
        </table>
        <div v-if="resultSet.rows.length > 1000" class="result-set-label">
          Showing first 1000 of {{ resultSet.rows.length }} rows
        </div>
      </div>
    </div>

    <ContextMenu
      :visible="contextMenu.visible"
      :x="contextMenu.x"
      :y="contextMenu.y"
      :items="contextMenuItems"
      @select="handleContextAction"
      @close="contextMenu.visible = false"
    />

    <ConfirmDialog
      :visible="confirmDialog.visible"
      :title="confirmDialog.title"
      :message="confirmDialog.message"
      @confirm="confirmDialog.onConfirm"
      @cancel="confirmDialog.visible = false"
    />
  </div>
</template>

<script setup>
import { ref, reactive, computed, nextTick } from 'vue';
import { useQueryTabsStore } from '../../stores/queryTabs';
import ContextMenu from '../common/ContextMenu.vue';
import ConfirmDialog from '../common/ConfirmDialog.vue';

const props = defineProps({
  resultSets: Array
});

const queryTabs = useQueryTabsStore();

const selectedRow = ref(null);
const selectedCell = ref(null);
const editingCell = ref(null);
const cellInput = ref(null);
const errorBanner = ref(null);

const hasData = computed(() => props.resultSets?.some(rs => rs.rows?.length > 0));

const contextMenu = reactive({
  visible: false, x: 0, y: 0, resultIndex: 0, rowIndex: 0, cellIndex: null
});

const confirmDialog = reactive({ visible: false, title: '', message: '', onConfirm: null });

const editableNotice = computed(() => {
  const rs = props.resultSets?.find(r => r.source?.isEditable);
  if (!rs) return null;
  return `Editable: [${rs.source.schema}].[${rs.source.table}] — double-click a cell to edit, right-click a row to delete`;
});

const readOnlyNotice = computed(() => {
  const withSource = props.resultSets?.filter(r => r.source && !r.source.isEditable && r.rows?.length > 0);
  if (!withSource?.length) return null;
  const reasons = [...new Set(withSource.map(r => r.source.reason).filter(Boolean))];
  return reasons.length ? `Read-only: ${reasons.join('; ')}` : null;
});

const contextMenuItems = computed(() => {
  const resultSet = props.resultSets?.[contextMenu.resultIndex];
  const editable = Boolean(resultSet?.source?.isEditable);
  const items = [];

  if (editable) {
    items.push({ label: 'Delete Row', icon: '&#128465;', action: 'deleteRow' });
  }

  items.push({ label: 'Copy Row', icon: '&#128203;', action: 'copyRow' });
  items.push({ label: 'Copy Cell', icon: '&#128196;', action: 'copyCell' });
  return items;
});

function isResultSetEditable(resultSet) {
  return Boolean(resultSet?.source?.isEditable);
}

function isColumnLocked(resultSet, cellIndex) {
  if (!isResultSetEditable(resultSet)) return true;
  const meta = resultSet.columnMeta?.[cellIndex];
  if (!meta) return true;
  return meta.isIdentity || meta.isComputed;
}

function columnHeaderTitle(resultSet, cellIndex) {
  const meta = resultSet.columnMeta?.[cellIndex];
  if (!meta) return undefined;
  if (meta.isIdentity) return 'Identity column (read-only)';
  if (meta.isComputed) return 'Computed column (read-only)';
  if (meta.isKey) return 'Primary key column';
  return undefined;
}

function selectRow(resultIndex, rowIndex) {
  selectedRow.value = { resultIndex, rowIndex };
  selectedCell.value = { resultIndex, rowIndex, cellIndex: null };
}

function closeContextMenu() {
  contextMenu.visible = false;
}

function showContextMenu(event, resultIndex, rowIndex) {
  selectedRow.value = { resultIndex, rowIndex };

  let cellIndex = null;
  const td = event.target.closest?.('td');
  if (td) cellIndex = td.cellIndex;

  selectedCell.value = { resultIndex, rowIndex, cellIndex };
  contextMenu.visible = true;
  contextMenu.x = event.clientX;
  contextMenu.y = event.clientY;
  contextMenu.resultIndex = resultIndex;
  contextMenu.rowIndex = rowIndex;
  contextMenu.cellIndex = cellIndex;
}

function handleContextAction(item) {
  switch (item.action) {
    case 'deleteRow':
      confirmDeleteRow();
      break;
    case 'copyRow':
      copyRowToClipboard();
      break;
    case 'copyCell':
      copyCellToClipboard();
      break;
  }
}

function buildKeyDescription(resultSet, row) {
  return resultSet.columnMeta
    .map((meta, i) => (meta.isKey ? { name: meta.name, value: row[i] } : null))
    .filter(Boolean)
    .map(k => `[${k.name}] = ${k.value === null ? 'NULL' : k.value}`)
    .join(' AND ');
}

function confirmDeleteRow() {
  const resultSet = props.resultSets[contextMenu.resultIndex];
  const rowIndex = contextMenu.rowIndex;
  const row = resultSet.rows[rowIndex];
  const { schema, table } = resultSet.source;
  const keyDescription = buildKeyDescription(resultSet, row);

  confirmDialog.title = 'Delete Row';
  confirmDialog.message = `Delete row from [${schema}].[${table}]\n\nWHERE ${keyDescription}\n\nThis action cannot be undone.`;
  confirmDialog.onConfirm = () => executeDeleteRow(contextMenu.resultIndex, rowIndex);
  confirmDialog.visible = true;
}

async function executeDeleteRow(resultIndex, rowIndex) {
  confirmDialog.visible = false;
  const result = await queryTabs.deleteResultRow(queryTabs.activeTabId, resultIndex, rowIndex);
  if (!result.ok) {
    errorBanner.value = result.error;
  }
}

function copyRowToClipboard() {
  const resultSet = props.resultSets[contextMenu.resultIndex];
  const row = resultSet.rows[contextMenu.rowIndex];
  const text = row.map(cell => cell === null ? 'NULL' : String(cell)).join('\t');
  navigator.clipboard.writeText(text);
}

function copyCellToClipboard() {
  if (selectedCell.value?.cellIndex !== null && selectedCell.value?.cellIndex !== undefined) {
    const { resultIndex, rowIndex, cellIndex } = selectedCell.value;
    const cell = props.resultSets[resultIndex].rows[rowIndex][cellIndex];
    navigator.clipboard.writeText(cell === null ? 'NULL' : String(cell));
  }
}

function editCell(event, resultIndex, rowIndex, cellIndex, value) {
  const resultSet = props.resultSets[resultIndex];
  if (isColumnLocked(resultSet, cellIndex)) return;

  selectedCell.value = { resultIndex, rowIndex, cellIndex };
  errorBanner.value = null;
  editingCell.value = { resultIndex, rowIndex, cellIndex, value: value === null ? '' : String(value), original: value };
  nextTick(() => {
    const input = event.target.querySelector('.cell-editor');
    if (input) input.focus();
  });
}

async function saveCell(resultIndex, rowIndex, cellIndex) {
  if (!editingCell.value) return;
  const { value, original } = editingCell.value;
  editingCell.value = null;

  const resultSet = props.resultSets[resultIndex];
  const columnName = resultSet.columns[cellIndex];

  if (value === (original === null ? '' : String(original))) {
    return;
  }

  const result = await queryTabs.commitCellEdit(queryTabs.activeTabId, resultIndex, rowIndex, columnName, value);
  if (!result.ok) {
    errorBanner.value = result.error;
  }
}

function cancelEdit() {
  editingCell.value = null;
  selectedCell.value = null;
}

function exportCSV() {
  const allRows = [];
  props.resultSets.forEach((rs, idx) => {
    if (rs.columns?.length) {
      if (props.resultSets.length > 1) allRows.push([`Results ${idx + 1}`]);
      allRows.push(rs.columns);
      rs.rows.forEach(row => {
        allRows.push(row.map(cell => cell === null ? '' : String(cell)));
      });
      allRows.push([]);
    }
  });

  const csv = allRows.map(row => row.map(cell => `"${cell.replace(/"/g, '""')}"`).join(',')).join('\n');
  downloadFile(csv, 'query_results.csv', 'text/csv');
}

function exportJSON() {
  const data = props.resultSets.map((rs, idx) => {
    const rows = rs.rows.map(row => {
      const obj = {};
      rs.columns.forEach((col, i) => { obj[col] = row[i]; });
      return obj;
    });
    return props.resultSets.length > 1 ? { resultIndex: idx + 1, rows } : rows;
  });

  const json = JSON.stringify(data.length === 1 ? data[0] : data, null, 2);
  downloadFile(json, 'query_results.json', 'application/json');
}

function downloadFile(content, filename, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
</script>

<style scoped>
.results-grid-container {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.results-toolbar {
  display: flex;
  gap: 4px;
  align-items: center;
  padding: 4px 8px;
  background: var(--bg-surface-alt);
  border-bottom: 1px solid var(--border-light);
}

.toolbar-spacer-sm {
  flex: 1;
}

.editable-notice,
.readonly-notice {
  flex: 1;
  font-size: 11px;
  padding: 2px 6px;
  border-radius: 3px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.editable-notice {
  color: var(--text-primary);
  background: color-mix(in srgb, var(--accent) 12%, transparent);
  border: 1px solid color-mix(in srgb, var(--accent) 35%, transparent);
}

.readonly-notice {
  color: var(--text-primary);
  background: var(--bg-hover);
  border: 1px solid var(--border-color);
}

.error-banner {
  padding: 4px 8px;
  font-size: 12px;
  color: #fff;
  background: #b03030;
  cursor: pointer;
}

.toolbar-btn-sm {
  padding: 2px 8px;
  border: 1px solid var(--border-color);
  background: var(--bg-surface);
  cursor: pointer;
  font-size: 11px;
  font-family: inherit;
  border-radius: 3px;
  color: var(--text-primary);
}

.toolbar-btn-sm:hover:not(:disabled) {
  background: var(--bg-hover);
}

.toolbar-btn-sm:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.results-scroll {
  flex: 1;
  overflow: auto;
}

.selected-row {
  background: var(--color-selected-row) !important;
}

.selected-cell {
  outline: 2px solid var(--accent);
  outline-offset: -2px;
}

.read-only-col {
  color: var(--text-primary);
  opacity: 0.75;
}

.key-badge {
  margin-right: 3px;
  font-size: 10px;
}

.cell-editor {
  width: 100%;
  border: 1px solid var(--accent);
  padding: 1px 4px;
  font-family: inherit;
  font-size: 12px;
  outline: none;
  background: var(--bg-input);
  color: var(--text-primary);
}

.result-set-wrapper {
  margin-bottom: 16px;
}

.result-set-label {
  padding: 4px 8px;
  background: var(--bg-results-tabs);
  font-size: 12px;
  color: var(--text-primary);
}
</style>
