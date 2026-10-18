<template>
  <div class="object-explorer" @click="closeContextMenu">
    <div v-if="connection.connected">
      <ObjectExplorerNode
        ref="serverNode"
        :label="connection.server"
        icon="server"
        :level="0"
        expandable
        :nodeData="{ type: 'server' }"
        @contextmenu="handleContextMenu"
      >
        <template #children>
          <ObjectExplorerNode
            v-for="db in explorer.databases"
            :key="db.name"
            :ref="el => setDbNodeRef(el, db.name)"
            :label="db.name"
            icon="database"
            :level="1"
            expandable
            :nodeData="{ type: 'database', db: db.name }"
            @dblclick="selectDatabase(db.name)"
            @contextmenu="handleContextMenu"
          >
            <template #children>
              <ObjectExplorerNode
                label="Tables"
                icon="folder"
                :level="2"
                expandable
                :lazy="() => explorer.loadTables(db.name)"
                :nodeData="{ type: 'folder', db: db.name, folder: 'tables' }"
                @contextmenu="handleContextMenu"
              >
                <template #children>
                  <ObjectExplorerNode
                    v-for="table in (explorer.treeData[`${db.name}/tables`] || [])"
                    :key="`${table.schema}.${table.name}`"
                    :label="`${table.schema}.${table.name}`"
                    icon="table"
                    :level="3"
                    expandable
                    :nodeData="{ type: 'table', db: db.name, schema: table.schema, table: table.name }"
                    @contextmenu="handleContextMenu"
                  >
                    <template #children>
                      <ObjectExplorerNode
                        label="Columns"
                        icon="folder"
                        :level="4"
                        expandable
                        :lazy="() => explorer.loadColumns(db.name, table.schema, table.name)"
                        :nodeData="{ type: 'folder', db: db.name }"
                        @contextmenu="handleContextMenu"
                      >
                        <template #children>
                          <ObjectExplorerNode
                            v-for="col in (explorer.treeData[`${db.name}/${table.schema}/${table.name}/columns`] || [])"
                            :key="col.name"
                            :label="col.name"
                            :icon="col.isPrimaryKey ? 'key' : 'column'"
                            :level="5"
                            :suffix="col.dataType"
                            :nodeData="{ type: 'column', db: db.name }"
                            @contextmenu="handleContextMenu"
                          />
                        </template>
                      </ObjectExplorerNode>
                      <ObjectExplorerNode
                        label="Indexes"
                        icon="folder"
                        :level="4"
                        expandable
                        :lazy="() => explorer.loadIndexes(db.name, table.schema, table.name)"
                        :nodeData="{ type: 'folder', db: db.name }"
                        @contextmenu="handleContextMenu"
                      >
                        <template #children>
                          <ObjectExplorerNode
                            v-for="idx in (explorer.treeData[`${db.name}/${table.schema}/${table.name}/indexes`] || [])"
                            :key="idx.name"
                            :label="idx.name"
                            icon="index"
                            :level="5"
                            :suffix="idx.type"
                            :nodeData="{ type: 'index', db: db.name }"
                            @contextmenu="handleContextMenu"
                          />
                        </template>
                      </ObjectExplorerNode>
                    </template>
                  </ObjectExplorerNode>
                </template>
              </ObjectExplorerNode>
              <ObjectExplorerNode
                label="Views"
                icon="folder"
                :level="2"
                expandable
                :lazy="() => explorer.loadViews(db.name)"
                :nodeData="{ type: 'folder', db: db.name, folder: 'views' }"
                @contextmenu="handleContextMenu"
              >
                <template #children>
                  <ObjectExplorerNode
                    v-for="view in (explorer.treeData[`${db.name}/views`] || [])"
                    :key="`${view.schema}.${view.name}`"
                    :label="`${view.schema}.${view.name}`"
                    icon="view"
                    :level="3"
                    :nodeData="{ type: 'view', db: db.name, schema: view.schema, table: view.name }"
                    @contextmenu="handleContextMenu"
                  />
                </template>
              </ObjectExplorerNode>
              <ObjectExplorerNode
                label="Programmability"
                icon="folder"
                :level="2"
                expandable
                :nodeData="{ type: 'folder', db: db.name }"
                @contextmenu="handleContextMenu"
              >
                <template #children>
                  <ObjectExplorerNode
                    label="Stored Procedures"
                    icon="folder"
                    :level="3"
                    expandable
                    :lazy="() => explorer.loadProcedures(db.name)"
                    :nodeData="{ type: 'folder', db: db.name }"
                    @contextmenu="handleContextMenu"
                  >
                    <template #children>
                      <ObjectExplorerNode
                        v-for="proc in (explorer.treeData[`${db.name}/procedures`] || [])"
                        :key="`${proc.schema}.${proc.name}`"
                        :label="`${proc.schema}.${proc.name}`"
                        icon="procedure"
                        :level="4"
                        :nodeData="{ type: 'procedure', db: db.name, schema: proc.schema, table: proc.name }"
                        @contextmenu="handleContextMenu"
                      />
                    </template>
                  </ObjectExplorerNode>
                  <ObjectExplorerNode
                    label="Functions"
                    icon="folder"
                    :level="3"
                    expandable
                    :lazy="() => explorer.loadFunctions(db.name)"
                    :nodeData="{ type: 'folder', db: db.name }"
                    @contextmenu="handleContextMenu"
                  >
                    <template #children>
                      <ObjectExplorerNode
                        v-for="fn in (explorer.treeData[`${db.name}/functions`] || [])"
                        :key="`${fn.schema}.${fn.name}`"
                        :label="`${fn.schema}.${fn.name}`"
                        icon="function"
                        :level="4"
                        :suffix="fn.type"
                        :nodeData="{ type: 'function', db: db.name, schema: fn.schema, table: fn.name }"
                        @contextmenu="handleContextMenu"
                      />
                    </template>
                  </ObjectExplorerNode>
                </template>
              </ObjectExplorerNode>
            </template>
          </ObjectExplorerNode>
        </template>
      </ObjectExplorerNode>
    </div>
    <div v-else class="loading">Not connected</div>

    <ContextMenu
      :visible="contextMenu.visible"
      :x="contextMenu.x"
      :y="contextMenu.y"
      :items="contextMenuItems"
      @select="handleContextAction"
      @close="closeContextMenu"
    />

    <CreateDatabaseDialog
      :visible="createDbDialog.visible"
      @confirm="handleCreateDatabase"
      @cancel="createDbDialog.visible = false"
    />
  </div>
