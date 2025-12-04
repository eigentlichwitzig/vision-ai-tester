<script setup lang="ts">
/**
 * FilterPanel - Filter controls for test history
 * Provides search, pipeline, model, status, and date range filters
 */

import { ref, watch, onUnmounted } from 'vue'
import type { PipelineType, TestStatus } from '@/types/models'
import type { HistoryFilters } from '@/composables/useTestHistory'

interface Props {
  filters: HistoryFilters
  availableModels: string[]
  hasActiveFilters: boolean
}

const props = defineProps<Props>()

const emit = defineEmits<{
  (e: 'update:filters', filters: Partial<HistoryFilters>): void
  (e: 'clear'): void
}>()

// Local state for form inputs
const localSearch = ref(props.filters.search)
const localPipeline = ref<PipelineType | ''>(props.filters.pipeline)
const localModel = ref(props.filters.model)
const localStatus = ref<TestStatus | ''>(props.filters.status)
const localDateFrom = ref(props.filters.dateFrom)
const localDateTo = ref(props.filters.dateTo)

// Debounce timer for search
const searchTimeout = ref<ReturnType<typeof setTimeout> | null>(null)

// Watch for search input changes with debounce
watch(localSearch, (value) => {
  if (searchTimeout.value) {
    clearTimeout(searchTimeout.value)
  }
  searchTimeout.value = setTimeout(() => {
    emit('update:filters', { search: value })
  }, 300)
})

// Cleanup timeout on unmount to prevent memory leaks
onUnmounted(() => {
  if (searchTimeout.value) {
    clearTimeout(searchTimeout.value)
  }
})

// Immediate updates for other filters
watch(localPipeline, (value) => {
  emit('update:filters', { pipeline: value })
})

watch(localModel, (value) => {
  emit('update:filters', { model: value })
})

watch(localStatus, (value) => {
  emit('update:filters', { status: value })
})

watch(localDateFrom, (value) => {
  emit('update:filters', { dateFrom: value })
})

watch(localDateTo, (value) => {
  emit('update:filters', { dateTo: value })
})

// Sync local state when props change
watch(() => props.filters, (newFilters) => {
  localSearch.value = newFilters.search
  localPipeline.value = newFilters.pipeline
  localModel.value = newFilters.model
  localStatus.value = newFilters.status
  localDateFrom.value = newFilters.dateFrom
  localDateTo.value = newFilters.dateTo
}, { deep: true })

function clearAllFilters() {
  localSearch.value = ''
  localPipeline.value = ''
  localModel.value = ''
  localStatus.value = ''
  localDateFrom.value = ''
  localDateTo.value = ''
  emit('clear')
}

const pipelineOptions: { value: PipelineType | ''; label: string }[] = [
  { value: '', label: 'All Pipelines' },
  { value: 'direct-multimodal', label: 'Direct Multimodal' },
  { value: 'ocr-then-parse', label: 'OCR → Parse' }
]

const statusOptions: { value: TestStatus | ''; label: string }[] = [
  { value: '', label: 'All Statuses' },
  { value: 'success', label: 'Success' },
  { value: 'error', label: 'Error' },
  { value: 'cancelled', label: 'Cancelled' }
]
</script>

<template>
  <div class="filter-panel bg-white rounded-lg shadow p-4 mb-4">
    <div class="flex flex-wrap gap-4 items-end">
      <!-- Search input -->
      <div class="flex-1 min-w-[200px]">
        <label for="search" class="block text-sm font-medium text-gray-700 mb-1">
          Search by filename
        </label>
        <div class="relative">
          <i class="pi pi-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm" />
          <input
            id="search"
            v-model="localSearch"
            type="text"
            placeholder="Search files..."
            class="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm"
          />
        </div>
      </div>

      <!-- Pipeline filter -->
      <div class="w-40">
        <label for="pipeline" class="block text-sm font-medium text-gray-700 mb-1">
          Pipeline
        </label>
        <select
          id="pipeline"
          v-model="localPipeline"
          class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm bg-white"
        >
          <option 
            v-for="option in pipelineOptions" 
            :key="option.value" 
            :value="option.value"
          >
            {{ option.label }}
          </option>
        </select>
      </div>

      <!-- Model filter -->
      <div class="w-44">
        <label for="model" class="block text-sm font-medium text-gray-700 mb-1">
          Model
        </label>
        <select
          id="model"
          v-model="localModel"
          class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm bg-white"
        >
          <option value="">All Models</option>
          <option 
            v-for="model in availableModels" 
            :key="model" 
            :value="model"
          >
            {{ model }}
          </option>
        </select>
      </div>

      <!-- Status filter -->
      <div class="w-32">
        <label for="status" class="block text-sm font-medium text-gray-700 mb-1">
          Status
        </label>
        <select
          id="status"
          v-model="localStatus"
          class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm bg-white"
        >
          <option 
            v-for="option in statusOptions" 
            :key="option.value" 
            :value="option.value"
          >
            {{ option.label }}
          </option>
        </select>
      </div>

      <!-- Date range -->
      <div class="flex gap-2 items-end">
        <div class="w-36">
          <label for="dateFrom" class="block text-sm font-medium text-gray-700 mb-1">
            From
          </label>
          <input
            id="dateFrom"
            v-model="localDateFrom"
            type="date"
            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm"
          />
        </div>
        <div class="w-36">
          <label for="dateTo" class="block text-sm font-medium text-gray-700 mb-1">
            To
          </label>
          <input
            id="dateTo"
            v-model="localDateTo"
            type="date"
            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm"
          />
        </div>
      </div>

      <!-- Clear filters button -->
      <div>
        <button
          v-if="hasActiveFilters"
          @click="clearAllFilters"
          class="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors flex items-center gap-1"
        >
          <i class="pi pi-times text-xs" />
          Clear Filters
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
select {
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3E%3Cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3E%3C/svg%3E");
  background-position: right 0.5rem center;
  background-repeat: no-repeat;
  background-size: 1.5em 1.5em;
  padding-right: 2.5rem;
}
</style>
