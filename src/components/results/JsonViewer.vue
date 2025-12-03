<script setup lang="ts">
/**
 * JsonViewer.vue - Interactive JSON tree viewer component
 * Uses json-editor-vue for tree view with expand/collapse functionality
 */

import { computed, ref } from 'vue'
import JsonEditorVue from 'json-editor-vue'
import { useClipboard } from '@/composables/useClipboard'
import { formatJson } from '@/utils/formatters'

const props = withDefaults(defineProps<{
  /** Parsed JSON data to display */
  data: object | null
  /** Disable editing (always true for viewer) */
  readonly?: boolean
  /** Initial expansion depth (default: 2) */
  expandDepth?: number
  /** Show copy button (default: true) */
  showCopyButton?: boolean
}>(), {
  readonly: true,
  expandDepth: 2,
  showCopyButton: true
})

const { copy, copied } = useClipboard()

// JSON editor mode
const mode = ref<'tree' | 'text'>('tree')

// Computed: Check if data is available
const hasData = computed(() => props.data !== null && props.data !== undefined)

// Computed: Formatted JSON for copy
const formattedJson = computed(() => {
  if (!hasData.value) return ''
  return formatJson(props.data)
})

// Handle copy to clipboard
async function handleCopy(): Promise<void> {
  if (hasData.value) {
    await copy(formattedJson.value)
  }
}

// Toggle between tree and text mode
function toggleMode(): void {
  mode.value = mode.value === 'tree' ? 'text' : 'tree'
}
</script>

<template>
  <div class="json-viewer">
    <!-- Header -->
    <div class="viewer-header">
      <div class="header-left">
        <span class="header-title">JSON Output</span>
        <button
          class="mode-toggle"
          :class="{ active: mode === 'text' }"
          @click="toggleMode"
          :aria-label="mode === 'tree' ? 'Switch to text view' : 'Switch to tree view'"
        >
          <i class="pi" :class="mode === 'tree' ? 'pi-align-left' : 'pi-sitemap'" />
          {{ mode === 'tree' ? 'Text' : 'Tree' }}
        </button>
      </div>
      <button
        v-if="showCopyButton"
        class="copy-button"
        :class="{ copied }"
        @click="handleCopy"
        :disabled="!hasData"
        :aria-label="copied ? 'Copied!' : 'Copy to clipboard'"
      >
        <i class="pi" :class="copied ? 'pi-check' : 'pi-copy'" />
        {{ copied ? 'Copied!' : 'Copy' }}
      </button>
    </div>

    <!-- Content -->
    <div class="viewer-content">
      <div v-if="!hasData" class="empty-state">
        <i class="pi pi-inbox" />
        <p>No JSON data available</p>
      </div>
      <div 
        v-else 
        class="json-editor-wrapper"
        role="region"
        aria-label="JSON data viewer"
      >
        <JsonEditorVue
          :model-value="data"
          :mode="mode"
          :main-menu-bar="false"
          :navigation-bar="false"
          :status-bar="false"
          :read-only="readonly"
          class="json-editor"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
.json-viewer {
  display: flex;
  flex-direction: column;
  height: 100%;
  background-color: white;
  border: 1px solid var(--gray-200, #e5e7eb);
  border-radius: 8px;
  overflow: hidden;
}

.viewer-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem 1rem;
  background-color: var(--gray-50, #f9fafb);
  border-bottom: 1px solid var(--gray-200, #e5e7eb);
}

.header-left {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.header-title {
  font-weight: 600;
  color: var(--gray-700, #374151);
}

.mode-toggle {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.375rem 0.625rem;
  font-size: 0.8125rem;
  color: var(--gray-600, #4b5563);
  background-color: white;
  border: 1px solid var(--gray-300, #d1d5db);
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.mode-toggle:hover {
  background-color: var(--gray-100, #f3f4f6);
}

.mode-toggle.active {
  background-color: var(--primary-50, #eff6ff);
  border-color: var(--primary-300, #93c5fd);
  color: var(--primary-700, #1d4ed8);
}

.copy-button {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.5rem 0.75rem;
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--gray-700, #374151);
  background-color: white;
  border: 1px solid var(--gray-300, #d1d5db);
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.copy-button:hover:not(:disabled) {
  background-color: var(--gray-100, #f3f4f6);
}

.copy-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.copy-button.copied {
  color: var(--green-700, #15803d);
  background-color: var(--green-50, #f0fdf4);
  border-color: var(--green-300, #86efac);
}

.viewer-content {
  flex: 1;
  min-height: 0;
  overflow: auto;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem;
  color: var(--gray-400, #9ca3af);
}

.empty-state i {
  font-size: 2.5rem;
  margin-bottom: 0.75rem;
}

.empty-state p {
  font-size: 0.9375rem;
}

.json-editor-wrapper {
  height: 100%;
}

.json-editor {
  height: 100%;
  min-height: 200px;
}

/* Override json-editor-vue styles */
:deep(.jse-main) {
  border: none !important;
}

:deep(.jse-contents) {
  border: none !important;
}

:deep(.jse-tree-mode) {
  border: none !important;
}

:deep(.jse-text-mode) {
  border: none !important;
}
</style>