</template>

<script setup>
import { ref, reactive, watch, nextTick } from 'vue';
import { useConnectionStore } from '../../stores/connection';
import { useExplorerStore } from '../../stores/explorer';
import { useQueryTabsStore } from '../../stores/queryTabs';
import { api } from '../../api/client';
import ObjectExplorerNode from './ObjectExplorerNode.vue';
import ContextMenu from '../common/ContextMenu.vue';
import CreateDatabaseDialog from '../common/CreateDatabaseDialog.vue';

const connection = useConnectionStore();
const explorer = useExplorerStore();
const queryTabs = useQueryTabsStore();

const serverNode = ref(null);
const dbNodeRefs = {};

const contextMenu = reactive({
  visible: false,
  x: 0,
  y: 0,
  nodeType: null,
  db: null,
  schema: null,
  table: null,
  label: null
});

const contextMenuItems = ref([]);

const createDbDialog = reactive({ visible: false });

function setDbNodeRef(el, dbName) {
  if (el) {
    dbNodeRefs[dbName] = el;
  }
}

function selectDatabase(db) {
  connection.setDatabase(db);
}

function handleContextMenu({ event, label, icon, nodeData }) {
  event.stopPropagation();

  contextMenu.x = event.clientX;
  contextMenu.y = event.clientY;
  contextMenu.nodeType = nodeData.type;
  contextMenu.db = nodeData.db || null;
  contextMenu.schema = nodeData.schema || null;
  contextMenu.table = nodeData.table || null;
  contextMenu.label = label;

  contextMenuItems.value = buildMenuItems(nodeData.type, label, nodeData);
  contextMenu.visible = true;
}

