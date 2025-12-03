<script setup lang="ts">
/**
 * RawResponseViewer.vue - Raw text/response viewer component
 * Displays raw text with optional line numbers and syntax highlighting
 */

import { computed, ref } from 'vue'
import { useClipboard } from '@/composables/useClipboard'
import { tryFormatJson } from '@/utils/formatters'

const props = withDefaults(defineProps<{
  /** Raw response text content */
  content: string
  /** Syntax highlighting language (default: 'text') */
  language?: string
  /** Show line numbers (default: true) */
  showLineNumbers?: boolean
  /** Show copy button (default: true) */
  showCopyButton?: boolean
}>(), {
  language: 'text',
  showLineNumbers: true,
  showCopyButton: true
})

const { copy, copied } = useClipboard()

// Word wrap toggle
const wordWrap = ref(true)

// Computed: Check if content is available
const hasContent = computed(() => props.content && props.content.trim().length > 0)

// Computed: Detect if content is JSON
const isJson = computed(() => {
  if (!hasContent.value) return false
  const trimmed = props.content.trim()
  return (trimmed.startsWith('{') && trimmed.endsWith('}')) || 
         (trimmed.startsWith('[') && trimmed.endsWith(']'))
})

// Computed: Format content if JSON
const displayContent = computed(() => {
  if (!hasContent.value) return ''
  if (isJson.value) {
    return tryFormatJson(props.content)
  }
  return props.content
})

// Computed: Split content into lines for line numbers
const lines = computed(() => {
  if (!hasContent.value) return []
  return displayContent.value.split('\n')
})

// Computed: Maximum line number width for padding
const lineNumberWidth = computed(() => {
  return Math.max(2, lines.value.length.toString().length)
})

// Handle copy to clipboard
async function handleCopy(): Promise<void> {
  if (hasContent.value) {
    await copy(props.content)
  }
}

// Toggle word wrap
function toggleWordWrap(): void {
  wordWrap.value = !wordWrap.value
}
</script>

<template>
  <div class="raw-viewer">
    <!-- Header -->
    <div class="viewer-header">
      <div class="header-left">
        <span class="header-title">Raw Response</span>
        <span v-if="isJson" class="format-badge">JSON</span>
        <button
          class="wrap-toggle"
          :class="{ active: wordWrap }"
          @click="toggleWordWrap"
          :aria-label="wordWrap ? 'Disable word wrap' : 'Enable word wrap'"
        >
          <i class="pi pi-align-justify" />
          Wrap
        </button>
      </div>
      <button
        v-if="showCopyButton"
        class="copy-button"
        :class="{ copied }"
        @click="handleCopy"
        :disabled="!hasContent"
        :aria-label="copied ? 'Copied!' : 'Copy to clipboard'"
      >
        <i class="pi" :class="copied ? 'pi-check' : 'pi-copy'" />
        {{ copied ? 'Copied!' : 'Copy' }}
      </button>
    </div>

    <!-- Content -->
    <div class="viewer-content" :class="{ 'word-wrap': wordWrap }">
      <div v-if="!hasContent" class="empty-state">
        <i class="pi pi-inbox" />
        <p>No response content available</p>
      </div>
      <div v-else class="code-container">
        <table class="code-table">
          <tbody>
            <tr v-for="(line, index) in lines" :key="index">
              <td 
                v-if="showLineNumbers" 
                class="line-number"
                :style="{ width: `${lineNumberWidth + 1}ch` }"
              >
                {{ index + 1 }}
              </td>
              <td class="line-content" :aria-label="line ? undefined : 'Empty line'">{{ line || '\u00A0' }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<style scoped>
.raw-viewer {
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

.format-badge {
  padding: 0.125rem 0.5rem;
  font-size: 0.6875rem;
  font-weight: 600;
  text-transform: uppercase;
  color: var(--blue-700, #1d4ed8);
  background-color: var(--blue-100, #dbeafe);
  border-radius: 4px;
}

.wrap-toggle {
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

.wrap-toggle:hover {
  background-color: var(--gray-100, #f3f4f6);
}

.wrap-toggle.active {
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
  background-color: var(--gray-900, #111827);
}

.viewer-content.word-wrap .line-content {
  white-space: pre-wrap;
  word-break: break-word;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem;
  color: var(--gray-500, #6b7280);
  background-color: white;
}

.empty-state i {
  font-size: 2.5rem;
  margin-bottom: 0.75rem;
}

.empty-state p {
  font-size: 0.9375rem;
}

.code-container {
  min-height: 100%;
  padding: 0.75rem 0;
}

.code-table {
  width: 100%;
  border-collapse: collapse;
  font-family: 'Fira Code', 'Courier New', Courier, monospace;
  font-size: 0.8125rem;
  line-height: 1.5;
}

.line-number {
  padding: 0 0.75rem;
  text-align: right;
  color: var(--gray-500, #6b7280);
  background-color: var(--gray-800, #1f2937);
  user-select: none;
  vertical-align: top;
  border-right: 1px solid var(--gray-700, #374151);
}

.line-content {
  padding: 0 1rem;
  color: var(--gray-100, #f3f4f6);
  white-space: pre;
}
</style>
