<script setup lang="ts">
/**
 * CompareView - Side-by-side test run comparison with JSON diff visualization
 * Uses jsondiffpatch for computing and displaying differences
 */

import { ref, computed, watch, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useTestStore } from '@/stores/testStore'
import { useJsonDiff } from '@/composables/useJsonDiff'
import { formatDateTime, formatDuration, formatPipelineType, formatTokenCount } from '@/utils/formatters'
import type { TestRun } from '@/types/models'
import 'jsondiffpatch/formatters/styles/html.css'

const route = useRoute()
const router = useRouter()
const testStore = useTestStore()
const { computeDiff, diffHtml, hasDifferences, clearDiff, exportDiffAsJson } = useJsonDiff()

/** Selected test run IDs */
const leftRunId = ref<string>('')
const rightRunId = ref<string>('')

/** Loaded test runs */
const leftRun = ref<TestRun | null>(null)
const rightRun = ref<TestRun | null>(null)

/** Loading state */
const isLoading = ref(false)

/** Check if both runs are selected */
const hasBothRuns = computed(() => leftRun.value !== null && rightRun.value !== null)

/**
 * Format test run for display in dropdown
 */
function formatRunOption(run: TestRun): string {
  const date = run.timestamp instanceof Date ? run.timestamp : new Date(run.timestamp)
  return `${formatDateTime(date)} - ${run.modelName} (${formatPipelineType(run.pipeline)})`
}

/**
 * Load a test run by ID
 */
async function loadRun(id: string): Promise<TestRun | null> {
  if (!id) return null
  return await testStore.loadTestRun(id) ?? null
}

/**
 * Update left run when selection changes
 */
watch(leftRunId, async (id) => {
  if (id) {
    isLoading.value = true
    leftRun.value = await loadRun(id)
    isLoading.value = false
    updateDiff()
  } else {
    leftRun.value = null
    clearDiff()
  }
})

/**
 * Update right run when selection changes
 */
watch(rightRunId, async (id) => {
  if (id) {
    isLoading.value = true
    rightRun.value = await loadRun(id)
    isLoading.value = false
    updateDiff()
  } else {
    rightRun.value = null
    clearDiff()
  }
})

/**
 * Update diff when both runs are available
 */
function updateDiff(): void {
  if (leftRun.value?.output && rightRun.value?.output) {
    const leftOutput = leftRun.value.output.parsed ?? { raw: leftRun.value.output.raw }
    const rightOutput = rightRun.value.output.parsed ?? { raw: rightRun.value.output.raw }
    computeDiff(leftOutput, rightOutput)
  }
}

/**
 * Swap left and right selections
 */
function swapSelections(): void {
  const tempId = leftRunId.value
  const tempRun = leftRun.value
  
  leftRunId.value = rightRunId.value
  leftRun.value = rightRun.value
  
  rightRunId.value = tempId
  rightRun.value = tempRun
  
  updateDiff()
}

/**
 * Clear all selections
 */
function clearSelections(): void {
  leftRunId.value = ''
  rightRunId.value = ''
  leftRun.value = null
  rightRun.value = null
  clearDiff()
}

/**
 * Export diff as JSON file
 */
function exportDiff(): void {
  const json = exportDiffAsJson()
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `diff-${leftRunId.value}-${rightRunId.value}.json`
  a.click()
  URL.revokeObjectURL(url)
}

/**
 * Get comparison value style class
 */
function getComparisonClass(leftVal: unknown, rightVal: unknown): string {
  if (leftVal === rightVal) {
    return 'text-green-700 bg-green-50'
  }
  return 'text-red-700 bg-red-50'
}

/**
 * Format value for display in metadata table
 */
function formatValue(value: unknown): string {
  if (value === null || value === undefined) return '—'
  if (value instanceof Date) return formatDateTime(value)
  if (typeof value === 'number') return value.toString()
  return String(value)
}

/**
 * Load history and initialize from route params
 */
onMounted(async () => {
  isLoading.value = true
  await testStore.loadHistory()
  
  // Check for route params
  const id1 = route.params.id1 as string
  const id2 = route.params.id2 as string
  
  if (id1) leftRunId.value = id1
  if (id2) rightRunId.value = id2
  
  isLoading.value = false
})

