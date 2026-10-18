<template>
  <div ref="editorRef" class="query-editor"></div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch } from 'vue';
import { EditorView, keymap } from '@codemirror/view';
import { EditorState } from '@codemirror/state';
import { sql } from '@codemirror/lang-sql';
import { defaultKeymap } from '@codemirror/commands';
import { oneDark } from '@codemirror/theme-one-dark';
import { useQueryTabsStore } from '../../stores/queryTabs';
import { useThemeStore } from '../../stores/theme';

const queryTabs = useQueryTabsStore();
const themeStore = useThemeStore();
const editorRef = ref(null);
let editorView = null;

function getExtensions() {
  const extensions = [
    sql(),
    EditorView.theme({
      '&': { height: '100%' },
      '.cm-scroller': { overflow: 'auto' },
      '.cm-content': { fontFamily: 'Consolas, "Courier New", monospace', fontSize: '13px' }
    }),
    keymap.of([
      ...defaultKeymap,
      { key: 'F5', run: () => { executeQuery(); return true; } },
      { key: 'Ctrl-Enter', run: () => { executeQuery(); return true; } }
    ]),
    EditorView.updateListener.of((update) => {
      if (update.docChanged && queryTabs.activeTab) {
        const content = update.state.doc.toString();
        queryTabs.updateTabSql(queryTabs.activeTabId, content);
      }
    })
  ];

  if (themeStore.theme === 'dark') {
    extensions.push(oneDark);
  }

  return extensions;
}

function executeQuery() {
  if (queryTabs.activeTab && !queryTabs.activeTab.loading) {
    queryTabs.executeQuery(queryTabs.activeTabId);
  }
}

function getExecutionPlan() {
  if (queryTabs.activeTab && !queryTabs.activeTab.loading) {
    queryTabs.getExecutionPlan(queryTabs.activeTabId);
  }
}

onMounted(() => {
  if (editorRef.value) {
    const state = EditorState.create({
      doc: queryTabs.activeTab?.sql || '',
      extensions: getExtensions()
    });

    editorView = new EditorView({
      state,
      parent: editorRef.value
    });
  }
});

watch(() => queryTabs.activeTabId, (newId) => {
  if (editorView && queryTabs.activeTab) {
    editorView.dispatch({
      changes: { from: 0, to: editorView.state.doc.length, insert: queryTabs.activeTab.sql || '' }
    });
  }
});

watch(() => themeStore.theme, () => {
  if (editorView) {
    const currentDoc = editorView.state.doc.toString();
    const pos = editorView.state.selection.main.head;
    const state = EditorState.create({
      doc: currentDoc,
      extensions: getExtensions(),
      selection: { anchor: Math.min(pos, currentDoc.length) }
    });
    editorView.setState(state);
  }
});

onUnmounted(() => {
  if (editorView) {
    editorView.destroy();
  }
});
</script>

<style scoped>
.query-editor {
  height: 100%;
  overflow: hidden;
}
</style>
