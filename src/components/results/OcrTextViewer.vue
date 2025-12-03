<script setup lang="ts">
/**
 * OcrTextViewer.vue - OCR extracted text viewer component
 * Displays intermediate OCR text with preserved whitespace and layout
 */

import { computed } from 'vue'
import { useClipboard } from '@/composables/useClipboard'
import { formatNumber } from '@/utils/formatters'

const props = withDefaults(defineProps<{
  /** OCR extracted text content */
  content: string
  /** Show character count (default: true) */
  showCharCount?: boolean
  /** Show copy button (default: true) */
  showCopyButton?: boolean
}>(), {
  showCharCount: true,
  showCopyButton: true
})

const { copy, copied } = useClipboard()

// Computed: Check if content is available
const hasContent = computed(() => props.content && props.content.trim().length > 0)

// Computed: Character count
const charCount = computed(() => props.content?.length ?? 0)

// Computed: Formatted character count
const formattedCharCount = computed(() => {
  return formatNumber(charCount.value)
})

// Computed: Word count
const wordCount = computed(() => {
  if (!hasContent.value) return 0
  return props.content.trim().split(/\s+/).length
})

// Handle copy to clipboard
async function handleCopy(): Promise<void> {
  if (hasContent.value) {
    await copy(props.content)
  }
}
</script>

<template>
  <div class="ocr-viewer">
    <!-- Header -->
    <div class="viewer-header">
      <div class="header-left">
        <span class="header-title">OCR Text</span>
        <span v-if="showCharCount && hasContent" class="char-count">
          {{ formattedCharCount }} characters
        </span>
        <span v-if="hasContent" class="word-count">
          {{ wordCount }} words
        </span>
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
    <div class="viewer-content">
      <div v-if="!hasContent" class="empty-state">
        <i class="pi pi-file-o" />
        <p>No OCR text available</p>
        <p class="empty-hint">OCR text is only available for OCR → Parse pipeline runs</p>
      </div>
      <div v-else class="text-content">
        <pre v-text="content"></pre>
      </div>
    </div>
  </div>
</template>

<style scoped>
.ocr-viewer {
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

.char-count,
.word-count {
  padding: 0.125rem 0.5rem;
  font-size: 0.75rem;
  color: var(--gray-600, #4b5563);
  background-color: var(--gray-100, #f3f4f6);
  border-radius: 4px;
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

.empty-hint {
  margin-top: 0.25rem;
  font-size: 0.8125rem;
  color: var(--gray-400, #9ca3af);
}

.text-content {
  padding: 1rem;
}

.text-content pre {
  margin: 0;
  font-family: 'Fira Code', 'Courier New', Courier, monospace;
  font-size: 0.875rem;
  line-height: 1.6;
  color: var(--gray-800, #1f2937);
  white-space: pre-wrap;
  word-break: break-word;
}
</style>