/** Metadata fields to compare */
interface MetadataField {
  key: string
  label: string
  format?: (value: unknown) => string
}

const metadataFields: MetadataField[] = [
  { key: 'modelName', label: 'Model' },
  { 
    key: 'pipeline', 
    label: 'Pipeline', 
    format: (v) => {
      if (v === 'ocr-then-parse' || v === 'direct-multimodal') {
        return formatPipelineType(v)
      }
      return String(v ?? '—')
    }
  },
  { 
    key: 'duration', 
    label: 'Duration', 
    format: (v) => typeof v === 'number' ? formatDuration(v) : '—'
  },
  { 
    key: 'timestamp', 
    label: 'Timestamp', 
    format: (v) => {
      if (v instanceof Date) return formatDateTime(v)
      if (typeof v === 'string') return formatDateTime(new Date(v))
      return '—'
    }
  },
  { key: 'status', label: 'Status' },
  { key: 'parameters.temperature', label: 'Temperature' },
  { 
    key: 'output.promptTokens', 
    label: 'Prompt Tokens', 
    format: (v) => typeof v === 'number' && v > 0 ? formatTokenCount(v) : '—'
  },
  { 
    key: 'output.completionTokens', 
    label: 'Completion Tokens', 
    format: (v) => typeof v === 'number' && v > 0 ? formatTokenCount(v) : '—'
  }
]

/**
 * Get nested value from object by dot-notation path
 */
function getNestedValue(obj: Record<string, unknown> | null, path: string): unknown {
  if (!obj) return undefined
  return path.split('.').reduce((acc: unknown, key: string) => {
    if (acc && typeof acc === 'object') {
      return (acc as Record<string, unknown>)[key]
    }
    return undefined
  }, obj)
}
</script>