function buildMenuItems(type, label, data) {
  const fullName = data.schema ? `${data.schema}.${data.table}` : null;

  switch (type) {
    case 'table':
      return [
        { label: 'Select Top 1000 Rows', icon: '&#9654;', action: 'selectTop1000', data: { ...data, top: 1000 } },
        { label: 'Edit Top 200 Rows', icon: '&#9998;', action: 'editTop200', data: { ...data, top: 200 } },
        { separator: true },
        { label: 'Script as INSERT', icon: '&#128196;', action: 'scriptCreate', data },
        { label: 'Script as UPDATE', icon: '&#128196;', action: 'scriptUpdate', data },
        { label: 'Script as DELETE', icon: '&#128196;', action: 'scriptDelete', data },
        { label: 'Script as SELECT', icon: '&#128196;', action: 'scriptSelect', data },
        { separator: true },
        { label: 'Copy Name', icon: '&#128203;', action: 'copyName', data: { copyText: fullName } }
      ];

    case 'view':
      return [
        { label: 'Select Top 1000 Rows', icon: '&#9654;', action: 'selectTop1000', data: { ...data, top: 1000 } },
        { separator: true },
        { label: 'Script as CREATE', icon: '&#128196;', action: 'scriptCreate', data },
        { label: 'Script as SELECT', icon: '&#128196;', action: 'scriptSelect', data },
        { separator: true },
        { label: 'Copy Name', icon: '&#128203;', action: 'copyName', data: { copyText: fullName } }
      ];

    case 'procedure':
      return [
        { label: 'Script as CREATE', icon: '&#128196;', action: 'scriptCreate', data },
        { separator: true },
        { label: 'Copy Name', icon: '&#128203;', action: 'copyName', data: { copyText: fullName } }
      ];

    case 'function':
      return [
        { label: 'Script as CREATE', icon: '&#128196;', action: 'scriptCreate', data },
        { separator: true },
        { label: 'Copy Name', icon: '&#128203;', action: 'copyName', data: { copyText: fullName } }
      ];

    case 'database':
      return [
        { label: 'New Query', icon: '&#128196;', action: 'newQuery', data },
        { separator: true },
        { label: 'Copy Name', icon: '&#128203;', action: 'copyName', data: { copyText: data.db } }
      ];

    case 'server':
      return [
        { label: 'New Database', icon: '&#128451;', action: 'createDatabase' },
        { separator: true },
        { label: 'Copy Name', icon: '&#128203;', action: 'copyName', data: { copyText: label } }
      ];

    default:
      return [
        { label: 'Copy Name', icon: '&#128203;', action: 'copyName', data: { copyText: label } }
      ];
  }
}

async function buildSelectScript(db, schema, table, top) {
  const from = `FROM [${db}].[${schema}].[${table}]`;
  let columns = null;

  try {
    const data = await api.getColumns(db, schema, table);
    columns = data.columns?.map(c => c.name) || [];
  } catch {
    columns = null;
  }

  const select = top ? `SELECT TOP (${top}) ` : 'SELECT ';

  if (!columns || columns.length === 0) {
    return `${select}*\n  ${from}`;
  }

  const first = `[${columns[0]}]`;
  const rest = columns.slice(1).map(c => `\n      ,[${c}]`).join('');
  return `${select}${first}${rest}\n  ${from}`;
}

async function buildInsertScript(db, schema, table) {
  const target = `[${db}].[${schema}].[${table}]`;
  try {
    const data = await api.getColumns(db, schema, table);
    const columns = (data.columns || []).map(c => c.name);
    if (!columns.length) {
      throw new Error('Table has no columns');
    }
    const columnList = columns.map(c => `[${c}]`).join(', ');
    const placeholders = columns.map(c => `<${c}>`).join(', ');
    return `INSERT INTO ${target}\n    (${columnList})\nVALUES\n    (${placeholders});`;
  } catch (err) {
    return `-- Failed to generate INSERT script for ${target}\n-- ${err.message}`;
  }
}

