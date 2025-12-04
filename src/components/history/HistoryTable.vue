<script setup lang="ts">
/**
 * HistoryTable - Table component for displaying test run history
 * Features sortable columns, row selection, and action buttons
 */

import { computed } from 'vue'
import type { TestRun } from '@/types/models'
import type { SortConfig } from '@/composables/useTestHistory'
import StatusBadge from '@/components/base/StatusBadge.vue'
import { formatDateTime, formatDuration, formatPipelineType, truncate } from '@/utils/formatters'

interface Props {
  runs: TestRun[]
  sort: SortConfig
  selectedIds: Set<string>
  allSelected: boolean
  isLoading: boolean
}

const props = defineProps<Props>()

const emit = defineEmits<{
  (e: 'sort', field: SortConfig['field']): void
  (e: 'toggle-selection', id: string): void
  (e: 'toggle-select-all'): void
  (e: 'view', run: TestRun): void
  (e: 'delete', id: string): void
  (e: 'compare', run: TestRun): void
}>()

/**
 * Check if a run is selected
 */
function isSelected(id: string): boolean {
  return props.selectedIds.has(id)
}

/**
 * Get sort icon for a column
 */
function getSortIcon(field: SortConfig['field']): string {
  if (props.sort.field !== field) {
    return 'pi-sort-alt'
  }
  return props.sort.direction === 'asc' ? 'pi-sort-amount-up-alt' : 'pi-sort-amount-down'
}

/**
 * Format timestamp for display
 */
function formatTimestamp(date: Date): string {
  return formatDateTime(date instanceof Date ? date : new Date(date))
}

/**
 * Column definitions
 */
const columns = [
  { key: 'timestamp', label: 'Date/Time', sortable: true, width: 'w-40' },
  { key: 'fileName', label: 'File Name', sortable: false, width: 'flex-1' },
  { key: 'pipeline', label: 'Pipeline', sortable: false, width: 'w-36' },
  { key: 'modelName', label: 'Model', sortable: true, width: 'w-36' },
  { key: 'duration', label: 'Duration', sortable: true, width: 'w-24' },
  { key: 'status', label: 'Status', sortable: true, width: 'w-28' },
  { key: 'actions', label: 'Actions', sortable: false, width: 'w-32' }
]
</script>

<template>
  <div class="history-table bg-white rounded-lg shadow overflow-hidden">
    <!-- Table -->
    <div class="overflow-x-auto">
      <table class="min-w-full divide-y divide-gray-200">
        <thead class="bg-gray-50">
          <tr>
            <!-- Checkbox column -->
            <th scope="col" class="w-12 px-4 py-3">
              <input
                type="checkbox"
                :checked="allSelected && runs.length > 0"
                :indeterminate="selectedIds.size > 0 && !allSelected"
                @change="emit('toggle-select-all')"
                class="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded cursor-pointer"
                :disabled="runs.length === 0"
                aria-label="Select all"
              />
            </th>
            
            <!-- Data columns -->
            <th
              v-for="col in columns"
              :key="col.key"
              scope="col"
              :class="[
                'px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider',
                col.width,
                col.sortable ? 'cursor-pointer hover:bg-gray-100 select-none' : ''
              ]"
              @click="col.sortable ? emit('sort', col.key as SortConfig['field']) : undefined"
            >
              <div class="flex items-center gap-1">
                <span>{{ col.label }}</span>
                <i 
                  v-if="col.sortable"
                  :class="['pi text-xs', getSortIcon(col.key as SortConfig['field'])]"
                  aria-hidden="true"
                />
              </div>
            </th>
          </tr>
        </thead>
        
        <tbody class="bg-white divide-y divide-gray-200">
          <!-- Loading state -->
          <tr v-if="isLoading">
            <td :colspan="columns.length + 1" class="px-4 py-12 text-center">
              <div class="flex flex-col items-center gap-2">
                <i class="pi pi-spin pi-spinner text-3xl text-primary-500" />
                <span class="text-gray-500">Loading test runs...</span>
              </div>
            </td>
          </tr>
          
          <!-- Empty state -->
          <tr v-else-if="runs.length === 0">
            <td :colspan="columns.length + 1" class="px-4 py-12 text-center">
              <div class="flex flex-col items-center gap-2">
                <i class="pi pi-inbox text-4xl text-gray-300" />
                <span class="text-gray-500">No test runs found</span>
                <span class="text-sm text-gray-400">
                  Try adjusting your filters or run some tests first
                </span>
              </div>
            </td>
          </tr>
          
          <!-- Data rows -->
          <tr
            v-else
            v-for="run in runs"
            :key="run.id"
            :class="[
              'hover:bg-gray-50 transition-colors',
              isSelected(run.id) ? 'bg-primary-50' : ''
            ]"
          >
            <!-- Checkbox -->
            <td class="w-12 px-4 py-3">
              <input
                type="checkbox"
                :checked="isSelected(run.id)"
                @change="emit('toggle-selection', run.id)"
                class="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded cursor-pointer"
                :aria-label="`Select test run from ${formatTimestamp(run.timestamp)}`"
              />
            </td>
            
            <!-- Timestamp -->
            <td class="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
              {{ formatTimestamp(run.timestamp) }}
            </td>
            
            <!-- File name -->
            <td class="px-4 py-3 text-sm text-gray-900">
              <span :title="run.input.fileName" class="block truncate max-w-xs">
                {{ truncate(run.input.fileName, 40) }}
              </span>
            </td>
            
            <!-- Pipeline -->
            <td class="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
              {{ formatPipelineType(run.pipeline) }}
            </td>
            
            <!-- Model -->
            <td class="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
              <span :title="run.modelName" class="block truncate max-w-[120px]">
                {{ run.modelName }}
              </span>
            </td>
            
            <!-- Duration -->
            <td class="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
              {{ formatDuration(run.duration) }}
            </td>
            
            <!-- Status -->
            <td class="px-4 py-3 whitespace-nowrap">
              <StatusBadge :status="run.status" size="sm" />
            </td>
            
            <!-- Actions -->
            <td class="px-4 py-3 whitespace-nowrap">
              <div class="flex items-center gap-1">
                <button
                  @click="emit('view', run)"
                  class="p-1.5 text-gray-500 hover:text-primary-600 hover:bg-primary-50 rounded transition-colors"
                  title="View details"
                >
                  <i class="pi pi-eye text-sm" />
                </button>
                <button
                  @click="emit('compare', run)"
                  class="p-1.5 text-gray-500 hover:text-primary-600 hover:bg-primary-50 rounded transition-colors"
                  title="Compare with another run"
                >
                  <i class="pi pi-arrows-alt text-sm" />
                </button>
                <button
                  @click="emit('delete', run.id)"
                  class="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                  title="Delete"
                >
                  <i class="pi pi-trash text-sm" />
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<style scoped>
/* Custom checkbox indeterminate style */
input[type="checkbox"]:indeterminate {
  background-color: #2563eb;
  border-color: #2563eb;
  background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 16 16'%3e%3cpath stroke='white' stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M4 8h8'/%3e%3c/svg%3e");
  background-size: 100% 100%;
  background-position: center;
  background-repeat: no-repeat;
}
</style>