<template>
  <div class="compare-view min-h-screen bg-gray-50">
    <!-- Header -->
    <header class="bg-white border-b border-gray-200 shadow-sm">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-3">
            <router-link to="/" class="text-gray-500 hover:text-gray-700">
              <i class="pi pi-arrow-left" />
            </router-link>
            <h1 class="text-2xl font-bold text-gray-900">Compare Test Runs</h1>
          </div>
        </div>
      </div>
    </header>

    <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <!-- Test Run Selectors -->
      <div class="compare-header bg-white rounded-lg shadow p-6 mb-6">
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          <!-- Left Selector -->
          <div class="selector-group">
            <label class="block text-sm font-medium text-gray-700 mb-2">
              Left Test Run
            </label>
            <select
              v-model="leftRunId"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              :disabled="isLoading"
            >
              <option value="">Select a test run...</option>
              <option
                v-for="run in testStore.testHistory"
                :key="run.id"
                :value="run.id"
              >
                {{ formatRunOption(run) }}
              </option>
            </select>
          </div>

          <!-- Action Buttons -->
          <div class="flex justify-center gap-2">
            <button
              @click="swapSelections"
              :disabled="!hasBothRuns"
              class="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title="Swap selections"
            >
              <i class="pi pi-arrow-right-arrow-left mr-1" />
              Swap
            </button>
            <button
              @click="clearSelections"
              :disabled="!leftRunId && !rightRunId"
              class="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title="Clear selections"
            >
              <i class="pi pi-times mr-1" />
              Clear
            </button>
            <button
              v-if="hasBothRuns && hasDifferences"
              @click="exportDiff"
              class="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors"
              title="Export diff as JSON"
            >
              <i class="pi pi-download mr-1" />
              Export
            </button>
          </div>

          <!-- Right Selector -->
          <div class="selector-group">
            <label class="block text-sm font-medium text-gray-700 mb-2">
              Right Test Run
            </label>
            <select
              v-model="rightRunId"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              :disabled="isLoading"
            >
              <option value="">Select a test run...</option>
              <option
                v-for="run in testStore.testHistory"
                :key="run.id"
                :value="run.id"
              >
                {{ formatRunOption(run) }}
              </option>
            </select>
          </div>
        </div>
      </div>

      <!-- Metadata Comparison -->
      <div v-if="hasBothRuns" class="metadata-comparison bg-white rounded-lg shadow mb-6 overflow-hidden">
        <div class="px-6 py-4 border-b border-gray-200">
          <h2 class="text-lg font-semibold text-gray-900">Metadata Comparison</h2>
        </div>
        <div class="overflow-x-auto">
          <table class="w-full">
            <thead class="bg-gray-50">
              <tr>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Field
                </th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Left
                </th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Right
                </th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-200">
              <tr v-for="field in metadataFields" :key="field.key">
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {{ field.label }}
                </td>
                <td 
                  class="px-6 py-4 whitespace-nowrap text-sm"
                  :class="getComparisonClass(
                    getNestedValue(leftRun as Record<string, unknown>, field.key),
                    getNestedValue(rightRun as Record<string, unknown>, field.key)
                  )"
                >
                  {{ field.format 
                    ? field.format(getNestedValue(leftRun as Record<string, unknown>, field.key)) 
                    : formatValue(getNestedValue(leftRun as Record<string, unknown>, field.key)) 
                  }}
                </td>
                <td 
                  class="px-6 py-4 whitespace-nowrap text-sm"
                  :class="getComparisonClass(
                    getNestedValue(leftRun as Record<string, unknown>, field.key),
                    getNestedValue(rightRun as Record<string, unknown>, field.key)
                  )"
                >
                  {{ field.format 
                    ? field.format(getNestedValue(rightRun as Record<string, unknown>, field.key)) 
                    : formatValue(getNestedValue(rightRun as Record<string, unknown>, field.key)) 
                  }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- JSON Diff Visualization -->
      <div class="diff-container bg-white rounded-lg shadow overflow-hidden">
        <div class="px-6 py-4 border-b border-gray-200">
          <h2 class="text-lg font-semibold text-gray-900">Output Comparison</h2>
        </div>
        
        <div class="p-6">
          <!-- Empty State -->
          <div v-if="!hasBothRuns" class="empty-state text-center py-12">
            <i class="pi pi-arrows-alt text-4xl text-gray-300 mb-4" />
            <p class="text-gray-500">Select two test runs to compare their outputs</p>
          </div>

          <!-- Loading State -->
          <div v-else-if="isLoading" class="loading-state text-center py-12">
            <i class="pi pi-spin pi-spinner text-4xl text-primary-500 mb-4" />
            <p class="text-gray-500">Loading test runs...</p>
          </div>

          <!-- No Differences -->
          <div v-else-if="!hasDifferences" class="no-diff text-center py-12">
            <i class="pi pi-check-circle text-4xl text-green-500 mb-4" />
            <p class="text-green-700 font-medium">✓ Outputs are identical</p>
          </div>

          <!-- Diff Output -->
          <div v-else class="diff-output" v-html="diffHtml"></div>
        </div>
      </div>
    </main>
  </div>
</template>

<style scoped>
.compare-view {
  min-height: 100vh;
}

.selector-group select {
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3E%3Cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3E%3C/svg%3E");
  background-position: right 0.5rem center;
  background-repeat: no-repeat;
  background-size: 1.5em 1.5em;
  padding-right: 2.5rem;
}

.empty-state i,
.loading-state i,
.no-diff i {
  display: block;
}

/* jsondiffpatch styling overrides */
:deep(.jsondiffpatch-delta) {
  font-family: ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Consolas, monospace;
  font-size: 0.875rem;
  line-height: 1.5;
}

:deep(.jsondiffpatch-added) {
  background-color: #dcfce7;
  border-left: 3px solid #22c55e;
  padding-left: 0.5rem;
}

:deep(.jsondiffpatch-deleted) {
  background-color: #fee2e2;
  border-left: 3px solid #ef4444;
  padding-left: 0.5rem;
}

:deep(.jsondiffpatch-modified) {
  background-color: #fef3c7;
  border-left: 3px solid #f59e0b;
  padding-left: 0.5rem;
}

:deep(.jsondiffpatch-unchanged) {
  color: #6b7280;
}

:deep(.jsondiffpatch-property-name) {
  color: #1d4ed8;
  font-weight: 500;
}

:deep(.jsondiffpatch-value) {
  margin-left: 0.25rem;
}

:deep(.jsondiffpatch-textdiff-added) {
  background-color: #bbf7d0;
}

:deep(.jsondiffpatch-textdiff-deleted) {
  background-color: #fecaca;
  text-decoration: line-through;
}
</style>