async function buildUpdateScript(db, schema, table) {
  const target = `[${db}].[${schema}].[${table}]`;
  try {
    const data = await api.getColumns(db, schema, table);
    const columns = data.columns || [];
    if (!columns.length) {
      throw new Error('Table has no columns');
    }
    let setCols = columns.filter(c => !c.isPrimaryKey && !c.identity);
    if (!setCols.length) setCols = columns.filter(c => !c.identity);
    if (!setCols.length) setCols = columns;
    const keyCols = columns.filter(c => c.isPrimaryKey).map(c => c.name);
    const whereCols = keyCols.length ? keyCols : columns.map(c => c.name);
    const setLines = setCols
      .map((c, i) => `${i === 0 ? 'SET ' : '    '}[${c.name}] = <${c.name}>`)
      .join(',\n');
    const where = whereCols.map(c => `[${c}] = <${c}>`).join(' AND ');
    return `UPDATE ${target}\n${setLines}\nWHERE ${where};`;
  } catch (err) {
    return `-- Failed to generate UPDATE script for ${target}\n-- ${err.message}`;
  }
}

async function buildDeleteScript(db, schema, table) {
  const target = `[${db}].[${schema}].[${table}]`;
  try {
    const data = await api.getColumns(db, schema, table);
    const columns = data.columns || [];
    if (!columns.length) {
      throw new Error('Table has no columns');
    }
    const keyCols = columns.filter(c => c.isPrimaryKey).map(c => c.name);
    const whereCols = keyCols.length ? keyCols : columns.map(c => c.name);
    const where = whereCols.map(c => `[${c}] = <${c}>`).join(' AND ');
    return `DELETE FROM ${target}\nWHERE ${where};`;
  } catch (err) {
    return `-- Failed to generate DELETE script for ${target}\n-- ${err.message}`;
  }
}

async function buildModuleScript(db, schema, name) {
  const target = `[${db}].[${schema}].[${name}]`;
  try {
    const data = await api.getObjectDefinition(db, schema, name);
    return data.definition;
  } catch (err) {
    return `-- Failed to retrieve definition for ${target}\n-- ${err.message}`;
  }
}

async function handleContextAction(item) {
  const { action, data } = item;

  switch (action) {
    case 'selectTop1000': {
      const sql = await buildSelectScript(data.db, data.schema, data.table, data.top);
      const tab = queryTabs.createTab(data.db, sql);
      queryTabs.executeQuery(tab.id);
      break;
    }
    case 'editTop200': {
      const sql = await buildSelectScript(data.db, data.schema, data.table, data.top);
      const tab = queryTabs.createTab(data.db, sql);
      queryTabs.executeQuery(tab.id);
      break;
    }
    case 'scriptCreate': {
      if (data.type === 'table') {
        const sql = await buildInsertScript(data.db, data.schema, data.table);
        queryTabs.createTab(data.db, sql);
      } else {
        const sql = await buildModuleScript(data.db, data.schema, data.table);
        queryTabs.createTab(data.db, sql);
      }
      break;
    }
    case 'scriptUpdate': {
      const sql = await buildUpdateScript(data.db, data.schema, data.table);
      queryTabs.createTab(data.db, sql);
      break;
    }
    case 'scriptDelete': {
      const sql = await buildDeleteScript(data.db, data.schema, data.table);
      queryTabs.createTab(data.db, sql);
      break;
    }
    case 'scriptSelect': {
      const sql = await buildSelectScript(data.db, data.schema, data.table, null);
      queryTabs.createTab(data.db, sql);
      break;
    }
    case 'newQuery': {
      queryTabs.createTab(data.db);
      break;
    }
    case 'copyName': {
      navigator.clipboard.writeText(data.copyText);
      break;
    }
    case 'createDatabase': {
      createDbDialog.visible = true;
      break;
    }
  }

  closeContextMenu();
}

function closeContextMenu() {
  contextMenu.visible = false;
}

async function handleCreateDatabase(name) {
  try {
    await explorer.createDatabase(name);
    createDbDialog.visible = false;
  } catch (err) {
    alert('Failed to create database: ' + err.message);
  }
}

watch(() => explorer.databases, async (databases) => {
  if (databases.length > 0) {
    await nextTick();
    if (serverNode.value) {
      serverNode.value.expand();
    }
  }
});
</script>
