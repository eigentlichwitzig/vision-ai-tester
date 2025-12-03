<script setup lang="ts">
/**
 * ResultsPanel.vue - Tabbed results container component
 * Combines JSON viewer, raw response viewer, and OCR text viewer
 */

import { ref, computed } from 'vue'
import JsonViewer from './JsonViewer.vue'
import RawResponseViewer from './RawResponseViewer.vue'
import OcrTextViewer from './OcrTextViewer.vue'
import ValidationErrors from './ValidationErrors.vue'
import { formatDuration, formatTimestamp, formatTokensDetailed } from '@/utils/formatters'
import type { TestRun, ValidationError } from '@/types/models'

const props = defineProps<{
  /** Test run data to display */
  testRun: TestRun | null
}>()

// Active tab state
type TabType = 'json' | 'raw' | 'ocr'
const activeTab = ref<TabType>('json')

// Computed: Check if test run has data
const hasTestRun = computed(() => props.testRun !== null)

// Computed: Check if OCR text is available
const hasOcrText = computed(() => {
  return !!props.testRun?.output?.ocrText
})

// Computed: Check if parsed JSON is available
const hasParsedData = computed(() => {
  return !!props.testRun?.output?.parsed
})

// Computed: Get parsed data
const parsedData = computed(() => {
  return props.testRun?.output?.parsed ?? null
})

// Computed: Get raw response
const rawResponse = computed(() => {
  return props.testRun?.output?.raw ?? ''
})

// Computed: Get OCR text
const ocrText = computed(() => {
  return props.testRun?.output?.ocrText ?? ''
})

// Computed: Get validation errors
const validationErrors = computed((): ValidationError[] => {
  return props.testRun?.output?.validationErrors ?? []
})

// Computed: Check if has validation errors
const hasValidationErrors = computed(() => {
  return validationErrors.value.length > 0
})

// Computed: Format duration for display
const formattedDuration = computed(() => {
  if (!props.testRun?.duration) return '-'
  return formatDuration(props.testRun.duration)
})

// Computed: Format tokens for display
const formattedTokens = computed(() => {
  const output = props.testRun?.output
  if (!output?.promptTokens || !output?.completionTokens) return null
  return formatTokensDetailed(output.promptTokens, output.completionTokens)
})

// Computed: Format timestamp for display
const formattedTimestamp = computed(() => {
  if (!props.testRun?.timestamp) return '-'
  // Handle both Date objects and serialized dates
  const timestamp = props.testRun.timestamp instanceof Date 
    ? props.testRun.timestamp 
    : new Date(props.testRun.timestamp)
  return formatTimestamp(timestamp)
})

// Switch to a tab
function switchTab(tab: TabType): void {
  activeTab.value = tab
}
</script>

<template>
  <div class="results-panel">
    <!-- Empty state -->
    <div v-if="!hasTestRun" class="empty-state">
      <i class="pi pi-chart-bar" />
      <p>No test results to display</p>
      <p class="empty-hint">Run a test to see the results here</p>
    </div>

    <!-- Results content -->
    <template v-else>
      <!-- Tab Navigation -->
      <div class="tabs">
        <button
          class="tab-button"
          :class="{ active: activeTab === 'json' }"
          @click="switchTab('json')"
        >
          <i class="pi pi-code" />
          JSON Output
          <span v-if="!hasParsedData" class="tab-badge error">N/A</span>
          <span v-else-if="hasValidationErrors" class="tab-badge warning">!</span>
        </button>
        <button
          class="tab-button"
          :class="{ active: activeTab === 'raw' }"
          @click="switchTab('raw')"
        >
          <i class="pi pi-file-o" />
          Raw Response
        </button>
        <button
          v-if="hasOcrText"
          class="tab-button"
          :class="{ active: activeTab === 'ocr' }"
          @click="switchTab('ocr')"
        >
          <i class="pi pi-eye" />
          OCR Text
        </button>
      </div>

      <!-- Tab Content -->
      <div class="tab-content">
        <!-- JSON Viewer Tab -->
        <JsonViewer
          v-show="activeTab === 'json'"
          :data="parsedData"
        />

        <!-- Raw Response Tab -->
        <RawResponseViewer
          v-show="activeTab === 'raw'"
          :content="rawResponse"
        />

        <!-- OCR Text Tab -->
        <OcrTextViewer
          v-show="activeTab === 'ocr' && hasOcrText"
          :content="ocrText"
        />
      </div>

      <!-- Validation Errors (show in JSON tab) -->
      <div v-if="activeTab === 'json' && hasValidationErrors" class="validation-section">
        <ValidationErrors :errors="validationErrors" />
      </div>

      <!-- Metadata Footer -->
      <div class="metadata">
        <div class="metadata-item">
          <i class="pi pi-clock" />
          <span>{{ formattedDuration }}</span>
        </div>
        <div v-if="formattedTokens" class="metadata-item">
          <i class="pi pi-hashtag" />
          <span>{{ formattedTokens }} tokens</span>
        </div>
        <div class="metadata-item">
          <i class="pi pi-calendar" />
          <span>{{ formattedTimestamp }}</span>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.results-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  background-color: white;
  border: 1px solid var(--gray-200, #e5e7eb);
  border-radius: 8px;
  overflow: hidden;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 4rem 2rem;
  color: var(--gray-400, #9ca3af);
}

.empty-state i {
  font-size: 3rem;
  margin-bottom: 1rem;
}

.empty-state p {
  font-size: 1rem;
  margin: 0;
}

.empty-hint {
  margin-top: 0.5rem;
  font-size: 0.875rem;
  color: var(--gray-400, #9ca3af);
}

.tabs {
  display: flex;
  gap: 0.25rem;
  padding: 0.75rem 1rem 0;
  background-color: var(--gray-50, #f9fafb);
  border-bottom: 1px solid var(--gray-200, #e5e7eb);
}

.tab-button {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.625rem 1rem;
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--gray-600, #4b5563);
  background-color: transparent;
  border: none;
  border-bottom: 2px solid transparent;
  border-radius: 6px 6px 0 0;
  cursor: pointer;
  transition: all 0.2s ease;
  margin-bottom: -1px;
}

.tab-button:hover {
  color: var(--gray-900, #111827);
  background-color: var(--gray-100, #f3f4f6);
}

.tab-button.active {
  color: var(--primary-700, #1d4ed8);
  background-color: white;
  border-bottom-color: var(--primary-600, #2563eb);
}

.tab-button i {
  font-size: 0.875rem;
}

.tab-badge {
  padding: 0.125rem 0.375rem;
  font-size: 0.625rem;
  font-weight: 600;
  border-radius: 4px;
}

.tab-badge.error {
  color: var(--gray-600, #4b5563);
  background-color: var(--gray-200, #e5e7eb);
}

.tab-badge.warning {
  color: var(--yellow-800, #854d0e);
  background-color: var(--yellow-100, #fef9c3);
}

.tab-content {
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

.tab-content > * {
  height: 100%;
  border: none;
  border-radius: 0;
}

.validation-section {
  padding: 0 1rem 1rem;
}

.metadata {
  display: flex;
  flex-wrap: wrap;
  gap: 1.5rem;
  padding: 0.75rem 1rem;
  background-color: var(--gray-50, #f9fafb);
  border-top: 1px solid var(--gray-200, #e5e7eb);
}

.metadata-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.8125rem;
  color: var(--gray-600, #4b5563);
}

.metadata-item i {
  font-size: 0.875rem;
  color: var(--gray-400, #9ca3af);
}
</style>
